import { useCallback, useMemo, useState } from 'react'

const DEFAULT_BATCH = 10

/**
 * "Load more" progressive disclosure over an already-fetched array.
 * Each call to `loadMore` appends one batch to the visible slice — no API calls.
 *
 * Automatically resets to the first batch when `items` reference changes
 * (e.g. when filters are applied or a new search completes).
 *
 * @template T
 * @param {T[]} items       Full array (all items already in memory)
 * @param {number} [batch]  Items revealed per "Load more" click (default 10)
 */
export function useLoadMore(items, batch = DEFAULT_BATCH) {
  // Store both visibleCount and the items reference we last saw together.
  // When items changes (new search or filter change), reset to the first batch.
  const [state, setState] = useState({ visibleCount: batch, prevItems: items })

  let { visibleCount } = state
  if (state.prevItems !== items) {
    // Derived-state reset: update synchronously during render (React-safe pattern).
    visibleCount = batch
    setState({ visibleCount: batch, prevItems: items })
  }

  const visible = useMemo(() => items.slice(0, visibleCount), [items, visibleCount])

  const hasMore = visibleCount < items.length

  const loadMore = useCallback(() => {
    setState((prev) => ({
      ...prev,
      visibleCount: Math.min(prev.visibleCount + batch, items.length),
    }))
  }, [batch, items.length])

  /** Explicit reset — call when starting a new search. */
  const reset = useCallback(() => {
    setState((prev) => ({ ...prev, visibleCount: batch }))
  }, [batch])

  return { visible, hasMore, loadMore, reset, totalItems: items.length }
}
