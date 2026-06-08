import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartEmptyState, HotelNameTick } from './chartShared'
import { parseStars } from '../../utils/filterHotels'

// 1-star = muted grey, 5-star = deep gold
const STAR_COLORS = ['#94a3b8', '#64748b', '#f59e0b', '#d97706', '#b45309']


function starColor(stars) {
  return stars >= 1 && stars <= 5 ? STAR_COLORS[stars - 1] : '#94a3b8'
}

function RatingTooltip({ active, payload }) {
  if (!active || !payload?.length) return null

  const { name, stars, categoryLabel } = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-sm font-semibold text-slate-900 leading-snug">{name}</p>
      <p className="text-sm text-slate-700">
        {stars > 0 ? `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}` : categoryLabel}
      </p>
    </div>
  )
}

function StarYTick({ x, y, payload }) {
  const n = Number(payload.value)
  if (!Number.isInteger(n) || n < 0 || n > 5) return null
  return (
    <text x={x - 4} y={y + 4} textAnchor="end" fontSize={11} fill="#64748b">
      {n === 0 ? '—' : `${n}★`}
    </text>
  )
}

/**
 * Bar chart comparing the star category of selected hotels.
 *
 * @param {{ hotels: Array<{ name: string, categoryLabel: string }> }} props
 */
export default function RatingComparisonChart({ hotels }) {
  const data = hotels.map((h) => {
    const stars = parseStars(h.categoryLabel)
    return { name: h.name, stars, categoryLabel: h.categoryLabel ?? 'N/A', fill: starColor(stars) }
  })

  if (!data.some((d) => d.stars > 0)) {
    return <ChartEmptyState message="Star rating data is not available for the selected hotels." />
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 24, left: 16, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

        <XAxis
          dataKey="name"
          tick={<HotelNameTick />}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
          label={{ value: 'Hotel', position: 'bottom', offset: 5, fontSize: 12, fill: '#64748b' }}
        />

        <YAxis
          domain={[0, 5]}
          ticks={[0, 1, 2, 3, 4, 5]}
          tick={<StarYTick />}
          tickLine={false}
          axisLine={false}
          label={{ value: 'Star rating', angle: -90, position: 'insideLeft', offset: 8, fontSize: 12, fill: '#64748b' }}
        />

        <Tooltip content={<RatingTooltip />} cursor={{ fill: '#f1f5f9' }} />

        <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12, color: '#475569' }} formatter={() => 'Star category'} />

        <Bar dataKey="stars" name="Star category" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
