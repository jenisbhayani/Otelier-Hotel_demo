import { Link } from 'react-router-dom'
import PriceComparisonChart from '../components/charts/PriceComparisonChart'
import RatingComparisonChart from '../components/charts/RatingComparisonChart'
import { useCompare } from '../context/CompareContext'

// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * Reusable section wrapper with a title and optional subtitle.
 */
function Section({ title, subtitle, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}

/**
 * Comparison table — one column per hotel, one row per attribute.
 */
function ComparisonTable({ hotels }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Attribute
            </th>
            {hotels.map((hotel) => (
              <th
                key={hotel.code}
                className="pb-3 pr-4 text-left text-sm font-semibold text-slate-900"
              >
                {hotel.name}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {/* Destination */}
          <tr>
            <td className="py-3 pr-4 text-xs font-medium uppercase tracking-wide text-slate-500">
              Destination
            </td>
            {hotels.map((hotel) => (
              <td key={hotel.code} className="py-3 pr-4 text-slate-700">
                {hotel.destinationLabel}
              </td>
            ))}
          </tr>

          {/* Rating */}
          <tr>
            <td className="py-3 pr-4 text-xs font-medium uppercase tracking-wide text-slate-500">
              Rating
            </td>
            {hotels.map((hotel) => (
              <td key={hotel.code} className="py-3 pr-4 text-slate-700">
                {hotel.categoryLabel}
              </td>
            ))}
          </tr>

          {/* Price */}
          <tr>
            <td className="py-3 pr-4 text-xs font-medium uppercase tracking-wide text-slate-500">
              Min. price
            </td>
            {hotels.map((hotel) => (
              <td key={hotel.code} className="py-3 pr-4 font-semibold text-slate-900">
                {hotel.priceLabel}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/**
 * Banner shown when fewer than 2 hotels are selected.
 */
function SelectionPrompt({ count }) {
  const remaining = 2 - count

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        {/* Simple hotel icon via text */}
        <span className="text-2xl" aria-hidden="true">🏨</span>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {count === 0
            ? 'No hotels selected'
            : `${count} hotel selected`}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {`Select ${remaining} more hotel${remaining === 1 ? '' : 's'} from the dashboard to start comparing.`}
        </p>
      </div>

      <Link
        to="/dashboard"
        className="mt-2 inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
      >
        Go to Dashboard
      </Link>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

/**
 * Side-by-side hotel comparison page with a data table and Recharts visualizations.
 * Data comes from CompareContext — no additional API calls are made here.
 */
export default function Compare() {
  const { hotels, count, clearAll } = useCompare()

  const canCompare = count >= 2

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Compare hotels</h1>
          <p className="mt-1 text-sm text-slate-500">
            {canCompare
              ? `Comparing ${count} hotel${count === 1 ? '' : 's'}.`
              : 'Select at least 2 hotels from the dashboard to see a comparison.'}
          </p>
        </div>

        {count > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-red-600"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {!canCompare ? (
        <SelectionPrompt count={count} />
      ) : (
        <div className="mt-6 flex flex-col gap-6">

          {/* A. Comparison table */}
          <Section
            title="Hotel overview"
            subtitle="Side-by-side comparison of key attributes."
          >
            <ComparisonTable hotels={hotels} />
          </Section>

          {/* B. Price chart */}
          <Section
            title="Price comparison"
            subtitle="Minimum nightly rate per hotel."
          >
            <PriceComparisonChart hotels={hotels} />
          </Section>

          {/* C. Rating chart */}
          <Section
            title="Rating comparison"
            subtitle="Star category per hotel (1 = basic, 5 = luxury)."
          >
            <RatingComparisonChart hotels={hotels} />
          </Section>

        </div>
      )}
    </main>
  )
}
