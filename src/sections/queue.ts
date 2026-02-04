import { html, LitElement, nothing, PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import Store from '../model/store';
import { MediaPlayer } from '../model/media-player';
import { listStyle, MEDIA_ITEM_SELECTED } from '../constants';
import { customEvent } from '../utils/utils';
import { updateSelection, invertSelection, clearSelection } from '../utils/selection-utils';
import { mdiCloseBoxMultipleOutline, mdiPlaylistEdit, mdiTrashCanOutline } from '@mdi/js';
import '../components/media-row';
import '../components/queue-search';
import '../components/selection-actions';
import '../components/operation-overlay';
import { QueueSearchMatch, MediaPlayerItem, OperationProgress } from '../types';
import { queueStyles } from './queue.styles';

export class Queue extends LitElement {
  @property() store!: Store;
  @state() activePlayer!: MediaPlayer;
  @state() selectMode = false;
  @state() private searchExpanded = false;
  @state() private searchHighlightIndex = -1;
  @state() private searchMatchIndices: number[] = [];
  @state() private showOnlyMatches = false;
  @state() private shownIndices: number[] = [];
  @state() private selectedIndices = new Set<number>();
  @state() private queueItems: MediaPlayerItem[] = [];
  @state() private loading = true;
  @state() private operationProgress: OperationProgress | null = null;
  @state() private cancelOperation = false;
  private lastQueueHash = '';

  private get queueTitle(): string {
    if (this.store.config.queue?.title) {
      return this.store.config.queue.title;
    }
    const playlist = this.activePlayer.attributes.media_playlist ?? 'Play Queue';
    return this.activePlayer.attributes.media_channel ? `${playlist} (not active)` : playlist;
  }

  private async scrollToCurrentlyPlaying() {
    // Wait for LitElement to complete render, then scroll to the selected (currently playing) row
    await this.updateComplete;
    await new Promise((r) => requestAnimationFrame(r));
    const queuePosition = this.activePlayer.attributes.queue_position;
    if (!queuePosition) {
      return;
    }
    const currentIndex = queuePosition - 1;
    const rows = this.shadowRoot?.querySelectorAll('sonos-media-row');
    const selectedRow = rows?.[currentIndex];
    selectedRow?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

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
        <sonos-operation-overlay
          .progress=${this.operationProgress}
          .hass=${this.store.hass}
          @cancel-operation=${this.cancelCurrentOperation}
        ></sonos-operation-overlay>
        ${this.renderQueue(selected)}
      </div>
    `;
  }

  private renderQueue(selected: number) {
    const hasSelection = this.selectedIndices.size > 0;
    // If showOnlyMatches is enabled, filter queueItems and map indices
    const displayItems = this.showOnlyMatches ? this.shownIndices.map((i) => this.queueItems[i]) : this.queueItems;
    const indexMap = this.showOnlyMatches ? this.shownIndices : null;
    const itemCount = this.queueItems.length;
    return html`
      <div class="header">
        <div class="title-container">
          <span class="title">${this.queueTitle}</span>
          ${itemCount > 0 ? html`<span class="item-count">(${itemCount} items)</span>` : ''}
        </div>
        <div class="header-icons">
          <sonos-queue-search
            .items=${this.queueItems}
            .selectMode=${this.selectMode}
            @queue-search-match=${this.onSearchMatch}
            @queue-search-select-all=${this.onSelectAllMatches}
            @queue-search-expanded=${this.onSearchExpanded}
            @queue-search-show-only-matches=${this.onShowOnlyMatches}
          ></sonos-queue-search>
          ${this.selectMode
            ? html`
                <sonos-selection-actions
                  .hasSelection=${hasSelection}
                  .disabled=${this.operationProgress !== null}
                  @invert-selection=${this.handleInvertSelection}
                  @play-selected=${this.playSelected}
                  @queue-selected=${this.queueSelectedAfterCurrent}
                ></sonos-selection-actions>
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
            .path=${mdiPlaylistEdit}
            @click=${this.toggleSelectMode}
            ?selected=${this.selectMode}
            title="Select mode"
            ?disabled=${this.operationProgress !== null}
          ></ha-icon-button>
        </div>
      </div>
      <div class="list ${this.searchExpanded ? 'search-active' : ''}">
        ${this.loading
          ? html`<div class="loading"><ha-spinner></ha-spinner></div>`
          : html`<mwc-list multi>
              ${displayItems.map((item, index) => {
                // Map index to real index in queueItems if filtering
                const realIndex = indexMap ? indexMap[index] : index;
                const isSelected = selected >= 0 && realIndex === selected;
                const isPlaying = isSelected && this.activePlayer.isPlaying();
                const isSearchHighlight = this.searchHighlightIndex === realIndex;
                const isChecked = this.selectedIndices.has(realIndex);
                const isNextUp = selected >= 0 && realIndex === selected + 1;
                return html`
                  <sonos-media-row
                    @click=${() => this.onMediaItemClick(index)}
                    .item=${item}
                    .selected=${isSelected}
                    .playing=${isPlaying}
                    .searchHighlight=${isSearchHighlight}
                    .showCheckbox=${this.selectMode}
                    .showQueueButton=${!this.selectMode}
                    .queueButtonDisabled=${isSelected || isNextUp}
                    .checked=${isChecked}
                    @checkbox-change=${(e: CustomEvent) => this.onCheckboxChange(realIndex, e.detail.checked)}
                    @queue-item=${() => this.queueAfterCurrent(realIndex)}
                    .store=${this.store}
                  ></sonos-media-row>
                `;
              })}
            </mwc-list>`}
      </div>
    `;
  }

  private async queueAfterCurrent(index: number) {
    const item = this.queueItems[index];
    if (!item?.media_content_id) {
      return;
    }

    const queuePosition = this.activePlayer.attributes.queue_position;
    const currentIndex = queuePosition ? queuePosition - 1 : -1;

    this.operationProgress = { current: 0, total: 1, label: 'Moving' };
    this.cancelOperation = false;

    try {
      await this.store.mediaControlService.moveQueueItemAfterCurrent(this.activePlayer, item, index, currentIndex);
      if (this.cancelOperation) {
        return;
      }
      await this.fetchQueue();
      await this.scrollToCurrentlyPlaying();
    } finally {
      this.operationProgress = null;
      this.cancelOperation = false;
    }
  }

  private async queueSelectedAfterCurrent() {
    const queuePosition = this.activePlayer.attributes.queue_position;
    const currentIndex = queuePosition ? queuePosition - 1 : -1;

    const selectedIndices = Array.from(this.selectedIndices)
      .filter((i) => i !== currentIndex)
      .sort((a, b) => a - b);

    if (selectedIndices.length === 0) {
      return;
    }

    const total = selectedIndices.length;
    this.operationProgress = { current: 0, total, label: 'Moving' };
    this.cancelOperation = false;

    try {
      await this.store.mediaControlService.moveQueueItemsAfterCurrent(
        this.activePlayer,
        this.queueItems,
        selectedIndices,
        currentIndex,
        (completed) => {
          this.operationProgress = { current: completed, total, label: 'Moving' };
        },
        () => this.cancelOperation,
      );
      if (this.cancelOperation) {
        return;
      }
      this.exitSelectMode();
      await this.fetchQueue();
      await this.scrollToCurrentlyPlaying();
    } finally {
      this.operationProgress = null;
      this.cancelOperation = false;
    }
  }

  private async playSelected() {
    const selectedIndices = Array.from(this.selectedIndices).sort((a, b) => a - b);
    if (selectedIndices.length === 0) {
      return;
    }

    const items = selectedIndices.map((i) => this.queueItems[i]).filter((item) => item?.media_content_id);
    if (items.length === 0) {
      return;
    }

    const total = items.length;
    this.operationProgress = { current: 0, total, label: 'Loading' };
    this.cancelOperation = false;

    try {
      await this.store.mediaControlService.replaceQueueAndPlay(
        this.activePlayer,
        items,
        (completed) => {
          this.operationProgress = { current: completed, total, label: 'Loading' };
        },
        () => this.cancelOperation,
      );
      if (this.cancelOperation) {
        return;
      }
      this.exitSelectMode();
      await this.fetchQueue();
      await this.scrollToCurrentlyPlaying();
    } finally {
      this.operationProgress = null;
      this.cancelOperation = false;
    }
  }

  private onSearchMatch(e: CustomEvent<QueueSearchMatch>) {
    this.searchHighlightIndex = e.detail.index;
    this.searchMatchIndices = e.detail.matchIndices ?? [];
  }

  private onShowOnlyMatches(e: CustomEvent<{ showOnlyMatches: boolean; shownIndices: number[] }>) {
    this.showOnlyMatches = e.detail.showOnlyMatches;
    this.shownIndices = e.detail.shownIndices;
  }

  private onSearchExpanded(e: CustomEvent<{ expanded: boolean }>) {
    this.searchExpanded = e.detail.expanded;
  }

  private onSelectAllMatches() {
    this.selectedIndices = new Set([...this.selectedIndices, ...this.searchMatchIndices]);
  }

  private handleInvertSelection() {
    this.selectedIndices = invertSelection(this.selectedIndices, this.queueItems.length);
  }

  private onMediaItemClick = async (index: number) => {
    let realIndex = index;
    if (this.showOnlyMatches && this.shownIndices.length > 0) {
      realIndex = this.shownIndices[index];
    }
    if (!this.selectMode) {
      await this.store.hassService.playQueue(this.activePlayer, realIndex);
      this.dispatchEvent(customEvent(MEDIA_ITEM_SELECTED));
    }
  };

  private onCheckboxChange(index: number, checked: boolean) {
    this.selectedIndices = updateSelection(this.selectedIndices, index, checked);
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.selectMode) {
      this.exitSelectMode();
    }
  }

  private toggleSelectMode() {
    if (this.selectMode) {
      this.exitSelectMode();
    } else {
      this.selectMode = true;
      this.selectedIndices = clearSelection();
    }
  }

  private exitSelectMode() {
    this.selectMode = false;
    this.selectedIndices = clearSelection();
  }

  private cancelCurrentOperation() {
    this.cancelOperation = true;
  }

  private async clearQueue() {
    await this.store.hassService.clearQueue(this.activePlayer);
    this.exitSelectMode();
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

    this.operationProgress = { current: 0, total, label: 'Deleting' };
    this.cancelOperation = false;

    try {
      let deleted = 0;
      let remaining = [...indices];

      while (remaining.length > 0 && !this.cancelOperation) {
        // Find contiguous chunks and delete first half of each in parallel
        const batch = this.getParallelBatch(remaining);

        const results = await Promise.allSettled(
          batch.map((index) => this.store.hassService.removeFromQueue(this.activePlayer, index)),
        );

        // Track which specific indices succeeded
        const succeededIndices = batch.filter((_, i) => results[i].status === 'fulfilled');
        deleted += succeededIndices.length;
        this.operationProgress = { current: deleted, total, label: 'Deleting' };

        // If all failed, break to avoid infinite loop
        if (succeededIndices.length === 0) {
          console.error('All deletions in batch failed, aborting');
          break;
        }

        // Recalculate remaining indices based on which ones actually succeeded
        remaining = this.recalculateIndices(remaining, succeededIndices);
      }
    } finally {
      this.operationProgress = null;
      this.cancelOperation = false;
      this.exitSelectMode();
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
    return [listStyle, ...queueStyles];
  }
}
