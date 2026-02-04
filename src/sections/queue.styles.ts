import { css } from 'lit';
import { sectionCommonStyles } from './section-common.styles';

export const queueStyles = [
  sectionCommonStyles,
  css`
    /* Queue uses section-container class name */
    .queue-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      outline: none;
      position: relative;
    }
    .list.search-active {
      padding-top: 3rem;
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
  `,
];
