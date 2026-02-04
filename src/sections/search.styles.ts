import { css } from 'lit';
import { sectionCommonStyles } from './section-common.styles';

export const searchStyles = [
  sectionCommonStyles,
  css`
    /* Search uses section-container class name */
    .search-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      outline: none;
      position: relative;
    }
    .media-type-icons {
      display: flex;
      gap: 0;
    }
    .media-type-icons ha-icon-button[selected] {
      color: var(--accent-color);
    }
    .search-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--secondary-background-color);
      margin: 0 0.5rem;
      border-radius: 0.5rem;
    }
    .search-bar input {
      flex: 1;
      border: none;
      background: transparent;
      color: var(--primary-text-color);
      font-size: 1rem;
      outline: none;
      padding: 0.5rem;
    }
    .search-bar input::placeholder {
      color: var(--secondary-text-color);
    }
    .config-required {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 2rem;
      text-align: center;
      color: var(--secondary-text-color);
    }
    .config-required ha-icon {
      --mdc-icon-size: 48px;
      margin-bottom: 1rem;
      opacity: 0.5;
    }
    .config-required .title {
      font-size: 1.2rem;
      margin-bottom: 0.5rem;
      color: var(--primary-text-color);
    }
  `,
];
