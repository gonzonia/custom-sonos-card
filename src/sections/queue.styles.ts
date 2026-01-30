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
    position: relative;
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
    position: relative;
    flex: 1;
    --mdc-icon-button-size: 1.5em;
    --mdc-icon-size: 1em;
  }
  .list.search-active {
    padding-top: 3rem;
  }
  ha-icon-button[selected] {
    color: var(--accent-color);
  }
  .loading {
    display: flex;
    justify-content: center;
    padding: 2rem;
  }
  .delete-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }
  .delete-overlay-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
    text-align: center;
  }
  .delete-progress-text {
    font-size: 1.2rem;
    color: var(--primary-text-color, #fff);
  }
  .accent {
    --control-button-background-color: var(--accent-color);
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
