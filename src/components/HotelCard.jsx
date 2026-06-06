// ─── Star renderer ────────────────────────────────────────────────────────────

function StarRating({ categoryLabel }) {
  const match = String(categoryLabel ?? '').match(/^(\d)/)
  const stars = match ? Number(match[1]) : 0

  if (stars === 0) {
    return <span className="text-xs text-slate-400">{categoryLabel || 'Unrated'}</span>
  }

  return (
    <span className="flex items-center gap-0.5" aria-label={`${stars} star hotel`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`h-4 w-4 ${i < stars ? 'fill-amber-400' : 'fill-slate-200'}`}
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  )
}

// ─── No-image placeholder ─────────────────────────────────────────────────────

function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400">
      <svg viewBox="0 0 24 24" className="h-10 w-10 fill-slate-300" aria-hidden="true">
        <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span className="text-xs">No photo</span>
    </div>
  )
}

// ─── Main card ────────────────────────────────────────────────────────────────

/**
 * Hotel result card.
 *
 * Displays at a glance:
 *  - Hotel photo (or placeholder)
 *  - Name + destination
 *  - Star rating (filled/empty stars)
 *  - Min. price per night with currency
 *  - Compare checkbox
 *
 * @param {{
 *   hotel: {
 *     code: string,
 *     name: string,
 *     destinationLabel: string,
 *     categoryLabel: string,
 *     price: number,
 *     currency: string,
 *     priceLabel: string,
 *     imageUrl?: string | null,
 *   },
 *   isSelectedForCompare?: boolean,
 *   onCompareChange?: (code: string, selected: boolean) => void,
 * }} props
 */
export default function HotelCard({
  hotel,
  isSelectedForCompare = false,
  onCompareChange,
}) {
  const compareId = `compare-${hotel.code}`

  const hasPrice = Number.isFinite(hotel.price) && hotel.price > 0

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md sm:flex-row ${
        isSelectedForCompare ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
      }`}
    >
      {/* ── Hotel image ── */}
      <div className="relative h-52 w-full shrink-0 overflow-hidden sm:h-auto sm:w-52">
        {hotel.imageUrl ? (
          <img
            src={hotel.imageUrl}
            alt={`Photo of ${hotel.name}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <ImagePlaceholder />
        )}

        {/* Compare badge on image when selected */}
        {isSelectedForCompare && (
          <div className="absolute left-2 top-2 rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white shadow">
            ✓ Added to compare
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-1 flex-col p-5">

        {/* Top row — name + compare toggle */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold leading-snug text-slate-900">
              {hotel.name}
            </h3>

            {/* Destination */}
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 fill-slate-400" aria-hidden="true">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {hotel.destinationLabel}
            </p>
          </div>

          {/* Compare checkbox */}
          <label
            htmlFor={compareId}
            className={`flex shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              isSelectedForCompare
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <input
              id={compareId}
              type="checkbox"
              checked={isSelectedForCompare}
              onChange={(e) => onCompareChange?.(hotel.code, e.target.checked)}
              className="sr-only"
            />
            {isSelectedForCompare ? '✓ Comparing' : '+ Compare'}
          </label>
        </div>

        {/* Star rating */}
        <div className="mt-3">
          <StarRating categoryLabel={hotel.categoryLabel} />
        </div>

        {/* Divider */}
        <hr className="my-4 border-slate-100" />

        {/* Price row — primary call to action */}
        <div className="mt-auto flex items-end justify-between gap-4">
          <div>
            {hasPrice ? (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Min. price per night
                </p>
                <p className="mt-0.5 text-2xl font-bold text-slate-900">
                  {hotel.currency && (
                    <span className="mr-1 text-sm font-semibold text-slate-500">
                      {hotel.currency}
                    </span>
                  )}
                  {hotel.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-slate-400">Price on request</p>
            )}
          </div>

          {/* Quick info pills */}
          <div className="flex flex-wrap justify-end gap-1.5">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {hotel.categoryLabel}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}
