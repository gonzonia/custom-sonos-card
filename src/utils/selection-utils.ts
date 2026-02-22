/**
 * Utility functions for managing selection state in lists
 */

/**
 * Handle checkbox change - add or remove index from selection set
 * Returns a new Set to trigger reactivity
 */
export function updateSelection(selectedIndices: Set<number>, index: number, checked: boolean): Set<number> {
  const newSet = new Set(selectedIndices);
  if (checked) {
    newSet.add(index);
  } else {
    newSet.delete(index);
  }
  return newSet;
}

/**
 * Invert selection - select all unselected items and deselect selected items
 * Returns a new Set with inverted selection
 */
export function invertSelection(selectedIndices: Set<number>, totalItems: number): Set<number> {
  const newSelection = new Set<number>();
  for (let i = 0; i < totalItems; i++) {
    if (!selectedIndices.has(i)) {
      newSelection.add(i);
    }
  }
  return newSelection;
}

export function clearSelection(): Set<number> {
  return new Set<number>();
}
