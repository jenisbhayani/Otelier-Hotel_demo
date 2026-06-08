import { useCompare } from '../context/CompareContext'
import HotelCard from './HotelCard'

// ─── Skeleton card ────────────────────────────────────────────────────────────

/**
 * Animated shimmer placeholder that mirrors the HotelCard layout.
 * Shown while the search request is in flight.
 */
function SkeletonCard() {
  return (
    <div
      className="flex animate-pulse flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:flex-row"
      aria-hidden="true"
    >
      {/* Image area */}
      <div className="h-52 w-full shrink-0 bg-slate-200 sm:h-auto sm:w-52" />

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Name + compare button */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-5 w-3/4 rounded bg-slate-200" />
            <div className="h-4 w-1/2 rounded bg-slate-200" />
          </div>
          <div className="h-8 w-24 shrink-0 rounded-md bg-slate-200" />
        </div>

        {/* Stars */}
        <div className="h-4 w-28 rounded bg-slate-200" />

        {/* Divider */}
        <div className="my-1 border-t border-slate-100" />

        {/* Price row */}
        <div className="mt-auto flex items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="h-7 w-20 rounded bg-slate-200" />
          </div>
          <div className="h-6 w-16 rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  )
}

// ─── Sort control ─────────────────────────────────────────────────────────────

/**
 * Price sort dropdown rendered in the results header.
 * Only shown when there are results to sort.
 *
 * @param {{ value: string, onChange: (v: string) => void }} props
 */
function SortControl({ value, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600" htmlFor="sort-select">
      <span className="font-medium">Sort:</span>
      <select
        id="sort-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      >
        <option value="none">Relevance</option>
        <option value="asc">Price: Low → High</option>
        <option value="desc">Price: High → Low</option>
      </select>
    </label>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @param {{
 *   hotels?: Array<{
 *     code: string,
 *     name: string,
 *     destinationLabel: string,
 *     categoryLabel: string,
 *     priceLabel: string,
 *     imageUrl?: string | null,
 *   }>,
 *   totalHotels?: number,
 *   isLoading?: boolean,
 *   error?: string,
 *   hasSearched?: boolean,
 *   hasMore?: boolean,
 *   onLoadMore?: () => void,
 *   sortOrder?: string,
 *   onSortChange?: (v: string) => void,
 * }} props
 *
 * Note: compare state (selectedCodes) is read directly from CompareContext
 * inside HotelCard — no need to thread it through HotelList.
 */
export default function HotelList({
  hotels = [],
  totalHotels = 0,
  isLoading = false,
  error = '',
  hasSearched = false,
  hasMore = false,
  onLoadMore,
  sortOrder = 'none',
  onSortChange,
}) {
  // Read the compare count directly from context for the badge.
  const { count: compareCount } = useCompare()

  // ── Skeleton loading ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <section className="mt-8" aria-live="polite" aria-busy="true" aria-label="Loading hotels">
        <div className="mb-4 h-7 w-48 animate-pulse rounded bg-slate-200" />
        <ul className="space-y-4">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i}>
              <SkeletonCard />
            </li>
          ))}
        </ul>
      </section>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <section className="mt-8" aria-live="assertive">
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      </section>
    )
  }

  // ── Pre-search prompt ──────────────────────────────────────────────────────
  if (!hasSearched) {
    return (
      <section className="mt-8">
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
          <p className="text-sm text-slate-600">
            Enter your search criteria above to see hotel availability.
          </p>
        </div>
      </section>
    )
  }

  // ── Empty results ──────────────────────────────────────────────────────────
  if (hotels.length === 0) {
    return (
      <section className="mt-8" aria-live="polite">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-12 text-center">
          <p className="font-medium text-slate-900">No hotels found</p>
          <p className="mt-2 text-sm text-slate-600">
            Try different dates or another destination.
          </p>
        </div>
      </section>
    )
  }

  // ── Results list ───────────────────────────────────────────────────────────
  const total = totalHotels || hotels.length

  return (
    <section className="mt-8" aria-live="polite">
      {/* Header — count + sort control */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {hotels.length < total
              ? `Showing ${hotels.length} of ${total} hotel${total === 1 ? '' : 's'}`
              : `${total} hotel${total === 1 ? '' : 's'} found`}
          </h2>
          {compareCount > 0 && (
            <p className="text-sm text-slate-600">
              {compareCount} selected for compare
            </p>
          )}
        </div>

        {/* Sort dropdown — only rendered when there are multiple results */}
        {total > 1 && onSortChange && (
          <SortControl value={sortOrder} onChange={onSortChange} />
        )}
      </div>

      {/* Hotel cards */}
      <ul className="space-y-4">
        {hotels.map((hotel) => (
          <li key={hotel.code}>
            <HotelCard hotel={hotel} />
          </li>
        ))}
      </ul>

      {/* Load more */}
      {hasMore && (
        <div className="mt-6 flex items-center justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
          >
            Load more hotels
          </button>
        </div>
      )}

      {/* All loaded indicator */}
      {!hasMore && total > 10 && (
        <p className="mt-6 text-center text-sm text-slate-400">
          All {total} hotels loaded
        </p>
      )}
    </section>
  )
}
