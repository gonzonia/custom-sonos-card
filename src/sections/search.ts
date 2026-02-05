import { html, LitElement, nothing, PropertyValues } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import Store from '../model/store';
import { listStyle, MEDIA_ITEM_SELECTED } from '../constants';
import { customEvent } from '../utils/utils';
import { clearSelection, invertSelection, updateSelection } from '../utils/selection-utils';
import { queueItemsAfterCurrent, queueItemsAtEnd } from '../utils/batch-operation-utils';
import { mdiAccount, mdiAlbum, mdiClose, mdiMagnify, mdiMusic, mdiPlaylistMusic } from '@mdi/js';
import '../components/media-row';
import '../components/operation-overlay';
import '../components/selection-actions';
import { MediaPlayerItem, OperationProgress, SearchMediaType, SearchResultItem } from '../types';
import { MusicAssistantService } from '../services/music-assistant-service';
import { searchStyles } from './search.styles';

const LOCAL_STORAGE_KEY = 'sonos-search-state';

interface SearchState {
  mediaType: SearchMediaType | null;
  searchText: string;
}

export class Search extends LitElement {
  @property() store!: Store;
  @state() private mediaType: SearchMediaType | null = null;
  @state() private searchText = '';
  @state() private results: SearchResultItem[] = [];
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private selectedIndices = new Set<number>();
  @state() private operationProgress: OperationProgress | null = null;
  @state() private massConfigEntryId: string | null = null;
  @state() private discoveryComplete = false;
  @state() private cancelOperation = false;

  @query('input') private input?: HTMLInputElement;

  private musicAssistantService?: MusicAssistantService;
  private initialized = false;
  private debounceTimer?: ReturnType<typeof setTimeout>;

  private get searchTitle(): string {
    return this.store.config.search?.title ?? 'Search';
  }

  private get searchLimit(): number {
    return this.store.config.search?.searchLimit ?? 50;
  }

  private get autoSearchMinChars(): number {
    return this.store.config.search?.autoSearchMinChars ?? 3;
  }

  private get autoSearchDebounceMs(): number {
    return this.store.config.search?.autoSearchDebounceMs ?? 1000;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.restoreState();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has('store') && !this.initialized) {
      this.initialized = true;
      this.musicAssistantService = new MusicAssistantService(this.store.hass);
      this.discoverConfigEntry();
      // Apply default media type if no saved state
      if (this.mediaType === null && this.store.config.search?.defaultMediaType) {
        this.mediaType = this.store.config.search.defaultMediaType;
      }
    }
  }

  private async discoverConfigEntry() {
    // First check if config has an explicit massConfigEntryId
    const configuredId = this.store.config.search?.massConfigEntryId;
    if (configuredId) {
      this.massConfigEntryId = configuredId;
      this.discoveryComplete = true;
      this.runPendingSearch();
      return;
    }

    // Try to auto-discover
    if (this.musicAssistantService) {
      this.massConfigEntryId = await this.musicAssistantService.discoverConfigEntryId();
      this.discoveryComplete = true;
      this.runPendingSearch();
    }
  }

  private runPendingSearch() {
    // Re-run search if we have saved state
    if (this.mediaType && this.searchText && this.massConfigEntryId) {
      this.performSearch();
    }
  }

  private restoreState() {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const state: SearchState = JSON.parse(saved);
        this.mediaType = state.mediaType;
        this.searchText = state.searchText ?? '';
      }
    } catch {
      // Ignore parse errors
    }
  }

  private saveState() {
    const state: SearchState = {
      mediaType: this.mediaType,
      searchText: this.searchText,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }

  render() {
    if (!this.discoveryComplete) {
      return html`
        <div class="search-container">
          <div class="loading"><ha-spinner></ha-spinner></div>
        </div>
      `;
    }

    if (!this.massConfigEntryId) {
      return this.renderConfigRequired();
    }

    return html`
      <div class="search-container" @keydown=${this.onKeyDown} tabindex="-1">
        <sonos-operation-overlay
          .progress=${this.operationProgress}
          .hass=${this.store.hass}
          @cancel-operation=${this.cancelCurrentOperation}
        ></sonos-operation-overlay>
        ${this.renderHeader()} ${this.mediaType ? this.renderSearchBar() : nothing} ${this.renderContent()}
      </div>
    `;
  }

  private renderConfigRequired() {
    return html`
      <div class="search-container">
        <div class="config-required">
          <ha-icon icon="mdi:music-box-multiple-outline"></ha-icon>
          <div class="title">Music Assistant Required</div>
          <div>
            To use search, please install and configure the Music Assistant integration, or configure the
            <code>config_entry_id</code> in the card settings.
          </div>
        </div>
      </div>
    `;
  }

  private renderHeader() {
    const hasSelection = this.selectedIndices.size > 0;
    return html`
      <div class="header">
        <div class="title-container">
          <span class="title">${this.searchTitle}</span>
        </div>
        <div class="header-icons">
          <div class="media-type-icons">
            <ha-icon-button
              .path=${mdiMusic}
              @click=${() => this.toggleMediaType('track')}
              ?selected=${this.mediaType === 'track'}
              title="Search Tracks"
            ></ha-icon-button>
            <ha-icon-button
              .path=${mdiAccount}
              @click=${() => this.toggleMediaType('artist')}
              ?selected=${this.mediaType === 'artist'}
              title="Search Artists"
            ></ha-icon-button>
            <ha-icon-button
              .path=${mdiAlbum}
              @click=${() => this.toggleMediaType('album')}
              ?selected=${this.mediaType === 'album'}
              title="Search Albums"
            ></ha-icon-button>
            <ha-icon-button
              .path=${mdiPlaylistMusic}
              @click=${() => this.toggleMediaType('playlist')}
              ?selected=${this.mediaType === 'playlist'}
              title="Search Playlists"
            ></ha-icon-button>
          </div>
          <sonos-selection-actions
            .hasSelection=${hasSelection}
            .disabled=${this.operationProgress !== null}
            .showInvert=${hasSelection}
            @invert-selection=${this.handleInvertSelection}
            @play-selected=${this.playSelected}
            @queue-selected=${this.queueSelectedAfterCurrent}
            @queue-selected-at-end=${this.queueSelectedAtEnd}
          ></sonos-selection-actions>
        </div>
      </div>
    `;
  }

  private renderSearchBar() {
    return html`
      <div class="search-bar">
        <ha-icon-button .path=${mdiMagnify} @click=${this.performSearch}></ha-icon-button>
        <input
          type="text"
          placeholder="Search ${this.mediaType}s..."
          .value=${this.searchText}
          @input=${this.onSearchInput}
          @keydown=${this.onSearchKeyDown}
        />
        ${this.searchText
          ? html`<ha-icon-button .path=${mdiClose} @click=${this.clearSearch} title="Clear"></ha-icon-button>`
          : nothing}
      </div>
    `;
  }

  private renderContent() {
    if (this.loading) {
      return html`<div class="list">
        <div class="loading"><ha-spinner></ha-spinner></div>
      </div>`;
    }

    if (this.error) {
      return html`<div class="list"><div class="error-message">${this.error}</div></div>`;
    }

    if (!this.mediaType) {
      return html`
        <div class="list">
          <div class="no-results">Select a media type to search</div>
        </div>
      `;
    }

    if (this.results.length === 0 && this.searchText) {
      return html`
        <div class="list">
          <div class="no-results">No results found</div>
        </div>
      `;
    }

    if (this.results.length === 0) {
      return html`
        <div class="list">
          <div class="no-results">Enter a search term</div>
        </div>
      `;
    }

    return html`
      <div class="list">
        <mwc-list multi>
          ${this.results.map((item, index) => {
            const isChecked = this.selectedIndices.has(index);
            const mediaPlayerItem = this.toMediaPlayerItem(item);
            return html`
              <sonos-media-row
                @click=${() => this.onItemClick(index)}
                .item=${mediaPlayerItem}
                .showCheckbox=${true}
                .checked=${isChecked}
                @checkbox-change=${(e: CustomEvent) => this.onCheckboxChange(index, e.detail.checked)}
                .store=${this.store}
              ></sonos-media-row>
            `;
          })}
        </mwc-list>
      </div>
    `;
  }

  private toMediaPlayerItem(item: SearchResultItem): MediaPlayerItem {
    return {
      title: item.subtitle ? `${item.title} ${item.subtitle}` : item.title,
      media_content_id: item.uri,
      media_content_type: item.mediaType,
    };
  }

  private toggleMediaType(type: SearchMediaType) {
    if (this.mediaType === type) {
      this.mediaType = null;
      this.results = [];
    } else {
      this.mediaType = type;
      // Re-run search if we have text
      if (this.searchText) {
        this.performSearch();
      }
    }
    this.saveState();
    this.focusInput();
  }

  private focusInput() {
    this.updateComplete.then(() => {
      this.input?.focus();
    });
  }

  private onSearchInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.searchText = input.value;
    this.saveState();
    this.scheduleAutoSearch();
  }

  private scheduleAutoSearch() {
    // Clear any pending search
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Only auto-search if we have enough characters
    if (this.searchText.trim().length >= this.autoSearchMinChars && this.mediaType) {
      this.debounceTimer = setTimeout(() => {
        this.performSearch();
      }, this.autoSearchDebounceMs);
    }
  }

  private onSearchKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.performSearch();
    }
  }

  private async performSearch() {
    if (!this.mediaType || !this.searchText.trim() || !this.massConfigEntryId || !this.musicAssistantService) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.selectedIndices = new Set(); // Clear selection on new search

    try {
      this.results = await this.musicAssistantService.searchWithRetry(
        this.massConfigEntryId,
        this.searchText.trim(),
        this.mediaType,
        this.searchLimit,
      );
    } catch (e) {
      this.error = `Search failed: ${e instanceof Error ? e.message : 'Unknown error'}`;
      this.results = [];
    } finally {
      this.loading = false;
    }
  }

  private clearSearch() {
    this.searchText = '';
    this.results = [];
    this.error = null;
    this.selectedIndices = new Set();
    this.saveState();
    this.focusInput();
  }

  private async onItemClick(index: number) {
    // Clicking on the row (outside checkbox) plays the item
    const item = this.results[index];
    if (!item) {
      return;
    }

    const mediaPlayerItem = this.toMediaPlayerItem(item);
    await this.store.mediaControlService.playMedia(this.store.activePlayer, mediaPlayerItem, 'play');
    this.dispatchEvent(customEvent(MEDIA_ITEM_SELECTED));
  }

  private onCheckboxChange(index: number, checked: boolean) {
    this.selectedIndices = updateSelection(this.selectedIndices, index, checked);
  }

  private handleInvertSelection() {
    this.selectedIndices = invertSelection(this.selectedIndices, this.results.length);
  }

  private getSelectedItems(): MediaPlayerItem[] {
    return Array.from(this.selectedIndices)
      .sort((a, b) => a - b)
      .map((i) => this.toMediaPlayerItem(this.results[i]));
  }

  private async runBatchOperation(
    operation: (onProgress: (completed: number) => void, shouldCancel: () => boolean) => Promise<void>,
  ) {
    this.cancelOperation = false;
    try {
      await operation(
        (completed) => {
          this.operationProgress = { ...this.operationProgress!, current: completed };
        },
        () => this.cancelOperation,
      );
      if (!this.cancelOperation) {
        this.selectedIndices = clearSelection();
        this.dispatchEvent(customEvent(MEDIA_ITEM_SELECTED));
      }
    } finally {
      this.operationProgress = null;
      this.cancelOperation = false;
    }
  }

  private async playSelected() {
    const items = this.getSelectedItems();
    if (items.length === 0) {
      return;
    }

    this.operationProgress = { current: 0, total: items.length, label: 'Loading' };

    await this.runBatchOperation((onProgress, shouldCancel) =>
      this.store.mediaControlService.queueAndPlay(this.store.activePlayer, items, 'play', onProgress, shouldCancel),
    );
  }

  private async queueSelectedAfterCurrent() {
    const items = this.getSelectedItems();
    if (items.length === 0) {
      return;
    }

    this.operationProgress = { current: 0, total: items.length, label: 'Queueing' };

    await this.runBatchOperation((onProgress, shouldCancel) =>
      queueItemsAfterCurrent(
        items,
        (item) => this.store.mediaControlService.playMedia(this.store.activePlayer, item, 'next'),
        onProgress,
        shouldCancel,
      ),
    );
  }

  private async queueSelectedAtEnd() {
    const items = this.getSelectedItems();
    if (items.length === 0) {
      return;
    }

    this.operationProgress = { current: 0, total: items.length, label: 'Queueing' };

    await this.runBatchOperation((onProgress, shouldCancel) =>
      queueItemsAtEnd(
        items,
        (item) => this.store.mediaControlService.playMedia(this.store.activePlayer, item, 'add'),
        onProgress,
        shouldCancel,
      ),
    );
  }

  private cancelCurrentOperation() {
    this.cancelOperation = true;
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.selectedIndices = clearSelection();
    }
  }

  static get styles() {
    return [listStyle, ...searchStyles];
  }
}

customElements.define('sonos-search', Search);
