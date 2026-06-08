import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getDestinations,
  getDestinationsCached,
  getHotelDetails,
  HotelbedsError,
  searchHotels,
} from '../api/hotelbeds'
import FilterSidebar from '../components/FilterSidebar'
import HotelList from '../components/HotelList'
import SearchForm from '../components/SearchForm'
import { useCompare } from '../context/CompareContext'
import { useSearch } from '../context/SearchContext'
import { useHotelFilters } from '../hooks/useHotelFilters'
import { useLoadMore } from '../hooks/usePagination'
import { contentString, resolveHotelImageUrl, toHotelCardModel } from '../utils/hotelDisplay'

const DEST_PARAMS = { countryCodes: 'ES,US,GB,FR', language: 'ENG' }

// ─── Error helper ─────────────────────────────────────────────────────────────

function getErrorMessage(error) {
  if (error instanceof HotelbedsError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  // Destinations — synchronously seeded from localStorage cache
  const [destinations, setDestinations] = useState(() => getDestinationsCached(DEST_PARAMS) ?? [])
  const [destinationsLoading, setDestinationsLoading] = useState(
    () => getDestinationsCached(DEST_PARAMS) === null,
  )
  const [destinationsError, setDestinationsError] = useState('')

  // Sort order for filtered results — applied before Load More
  // 'none' | 'asc' | 'desc'
  const [sortOrder, setSortOrder] = useState('none')

  // Hotel search results — stored in context so they survive navigation
  // (e.g. going to Compare page and returning to Dashboard).
  const { hotels, hasSearched, setSearchResults } = useSearch()
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Client-side filters — operates on `hotels`, returns `filteredHotels`
  const {
    filters,
    filteredHotels: filteredUnsorted,
    options,
    activeCount,
    isEmpty: filtersEmpty,
    setName,
    toggleStar,
    toggleFacility,
    toggleDestination,
    clearAll: clearFilters,
  } = useHotelFilters(hotels)

  // Apply price sort on top of the filtered results
  const filteredHotels = useMemo(() => {
    if (sortOrder === 'none') return filteredUnsorted
    return [...filteredUnsorted].sort((a, b) =>
      sortOrder === 'asc' ? a.price - b.price : b.price - a.price,
    )
  }, [filteredUnsorted, sortOrder])

  // Load-more — operates on `filteredHotels`, auto-resets when filters change
  const { visible: visibleHotels, hasMore, loadMore, reset: resetVisible } = useLoadMore(filteredHotels)

  // Only the count is needed here — selectedCodes and toggleHotel are
  // consumed directly inside HotelCard via useCompare().
  const { count: compareCount } = useCompare()

  const destinationNameByCode = useMemo(
    () => new Map(destinations.map((d) => [d.code, contentString(d.name)])),
    [destinations],
  )

  // ── Destinations fetch (cache miss only) ──────────────────────────────────

  useEffect(() => {
    if (destinations.length > 0) return

    let isMounted = true

    async function loadDestinations() {
      setDestinationsLoading(true)
      setDestinationsError('')
      try {
        const { destinations: list } = await getDestinations(DEST_PARAMS)
        if (!isMounted) return
        const sorted = [...(Array.isArray(list) ? list : [])].sort((a, b) =>
          contentString(a?.name).localeCompare(contentString(b?.name)),
        )
        setDestinations(sorted)
      } catch (error) {
        if (!isMounted) return
        setDestinationsError(getErrorMessage(error))
      } finally {
        if (isMounted) setDestinationsLoading(false)
      }
    }

    loadDestinations()
    return () => { isMounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hotel detail enrichment (images + facilities) ─────────────────────────

  const enrichHotels = useCallback(async (searchResults, destinationCode) => {
    const codes = searchResults.map((h) => h.code).filter(Boolean)
    if (codes.length === 0) return []

    let imageByCode = new Map()
    let facilitiesByCode = new Map()

    try {
      const { hotels: details } = await getHotelDetails({ codes })

      imageByCode = new Map(
        details.map((h) => [h.code, resolveHotelImageUrl(h.images)]),
      )

      // Extract unique facilityGroupCodes per hotel for the filter sidebar
      facilitiesByCode = new Map(
        details.map((h) => [
          h.code,
          [...new Set((h.facilities ?? []).map((f) => f.facilityGroupCode).filter(Boolean))],
        ]),
      )
    } catch {
      // Details are optional — results render without images/facilities.
    }

    const destinationName = destinationNameByCode.get(destinationCode) ?? destinationCode

    return searchResults.map((hotel) =>
      toHotelCardModel(hotel, {
        destinationName,
        imageUrl: imageByCode.get(hotel.code) ?? null,
        facilityGroups: facilitiesByCode.get(hotel.code) ?? [],
      }),
    )
  }, [destinationNameByCode])

  // ── Search handler ────────────────────────────────────────────────────────
  //
  // A ref-based request ID guards against race conditions: if the user
  // triggers a second search before the first completes, the stale response
  // is silently discarded instead of overwriting the fresh results.

  const searchIdRef = useRef(0)

  const handleSearch = useCallback(async ({ destinationCode, checkIn, checkOut, adults }) => {
    const myId = ++searchIdRef.current

    setSearchLoading(true)
    setSearchError('')
    setSearchResults([])  // clears old results immediately; marks hasSearched=true
    clearFilters()        // reset filters so new results show unfiltered
    resetVisible()        // snap load-more back to first 10

    try {
      const { hotels: results } = await searchHotels({
        destinationCode,
        checkIn,
        checkOut,
        adults,
        rooms: 1,
        children: 0,
      })

      const cardModels = await enrichHotels(results, destinationCode)

      // Discard stale responses from earlier searches
      if (searchIdRef.current !== myId) return
      setSortOrder('none')          // reset sort for fresh results
      setSearchResults(cardModels)
    } catch (error) {
      if (searchIdRef.current !== myId) return
      setSearchError(getErrorMessage(error))
      // hotels already cleared above; no further action needed
    } finally {
      // Only the most recent search should clear the loading spinner
      if (searchIdRef.current === myId) {
        setSearchLoading(false)
      }
    }
  }, [clearFilters, resetVisible, enrichHotels, setSearchResults])

  // ── Layout ────────────────────────────────────────────────────────────────

  // Show the two-column layout only when there are actual results
  const showSidebar = hotels.length > 0 && !searchLoading

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-2 text-slate-600">
            Search hotel availability and select properties to compare.
          </p>
        </div>

        {compareCount > 0 && (
          <Link
            to="/compare"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            View compare ({compareCount})
          </Link>
        )}
      </div>

      {/* Search form */}
      <div className="mt-8">
        <SearchForm
          destinations={destinations}
          destinationsLoading={destinationsLoading}
          destinationsError={destinationsError}
          isSearching={searchLoading}
          onSearch={handleSearch}
        />
      </div>

      {/* Results area — two-column when results exist, full-width otherwise */}
      <div className={`mt-4 ${showSidebar ? 'flex items-start gap-6' : ''}`}>
        {showSidebar && (
          <FilterSidebar
            state={{
              filters,
              options,
              filteredCount: filteredHotels.length,
              totalCount: hotels.length,
              activeCount,
              isEmpty: filtersEmpty,
            }}
            handlers={{
              onNameChange: setName,
              onToggleStar: toggleStar,
              onToggleFacility: toggleFacility,
              onToggleDestination: toggleDestination,
              onClearAll: clearFilters,
            }}
          />
        )}

        <div className={showSidebar ? 'min-w-0 flex-1' : ''}>
          <HotelList
            hotels={visibleHotels}
            totalHotels={filteredHotels.length}
            isLoading={searchLoading}
            error={searchError}
            hasSearched={hasSearched}
            hasMore={hasMore}
            onLoadMore={loadMore}
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
          />
        </div>
      </div>
    </main>
  )
}
