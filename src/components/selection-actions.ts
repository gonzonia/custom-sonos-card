import { css, html, LitElement, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { mdiAnimationPlay, mdiHumanQueue, mdiSelectInverse } from '@mdi/js';

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
              .path=${mdiHumanQueue}
              @click=${this.queueSelected}
              title="Queue selected after current"
              ?disabled=${this.disabled}
            ></ha-icon-button>
          `
        : nothing}
    `;
  }

  private invertSelection() {
    this.dispatchEvent(new CustomEvent('invert-selection', { bubbles: true, composed: true }));
  }

  private playSelected() {
    this.dispatchEvent(new CustomEvent('play-selected', { bubbles: true, composed: true }));
  }

  private queueSelected() {
    this.dispatchEvent(new CustomEvent('queue-selected', { bubbles: true, composed: true }));
  }

  static styles = css`
    :host {
      display: contents;
    }
  `;
}

customElements.define('sonos-selection-actions', SelectionActions);
