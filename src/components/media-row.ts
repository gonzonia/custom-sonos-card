import { css, html, LitElement, nothing, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import Store from '../model/store';
import { MediaPlayerItem } from '../types';
import { mediaItemTitleStyle } from '../constants';
import { renderFavoritesItem } from '../utils/media-browse-utils';
import './playing-bars';

class MediaRow extends LitElement {
  @property({ attribute: false }) store!: Store;
  @property({ attribute: false }) item!: MediaPlayerItem;
  @property({ type: Boolean }) selected = false;
  @property({ type: Boolean }) playing = false;
  @property({ type: Boolean }) searchHighlight = false;
  @property({ type: Boolean }) showCheckbox = false;
  @property({ type: Boolean }) checked = false;

  render() {
    const { itemBackgroundColor, itemTextColor, selectedItemBackgroundColor, selectedItemTextColor } =
      this.store?.config?.queue ?? {};
    const bgColor = this.selected ? selectedItemBackgroundColor : itemBackgroundColor;
    const textColor = this.selected ? selectedItemTextColor : itemTextColor;
    const cssVars =
      (bgColor ? `--secondary-background-color: ${bgColor};` : '') +
      (textColor ? `--secondary-text-color: ${textColor};` : '');
    return html`
      <mwc-list-item
        hasMeta
        ?selected=${this.selected}
        ?activated=${this.selected}
        class="button ${this.searchHighlight ? 'search-highlight' : ''}"
        style="${cssVars}"
      >
        <div class="row">
          ${this.showCheckbox
            ? html`<ha-checkbox
                .checked=${this.checked}
                @change=${this.onCheckboxChange}
                @click=${(e: Event) => e.stopPropagation()}
              ></ha-checkbox>`
            : nothing}
          ${renderFavoritesItem(this.item)}
        </div>
        <div class="meta-content" slot="meta">
          <sonos-playing-bars .show=${this.playing}></sonos-playing-bars>
          <slot></slot>
        </div>
      </mwc-list-item>
    `;
  }

  private onCheckboxChange(e: Event) {
    const checkbox = e.target as HTMLInputElement;
    this.dispatchEvent(
      new CustomEvent('checkbox-change', {
        detail: { checked: checkbox.checked },
        bubbles: true,
        composed: true,
      }),
    );
  }

  protected async firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    await this.scrollToSelected(_changedProperties);
  }

  protected async updated(_changedProperties: PropertyValues) {
    super.updated(_changedProperties);
    await this.scrollToSelected(_changedProperties);
  }

  private async scrollToSelected(changedProperties: PropertyValues) {
    await new Promise((r) => setTimeout(r, 0));
    const selectedChanged = changedProperties.has('selected') && this.selected;
    const highlightChanged = changedProperties.has('searchHighlight') && this.searchHighlight;
    if (selectedChanged || highlightChanged) {
      this.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  static get styles() {
    return [
      css`
        .mdc-deprecated-list-item__text {
          width: 100%;
        }
        .button {
          margin: 0.3rem;
          border-radius: 0.3rem;
          background: var(--secondary-background-color);
          --icon-width: 35px;
          height: 40px;
        }

        .button.search-highlight {
          outline: 2px solid var(--accent-color, #03a9f4);
          outline-offset: -2px;
        }

        .row {
          display: flex;
          flex: 1;
          align-items: center;
        }

        ha-checkbox {
          --mdc-checkbox-unchecked-color: var(--secondary-text-color);
          flex-shrink: 0;
        }

        .thumbnail {
          width: var(--icon-width);
          height: var(--icon-width);
          background-size: contain;
          background-repeat: no-repeat;
          background-position: left;
        }

        .title {
          font-size: calc(var(--sonos-font-size, 1rem) * 1.1);
          align-self: center;
          flex: 1;
        }

        .meta-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-left: 0.5rem;
        }
      `,
      mediaItemTitleStyle,
    ];
  }
}

customElements.define('sonos-media-row', MediaRow);
