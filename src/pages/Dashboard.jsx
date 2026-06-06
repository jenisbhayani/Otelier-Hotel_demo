import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getDestinations,
  getHotelDetails,
  HotelbedsError,
  searchHotels,
} from '../api/hotelbeds'
import FilterSidebar from '../components/FilterSidebar'
import HotelList from '../components/HotelList'
import SearchForm from '../components/SearchForm'
import { useCompare } from '../context/CompareContext'
import { useHotelFilters } from '../hooks/useHotelFilters'
import { useLoadMore } from '../hooks/usePagination'
import { contentString, resolveHotelImageUrl, toHotelCardModel } from '../utils/hotelDisplay'

const DEST_PARAMS = { countryCodes: 'ES,US,GB,FR', language: 'ENG' }

// ─── Cache helpers ────────────────────────────────────────────────────────────

function buildDestCacheKey() {
  const keys = Object.keys(DEST_PARAMS).sort()
  const inner = keys.map((k) => `${JSON.stringify(k)}:${JSON.stringify(DEST_PARAMS[k])}`).join(',')
  return `hotelbeds-cache:destinations:{${inner}}`
}

function readDestinationsFromCache() {
  try {
    const raw = window.localStorage.getItem(buildDestCacheKey())
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (!entry?.data || !Array.isArray(entry.data.destinations)) return null
    if (entry.expiresAt && Date.now() > entry.expiresAt) return null
    return entry.data.destinations
  } catch {
    return null
  }
}

// ─── Error helper ─────────────────────────────────────────────────────────────

function getErrorMessage(error) {
  if (error instanceof HotelbedsError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  // Destinations — synchronously seeded from localStorage cache
  const [destinations, setDestinations] = useState(() => readDestinationsFromCache() ?? [])
  const [destinationsLoading, setDestinationsLoading] = useState(
    () => readDestinationsFromCache() === null,
  )
  const [destinationsError, setDestinationsError] = useState('')

  // Full hotel result set from the last search (never mutated by filters)
  const [hotels, setHotels] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  // Client-side filters — operates on `hotels`, returns `filteredHotels`
  const {
    filters,
    filteredHotels,
    options,
    activeCount,
    isEmpty: filtersEmpty,
    setName,
    toggleStar,
    toggleFacility,
    toggleDestination,
    clearAll: clearFilters,
  } = useHotelFilters(hotels)

  // Load-more — operates on `filteredHotels`, auto-resets when filters change
  const { visible: visibleHotels, hasMore, loadMore, reset: resetVisible } = useLoadMore(filteredHotels)

  const { selectedCodes, toggleHotel, count: compareCount } = useCompare()

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

  // ── Compare handler ───────────────────────────────────────────────────────

  const handleCompareChange = useCallback((code, isSelected) => {
    const hotel = hotels.find((h) => h.code === code)
    if (!hotel) return
    toggleHotel(hotel, isSelected)
  }, [hotels, toggleHotel])

  // ── Hotel detail enrichment (images + facilities) ─────────────────────────

  async function enrichHotels(searchResults, destinationCode) {
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
  }

  // ── Search handler ────────────────────────────────────────────────────────

  async function handleSearch({ destinationCode, checkIn, checkOut, adults }) {
    setSearchLoading(true)
    setSearchError('')
    setHasSearched(true)
    setHotels([])
    clearFilters()    // reset filters so new results show unfiltered
    resetVisible()    // snap load-more back to first 10

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
      setHotels(cardModels)
    } catch (error) {
      setSearchError(getErrorMessage(error))
      setHotels([])
    } finally {
      setSearchLoading(false)
    }
  }

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
            filters={filters}
            options={options}
            filteredCount={filteredHotels.length}
            totalCount={hotels.length}
            activeCount={activeCount}
            isEmpty={filtersEmpty}
            onNameChange={setName}
            onToggleStar={toggleStar}
            onToggleFacility={toggleFacility}
            onToggleDestination={toggleDestination}
            onClearAll={clearFilters}
          />
        )}

        <div className={showSidebar ? 'min-w-0 flex-1' : ''}>
          <HotelList
            hotels={visibleHotels}
            totalHotels={filteredHotels.length}
            isLoading={searchLoading}
            error={searchError}
            hasSearched={hasSearched}
            selectedCodes={selectedCodes}
            onCompareChange={handleCompareChange}
            hasMore={hasMore}
            onLoadMore={loadMore}
          />
        </div>
      </div>
    </main>
  )
}
