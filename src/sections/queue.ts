import { html, LitElement, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import Store from '../model/store';
import { MediaPlayer } from '../model/media-player';
import { listStyle, MEDIA_ITEM_SELECTED } from '../constants';
import { customEvent } from '../utils/utils';
import { mdiCloseBoxMultipleOutline, mdiTrashCanOutline } from '@mdi/js';
import '../components/media-row';
import '../components/queue-search';
import { until } from 'lit-html/directives/until.js';
import { QueueSearchMatch } from '../types/queue-search';
import { MediaPlayerItem } from '../types';
import { queueStyles } from './queue.styles';

export class Queue extends LitElement {
  @property() store!: Store;
  @state() activePlayer!: MediaPlayer;
  @state() deleteMode = false;
  @state() private searchHighlightIndex = -1;
  @state() private selectedIndices = new Set<number>();
  @state() private queueItems: MediaPlayerItem[] = [];

  render() {
    this.activePlayer = this.store.activePlayer;
    const selected = this.activePlayer.attributes.queue_position - 1;
    return html`
      <div class="queue-container" @keydown=${this.onKeyDown} tabindex="-1">${this.renderQueue(selected)}</div>
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
          <sonos-queue-search .items=${this.queueItems} @queue-search-match=${this.onSearchMatch}></sonos-queue-search>
          ${this.deleteMode
            ? html`
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
            .path=${mdiTrashCanOutline}
            @click=${this.toggleDeleteMode}
            ?selected=${this.deleteMode}
            title="Delete mode"
          ></ha-icon-button>
        </div>
      </div>
      <div class="list">
        <mwc-list multi>
          ${until(
            this.store.hassService.getQueue(this.store.activePlayer).then((queue) => {
              // Only update if items changed to prevent infinite re-render loop
              if (
                this.queueItems.length !== queue.length ||
                this.queueItems.some((item, i) => item.title !== queue[i]?.title)
              ) {
                this.queueItems = queue;
              }
              return queue.map((item, index) => {
                const isSelected = selected !== undefined && selected === index;
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
              });
            }),
            html`<div class="loading"><ha-spinner></ha-spinner></div>`,
          )}
        </mwc-list>
      </div>
    `;
  }

  private onSearchMatch(e: CustomEvent<QueueSearchMatch>) {
    this.searchHighlightIndex = e.detail.index;
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

  private async clearQueue() {
    await this.store.hassService.clearQueue(this.activePlayer);
    this.exitDeleteMode();
    this.requestUpdate();
  }

  private async deleteSelected() {
    // Sort indices in descending order to delete from end first (so indices stay valid)
    const indices = [...this.selectedIndices].sort((a, b) => b - a);
    for (const index of indices) {
      await this.store.hassService.removeFromQueue(this.activePlayer, index);
    }
    this.exitDeleteMode();
    this.requestUpdate();
  }

  static get styles() {
    return [listStyle, queueStyles];
  }
}
