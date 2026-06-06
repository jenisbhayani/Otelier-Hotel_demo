/**
 * Shared presentational primitives for chart components.
 * Avoids duplication between PriceComparisonChart and RatingComparisonChart.
 */

/** Full-width empty state shown when there is no chartable data. */
export function ChartEmptyState({ message }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )
}

/**
 * Custom X-axis tick that truncates long hotel names so they fit the chart area.
 * Used as `tick={<HotelNameTick />}` on an XAxis with `dataKey="name"`.
 */
export function HotelNameTick({ x, y, payload }) {
  const MAX = 14
  const raw = payload?.value ?? ''
  const label = typeof raw === 'string' && raw.length > MAX ? `${raw.slice(0, MAX)}…` : raw

  return (
    <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill="#64748b">
      {label}
    </text>
  )
}
