import { css } from 'lit';

export const queueStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .queue-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    outline: none;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    position: relative;
  }
  .header-icons {
    white-space: nowrap;
  }
  .header-icons > * {
    display: inline-block;
  }
  .title {
    text-align: center;
    font-size: calc(var(--sonos-font-size, 1rem) * 1.2);
    font-weight: bold;
    padding: 0.5rem;
  }
  .list {
    overflow: auto;
    --mdc-icon-button-size: 1.5em;
    --mdc-icon-size: 1em;
  }
  ha-icon-button[selected] {
    color: var(--accent-color);
  }
  .loading {
    display: flex;
    justify-content: center;
    padding: 2rem;
  }
  .delete-all-btn {
    display: inline-flex;
    position: relative;
    cursor: pointer;
  }
  .delete-all-btn .all-label {
    position: absolute;
    bottom: -16px;
    left: 63%;
    font-size: 2em;
    font-weight: bold;
    color: var(--secondary-text-color);
    pointer-events: none;
    -webkit-text-stroke: 0.5px black;
    text-shadow: 0 0 2px black;
  }
`;
