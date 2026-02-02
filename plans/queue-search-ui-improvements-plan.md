## Plan: Queue Search UI Improvements

Refine the queue search interface by removing redundant controls, improving visual feedback for the toggle state, and ensuring consistent behavior when hiding the search bar.

**Phases: 3**

1. **Phase 1: Remove Redundant Close Button**
    - **Objective:** Remove the X (close) button from the search bar since the magnifying glass icon already toggles the search bar visibility
    - **Files/Functions to Modify/Create:**
      - [src/components/queue-search.ts](../src/components/queue-search.ts) - `renderSearchBar()` method
      - [src/components/queue-search.ts](../src/components/queue-search.ts) - Remove `clearSearch()` button binding
      - [src/components/queue-search.ts](../src/components/queue-search.ts) - Remove `mdiClose` import
    - **Tests to Write:**
      - Manual: Verify search bar can still be hidden by clicking magnifying glass
      - Manual: Verify Escape key still works to close search and clear content
    - **Steps:**
        1. Remove the `mdiClose` icon from imports at the top of queue-search.ts
        2. Remove the `<ha-icon-button .path=${mdiClose}...>` element from the `renderSearchBar()` method
        3. Verify the search bar can still be toggled via the magnifying glass button
        4. Verify Escape key functionality remains intact

2. **Phase 2: Improve Magnifying Glass Visual Feedback**
    - **Objective:** Ensure the magnifying glass icon uses accent color when search is expanded, and removes accent color when collapsed
    - **Files/Functions to Modify/Create:**
      - [src/components/queue-search.styles.ts](../src/components/queue-search.styles.ts) - Add styling for `ha-icon-button[selected]` at root level
    - **Tests to Write:**
      - Manual: Verify magnifying glass shows accent color when search is open
      - Manual: Verify magnifying glass returns to default color when search is closed
    - **Steps:**
        1. Review current `queue-search.styles.ts` to see if root-level icon button styling exists
        2. Add CSS rule for `:host > ha-icon-button[selected]` to set color to `var(--accent-color)`
        3. Verify the `?selected=${this.expanded}` binding already exists on the magnifying glass button (it does)
        4. Test visual feedback by toggling search on/off

3. **Phase 3: Auto-Disable Eye-Check When Hiding Search**
    - **Objective:** When the search bar is hidden (collapsed), automatically disable the eye-check (showOnlyMatches) functionality to avoid confusion
    - **Files/Functions to Modify/Create:**
      - [src/components/queue-search.ts](../src/components/queue-search.ts) - `toggleSearch()` method
      - [src/components/queue-search.ts](../src/components/queue-search.ts) - Dispatch `queue-search-show-only-matches` event when hiding search
    - **Tests to Write:**
      - Manual: Enable eye-check, collapse search bar, verify all queue items are visible again
      - Manual: Enable eye-check, collapse search bar, expand search bar, verify eye-check is off
      - Manual: Verify localStorage still preserves search text when collapsing
    - **Steps:**
        1. Modify `toggleSearch()` method to check if `this.showOnlyMatches` is true when collapsing
        2. If collapsing and `showOnlyMatches` is true, set it to false and clear `shownIndices`
        3. Dispatch `queue-search-show-only-matches` event with `showOnlyMatches: false, shownIndices: []` when collapsing with eye-check on
        4. Save state to localStorage after these changes
        5. Test that all queue items reappear when search is collapsed with eye-check enabled

**Open Questions:**
1. Should the search text be cleared when collapsing the search bar, or only when pressing Escape? (Currently search text is preserved by design from previous implementation)
2. Should eye-check state be preserved in localStorage when reopening the search bar, or always start as off? (Recommend: preserve it, but auto-disable only when collapsing)
