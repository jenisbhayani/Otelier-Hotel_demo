import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartEmptyState, HotelNameTick } from './chartShared'

function PriceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null

  const { name, price, currency } = payload[0].payload
  const formatted = Number.isFinite(price)
    ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-sm font-semibold text-slate-900 leading-snug">{name}</p>
      <p className="text-sm text-slate-700">
        {currency ? `${currency} ` : ''}{formatted}
      </p>
    </div>
  )
}

/**
 * Bar chart comparing the minimum nightly rate across selected hotels.
 *
 * @param {{ hotels: Array<{ name: string, price: number, currency: string }> }} props
 */
export default function PriceComparisonChart({ hotels }) {
  const chartable = hotels.filter((h) => Number.isFinite(h.price) && h.price > 0)

  if (chartable.length === 0) {
    return <ChartEmptyState message="No price data available for the selected hotels." />
  }

  const data = chartable.map((h) => ({ name: h.name, price: h.price, currency: h.currency ?? '' }))
  const currency = chartable[0].currency ?? ''

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 24, left: 16, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

        <XAxis
          dataKey="name"
          tick={<HotelNameTick />}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
          label={{ value: 'Hotel', position: 'insideBottom', offset: -16, fontSize: 12, fill: '#64748b' }}
        />

        <YAxis
          tickFormatter={(v) => v.toLocaleString()}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: '#64748b' }}
          label={{ value: currency ? `Price (${currency})` : 'Price', angle: -90, position: 'insideLeft', offset: 8, fontSize: 12, fill: '#64748b' }}
        />

        <Tooltip content={<PriceTooltip />} cursor={{ fill: '#f1f5f9' }} />

        <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12, color: '#475569' }} formatter={() => 'Min. nightly rate'} />

        <Bar dataKey="price" name="Min. nightly rate" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={64} />
      </BarChart>
    </ResponsiveContainer>
  )
}
