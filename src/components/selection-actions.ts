import { css, html, LitElement, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { mdiAnimationPlay, mdiPlaylistPlus, mdiSelectInverse, mdiSkipNext } from '@mdi/js';
import { customEvent } from '../utils/utils';

export class SelectionActions extends LitElement {
  @property({ type: Boolean }) hasSelection = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) showInvert = true;

  render() {
    return html`
      ${this.showInvert
        ? html`<ha-icon-button
            .path=${mdiSelectInverse}
            @click=${this.invertSelection}
            title="Invert selection"
          ></ha-icon-button>`
        : nothing}
      ${this.hasSelection
        ? html`
            <ha-icon-button
              .path=${mdiAnimationPlay}
              @click=${this.playSelected}
              title="Play selected"
              ?disabled=${this.disabled}
            ></ha-icon-button>
            <ha-icon-button
              .path=${mdiSkipNext}
              @click=${this.queueSelected}
              title="Queue selected after current"
              ?disabled=${this.disabled}
            ></ha-icon-button>
            <ha-icon-button
              .path=${mdiPlaylistPlus}
              @click=${this.queueSelectedAtEnd}
              title="Add selected to end of queue"
              ?disabled=${this.disabled}
            ></ha-icon-button>
          `
        : nothing}
    `;
  }

  private invertSelection() {
    this.dispatchEvent(customEvent('invert-selection'));
  }

  private playSelected() {
    this.dispatchEvent(customEvent('play-selected'));
  }

  private queueSelected() {
    this.dispatchEvent(customEvent('queue-selected'));
  }

  private queueSelectedAtEnd() {
    this.dispatchEvent(customEvent('queue-selected-at-end'));
  }

  static styles = css`
    :host {
      display: contents;
    }
  `;
}

customElements.define('sonos-selection-actions', SelectionActions);
