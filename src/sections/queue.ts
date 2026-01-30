import { html, LitElement, nothing, PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import Store from '../model/store';
import { MediaPlayer } from '../model/media-player';
import { listStyle, MEDIA_ITEM_SELECTED } from '../constants';
import { customEvent } from '../utils/utils';
import { mdiCloseBoxMultipleOutline, mdiPlaylistRemove, mdiSelectInverse, mdiTrashCanOutline } from '@mdi/js';
import '../components/media-row';
import '../components/queue-search';
import { QueueSearchMatch } from '../types/queue-search';
import { MediaPlayerItem } from '../types';
import { queueStyles } from './queue.styles';

export class Queue extends LitElement {
  @property() store!: Store;
  @state() activePlayer!: MediaPlayer;
  @state() deleteMode = false;
  @state() private searchExpanded = false;
  @state() private searchHighlightIndex = -1;
  @state() private searchMatchIndices: number[] = [];
  @state() private selectedIndices = new Set<number>();
  @state() private queueItems: MediaPlayerItem[] = [];
  @state() private loading = true;
  @state() private deletingProgress: { current: number; total: number } | null = null;
  @state() private cancelDelete = false;
  private lastQueueHash = '';

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has('store')) {
      this.fetchQueue();
    }
  }

  private async fetchQueue() {
    try {
      const queue = await this.store.hassService.getQueue(this.store.activePlayer);
      const queueHash = queue.map((item) => item.title).join('|');
      if (queueHash !== this.lastQueueHash) {
        this.lastQueueHash = queueHash;
        this.queueItems = queue;
      }
    } catch (e) {
      // Keep cached queue on error
      console.warn('Error getting queue', e);
    }
    if (this.loading) {
      this.loading = false;
    }
  }

  render() {
    this.activePlayer = this.store.activePlayer;
    const queuePosition = this.activePlayer.attributes.queue_position;
    const selected = queuePosition ? queuePosition - 1 : -1;
    return html`
      <div class="queue-container" @keydown=${this.onKeyDown} tabindex="-1">
        ${this.deletingProgress
          ? html`<div class="delete-overlay">
              <div class="delete-overlay-content">
                <ha-spinner></ha-spinner>
                <div class="delete-progress-text">
                  Deleting ${this.deletingProgress.current} of ${this.deletingProgress.total}
                </div>
                <ha-control-button-group>
                  <ha-control-button class="accent" @click=${this.cancelDeleteOperation}>
                    ${this.store.hass.localize('ui.common.cancel') || 'Cancel'}
                  </ha-control-button>
                </ha-control-button-group>
              </div>
            </div>`
          : nothing}
        ${this.renderQueue(selected)}
      </div>
    `;
  }

  private renderQueue(selected: number) {
    const hasSelection = this.selectedIndices.size > 0;
    return html`
      <div class="header">
        <div class="title">
          ${this.store.config.queue?.title ??
          (this.activePlayer.attributes.media_playlist ?? `Play Queue`) +
            (this.activePlayer.attributes.media_channel ? ' (not active)' : '')}
        </div>
        <div class="header-icons">
          <sonos-queue-search
            .items=${this.queueItems}
            .deleteMode=${this.deleteMode}
            @queue-search-match=${this.onSearchMatch}
            @queue-search-select-all=${this.onSelectAllMatches}
            @queue-search-expanded=${this.onSearchExpanded}
          ></sonos-queue-search>
          ${this.deleteMode
            ? html`
                <ha-icon-button
                  .path=${mdiSelectInverse}
                  @click=${this.invertSelection}
                  title="Invert selection"
                ></ha-icon-button>
                ${hasSelection
                  ? html`<ha-icon-button
                      .path=${mdiCloseBoxMultipleOutline}
                      @click=${this.deleteSelected}
                      title="Delete selected"
                    ></ha-icon-button>`
                  : nothing}
                <div class="delete-all-btn" @click=${this.clearQueue} title="Delete all">
                  <ha-icon-button .path=${mdiTrashCanOutline}></ha-icon-button>
                  <span class="all-label">*</span>
                </div>
              `
            : html`
                <sonos-shuffle .store=${this.store}></sonos-shuffle>
                <sonos-repeat .store=${this.store}></sonos-repeat>
              `}
          <ha-icon-button
            .path=${mdiPlaylistRemove}
            @click=${this.toggleDeleteMode}
            ?selected=${this.deleteMode}
            title="Delete mode"
            ?disabled=${this.deletingProgress !== null}
          ></ha-icon-button>
        </div>
      </div>
      <div class="list ${this.searchExpanded ? 'search-active' : ''}">
        ${this.loading
          ? html`<div class="loading"><ha-spinner></ha-spinner></div>`
          : html`<mwc-list multi>
              ${this.queueItems.map((item, index) => {
                const isSelected = selected >= 0 && selected === index;
                const isPlaying = isSelected && this.activePlayer.isPlaying();
                const isSearchHighlight = this.searchHighlightIndex === index;
                const isChecked = this.selectedIndices.has(index);
                return html`
                  <sonos-media-row
                    @click=${() => this.onMediaItemClick(index)}
                    .item=${item}
                    .selected=${isSelected}
                    .playing=${isPlaying}
                    .searchHighlight=${isSearchHighlight}
                    .showCheckbox=${this.deleteMode}
                    .checked=${isChecked}
                    @checkbox-change=${(e: CustomEvent) => this.onCheckboxChange(index, e.detail.checked)}
                    .store=${this.store}
                  ></sonos-media-row>
                `;
              })}
            </mwc-list>`}
      </div>
    `;
  }

  private onSearchMatch(e: CustomEvent<QueueSearchMatch>) {
    this.searchHighlightIndex = e.detail.index;
    this.searchMatchIndices = e.detail.matchIndices ?? [];
  }

  private onSearchExpanded(e: CustomEvent<{ expanded: boolean }>) {
    this.searchExpanded = e.detail.expanded;
  }

  private onSelectAllMatches() {
    this.selectedIndices = new Set([...this.selectedIndices, ...this.searchMatchIndices]);
  }

  private invertSelection() {
    const newSelection = new Set<number>();
    for (let i = 0; i < this.queueItems.length; i++) {
      if (!this.selectedIndices.has(i)) {
        newSelection.add(i);
      }
    }
    this.selectedIndices = newSelection;
  }

  private onMediaItemClick = async (index: number) => {
    if (!this.deleteMode) {
      await this.store.hassService.playQueue(this.activePlayer, index);
      this.dispatchEvent(customEvent(MEDIA_ITEM_SELECTED));
    }
  };

  private onCheckboxChange(index: number, checked: boolean) {
    if (checked) {
      this.selectedIndices.add(index);
    } else {
      this.selectedIndices.delete(index);
    }
    this.selectedIndices = new Set(this.selectedIndices); // Trigger reactivity
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.deleteMode) {
      this.exitDeleteMode();
    }
  }

  private toggleDeleteMode() {
    if (this.deleteMode) {
      this.exitDeleteMode();
    } else {
      this.deleteMode = true;
      this.selectedIndices = new Set();
    }
  }

  private exitDeleteMode() {
    this.deleteMode = false;
    this.selectedIndices = new Set();
  }

  private cancelDeleteOperation() {
    this.cancelDelete = true;
  }

  private async clearQueue() {
    await this.store.hassService.clearQueue(this.activePlayer);
    this.exitDeleteMode();
    await this.fetchQueue();
  }

  private async deleteSelected() {
    // If all items are selected, use clear queue (much faster)
    if (this.selectedIndices.size === this.queueItems.length) {
      await this.clearQueue();
      return;
    }

    const indices = [...this.selectedIndices].sort((a, b) => a - b); // Sort ascending
    const total = indices.length;

    this.deletingProgress = { current: 0, total };
    this.cancelDelete = false;

    try {
      let deleted = 0;
      let remaining = [...indices];

      while (remaining.length > 0 && !this.cancelDelete) {
        // Find contiguous chunks and delete first half of each in parallel
        const batch = this.getParallelBatch(remaining);

        const results = await Promise.allSettled(
          batch.map((index) => this.store.hassService.removeFromQueue(this.activePlayer, index)),
        );

        // Track which specific indices succeeded
        const succeededIndices = batch.filter((_, i) => results[i].status === 'fulfilled');
        deleted += succeededIndices.length;
        this.deletingProgress = { current: deleted, total };

        // If all failed, break to avoid infinite loop
        if (succeededIndices.length === 0) {
          console.error('All deletions in batch failed, aborting');
          break;
        }

        // Recalculate remaining indices based on which ones actually succeeded
        remaining = this.recalculateIndices(remaining, succeededIndices);
      }
    } finally {
      this.deletingProgress = null;
      this.cancelDelete = false;
      this.exitDeleteMode();
      await this.fetchQueue();
    }
  }

  private getParallelBatch(sortedIndices: number[]): number[] {
    // Smaller batches = more frequent progress updates
    const MAX_PARALLEL = 50;

    // Find first contiguous chunk
    const chunk: number[] = [sortedIndices[0]];
    for (let i = 1; i < sortedIndices.length; i++) {
      if (sortedIndices[i] === sortedIndices[i - 1] + 1) {
        chunk.push(sortedIndices[i]);
      } else {
        break;
      }
    }
    // Return first half of the chunk (at least 1, max MAX_PARALLEL)
    const halfSize = Math.min(MAX_PARALLEL, Math.max(1, Math.floor(chunk.length / 2)));
    return chunk.slice(0, halfSize);
  }

  private recalculateIndices(remaining: number[], deleted: number[]): number[] {
    const deletedSet = new Set(deleted);
    const maxDeleted = Math.max(...deleted);
    const deleteCount = deleted.length;

    return remaining.filter((i) => !deletedSet.has(i)).map((i) => (i > maxDeleted ? i - deleteCount : i));
  }

  static get styles() {
    return [listStyle, queueStyles];
  }
}
