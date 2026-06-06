import { useCallback, useMemo, useState } from 'react'
import { applyFilters, deriveFilterOptions, EMPTY_FILTERS, isFiltersEmpty } from '../utils/filterHotels'

/**
 * Manages filter state and applies filters to the hotel array client-side.
 * All filtering is memoized — runs only when hotels or filters change.
 *
 * @param {object[]} allHotels - The complete search result array (never mutated)
 * @returns {{
 *   filters: object,
 *   filteredHotels: object[],
 *   options: object,
 *   activeCount: number,
 *   isEmpty: boolean,
 *   setName: (v: string) => void,
 *   toggleStar: (n: number) => void,
 *   toggleFacility: (name: string) => void,
 *   toggleDestination: (code: string) => void,
 *   clearAll: () => void,
 * }}
 */
export function useHotelFilters(allHotels) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  // Derive available options from the full result set (not the filtered set),
  // so options don't disappear while filters are active.
  const options = useMemo(() => deriveFilterOptions(allHotels), [allHotels])

  const filteredHotels = useMemo(
    () => applyFilters(allHotels, filters),
    [allHotels, filters],
  )

  // ── Updaters ───────────────────────────────────────────────────────────────

  const setName = useCallback((value) => {
    setFilters((prev) => ({ ...prev, name: value }))
  }, [])

  const toggleStar = useCallback((star) => {
    setFilters((prev) => {
      const next = new Set(prev.stars)
      next.has(star) ? next.delete(star) : next.add(star)
      return { ...prev, stars: next }
    })
  }, [])

  const toggleFacility = useCallback((name) => {
    setFilters((prev) => {
      const next = new Set(prev.facilities)
      next.has(name) ? next.delete(name) : next.add(name)
      return { ...prev, facilities: next }
    })
  }, [])

  const toggleDestination = useCallback((code) => {
    setFilters((prev) => {
      const next = new Set(prev.destinations)
      next.has(code) ? next.delete(code) : next.add(code)
      return { ...prev, destinations: next }
    })
  }, [])

  const clearAll = useCallback(() => setFilters(EMPTY_FILTERS), [])

  // Count how many filter types are active (for badge display)
  const activeCount =
    (filters.name.trim() ? 1 : 0) +
    filters.stars.size +
    filters.facilities.size +
    filters.destinations.size

  return {
    filters,
    filteredHotels,
    options,
    activeCount,
    isEmpty: isFiltersEmpty(filters),
    setName,
    toggleStar,
    toggleFacility,
    toggleDestination,
    clearAll,
  }
}
