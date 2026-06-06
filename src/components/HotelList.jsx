import HotelCard from './HotelCard'

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
 *   selectedCodes?: Set<string>,
 *   onCompareChange?: (code: string, selected: boolean) => void,
 *   hasMore?: boolean,
 *   onLoadMore?: () => void,
 * }} props
 */
export default function HotelList({
  hotels = [],
  totalHotels = 0,
  isLoading = false,
  error = '',
  hasSearched = false,
  selectedCodes = new Set(),
  onCompareChange,
  hasMore = false,
  onLoadMore,
}) {
  if (isLoading) {
    return (
      <section className="mt-8" aria-live="polite" aria-busy="true">
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-16">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"
            role="status"
            aria-label="Loading hotels"
          />
          <p className="text-sm text-slate-600">Searching for available hotels…</p>
        </div>
      </section>
    )
  }

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

  const total = totalHotels || hotels.length

  return (
    <section className="mt-8" aria-live="polite">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">
          {hotels.length < total
            ? `Showing ${hotels.length} of ${total} hotel${total === 1 ? '' : 's'}`
            : `${total} hotel${total === 1 ? '' : 's'} found`}
        </h2>
        {selectedCodes.size > 0 && (
          <p className="text-sm text-slate-600">
            {selectedCodes.size} selected for compare
          </p>
        )}
      </div>

      {/* Hotel cards */}
      <ul className="space-y-4">
        {hotels.map((hotel) => (
          <li key={hotel.code}>
            <HotelCard
              hotel={hotel}
              isSelectedForCompare={selectedCodes.has(hotel.code)}
              onCompareChange={onCompareChange}
            />
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
