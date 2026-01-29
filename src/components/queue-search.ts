import { html, LitElement, nothing, PropertyValues } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { mdiMagnify, mdiChevronUp, mdiChevronDown, mdiClose } from '@mdi/js';
import { QueueSearchMatch } from '../types/queue-search';
import { queueSearchStyles } from './queue-search.styles';

export class QueueSearch extends LitElement {
  @property({ attribute: false }) items: { title: string }[] = [];
  @state() private expanded = false;
  @state() private searchText = '';
  @state() private matchIndices: number[] = [];
  @state() private currentMatchIndex = 0;
  @state() private lastHighlightedIndex = -1;
  @query('input') private input?: HTMLInputElement;

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has('items') && this.searchText) {
      this.findMatches(false);
    }
  }

  render() {
    const hasNoMatch = this.searchText.length > 0 && this.matchIndices.length === 0;
    return html`
      <ha-icon-button .path=${mdiMagnify} @click=${this.toggleSearch}></ha-icon-button>
      ${this.expanded ? this.renderSearchBar(hasNoMatch) : nothing}
    `;
  }

  private renderSearchBar(hasNoMatch: boolean) {
    return html`
      <div class="search-bar">
        <input
          type="text"
          placeholder="Search queue..."
          class=${hasNoMatch ? 'no-match' : ''}
          .value=${this.searchText}
          @input=${this.onSearchInput}
          @keydown=${this.onKeyDown}
        />
        ${this.matchIndices.length > 0 ? this.renderMatchInfo() : nothing}
        <ha-icon-button .path=${mdiClose} @click=${this.clearSearch}></ha-icon-button>
      </div>
    `;
  }

  private renderMatchInfo() {
    return html`
      <span class="match-info">${this.currentMatchIndex + 1}/${this.matchIndices.length}</span>
      <ha-icon-button .path=${mdiChevronUp} @click=${this.previousMatch}></ha-icon-button>
      <ha-icon-button .path=${mdiChevronDown} @click=${this.nextMatch}></ha-icon-button>
    `;
  }

  private toggleSearch() {
    this.expanded = !this.expanded;
    if (this.expanded) {
      this.updateComplete.then(() => this.input?.focus());
    } else {
      this.clearSearch();
    }
  }

  private onSearchInput(e: Event) {
    const newText = (e.target as HTMLInputElement).value;
    const wasExtendingSearch = newText.startsWith(this.searchText) && this.searchText.length > 0;
    this.searchText = newText;
    this.findMatches(wasExtendingSearch);
  }

  private findMatches(continueFromCurrent: boolean) {
    if (!this.searchText) {
      this.matchIndices = [];
      this.lastHighlightedIndex = -1;
      this.dispatchMatchEvent(-1);
      return;
    }

    const searchLower = this.searchText.toLowerCase();
    this.matchIndices = this.items
      .map((item, i) => (item.title?.toLowerCase().includes(searchLower) ? i : -1))
      .filter((i) => i !== -1);

    if (this.matchIndices.length === 0) {
      this.lastHighlightedIndex = -1;
      this.dispatchMatchEvent(-1);
      return;
    }

    if (continueFromCurrent && this.lastHighlightedIndex >= 0) {
      const nextMatchAfterLast = this.matchIndices.find((i) => i >= this.lastHighlightedIndex);
      this.currentMatchIndex = nextMatchAfterLast !== undefined ? this.matchIndices.indexOf(nextMatchAfterLast) : 0;
    } else {
      this.currentMatchIndex = 0;
    }

    this.highlightCurrentMatch();
  }

  private highlightCurrentMatch() {
    if (this.matchIndices.length === 0) {
      return;
    }
    const matchIndex = this.matchIndices[this.currentMatchIndex];
    this.lastHighlightedIndex = matchIndex;
    this.dispatchMatchEvent(matchIndex);
  }

  private dispatchMatchEvent(index: number) {
    this.dispatchEvent(
      new CustomEvent<QueueSearchMatch>('queue-search-match', {
        detail: {
          index,
          currentMatch: this.currentMatchIndex + 1,
          totalMatches: this.matchIndices.length,
        },
      }),
    );
  }

  private nextMatch() {
    if (this.matchIndices.length === 0) {
      return;
    }
    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matchIndices.length;
    this.highlightCurrentMatch();
  }

  private previousMatch() {
    if (this.matchIndices.length === 0) {
      return;
    }
    this.currentMatchIndex = (this.currentMatchIndex - 1 + this.matchIndices.length) % this.matchIndices.length;
    this.highlightCurrentMatch();
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.nextMatch();
    } else if (e.key === 'Escape') {
      this.clearSearch();
    }
  }

  private clearSearch() {
    this.searchText = '';
    this.matchIndices = [];
    this.currentMatchIndex = 0;
    this.lastHighlightedIndex = -1;
    this.expanded = false;
    this.dispatchMatchEvent(-1);
  }

  static get styles() {
    return queueSearchStyles;
  }
}

customElements.define('sonos-queue-search', QueueSearch);
