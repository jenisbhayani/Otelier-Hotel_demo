import { useState } from 'react'

// ─── Primitives ───────────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </h3>
  )
}

function CheckboxRow({ id, label, checked, onChange }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 py-0.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}

// ─── Filter sections ──────────────────────────────────────────────────────────

function NameSearch({ value, onChange }) {
  return (
    <div>
      <SectionTitle>Hotel name</SectionTitle>
      <input
        type="search"
        placeholder="Search by name…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
    </div>
  )
}

function StarFilter({ available, selected, onToggle }) {
  if (available.length === 0) return null
  return (
    <div>
      <SectionTitle>Star rating</SectionTitle>
      <div className="space-y-1">
        {available.map((star) => (
          <CheckboxRow
            key={star}
            id={`star-${star}`}
            label={`${star} star${star === 1 ? '' : 's'}`}
            checked={selected.has(star)}
            onChange={() => onToggle(star)}
          />
        ))}
      </div>
    </div>
  )
}

function FacilityFilter({ available, selected, onToggle }) {
  if (available.length === 0) return null
  return (
    <div>
      <SectionTitle>Facilities</SectionTitle>
      <div className="space-y-1">
        {available.map((name) => (
          <CheckboxRow
            key={name}
            id={`facility-${name}`}
            label={name}
            checked={selected.has(name)}
            onChange={() => onToggle(name)}
          />
        ))}
      </div>
    </div>
  )
}

function DestinationFilter({ available, selected, onToggle }) {
  if (available.length === 0) return null
  return (
    <div>
      <SectionTitle>Destination</SectionTitle>
      <div className="space-y-1">
        {available.map(({ code, label }) => (
          <CheckboxRow
            key={code}
            id={`dest-${code}`}
            label={label}
            checked={selected.has(code)}
            onChange={() => onToggle(code)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Collapsible filter sidebar.
 * On desktop it renders as a persistent left column.
 * On mobile a toggle button shows/hides it as a top panel.
 *
 * @param {{
 *   filters: { name: string, stars: Set<number>, facilities: Set<string>, destinations: Set<string> },
 *   options: { stars: number[], facilities: string[], destinations: { code: string, label: string }[] },
 *   filteredCount: number,
 *   totalCount: number,
 *   activeCount: number,
 *   isEmpty: boolean,
 *   onNameChange: (v: string) => void,
 *   onToggleStar: (n: number) => void,
 *   onToggleFacility: (name: string) => void,
 *   onToggleDestination: (code: string) => void,
 *   onClearAll: () => void,
 * }} props
 */
export default function FilterSidebar({
  filters,
  options,
  filteredCount,
  totalCount,
  activeCount,
  isEmpty,
  onNameChange,
  onToggleStar,
  onToggleFacility,
  onToggleDestination,
  onClearAll,
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const panelContent = (
    <div className="space-y-5">
      {/* Results counter */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-900">
          {filteredCount} of {totalCount} hotel{totalCount === 1 ? '' : 's'}
        </p>
        {!isEmpty && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-red-600 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <hr className="border-slate-200" />

      {/* Filter sections */}
      <NameSearch value={filters.name} onChange={onNameChange} />

      <StarFilter
        available={options.stars}
        selected={filters.stars}
        onToggle={onToggleStar}
      />

      <FacilityFilter
        available={options.facilities}
        selected={filters.facilities}
        onToggle={onToggleFacility}
      />

      <DestinationFilter
        available={options.destinations}
        selected={filters.destinations}
        onToggle={onToggleDestination}
      />
    </div>
  )

  return (
    <>
      {/* ── Mobile toggle ── */}
      <div className="mb-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm"
        >
          <span>
            Filters
            {activeCount > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs text-white">
                {activeCount}
              </span>
            )}
          </span>
          <span className="text-slate-400">{mobileOpen ? '▲' : '▼'}</span>
        </button>

        {mobileOpen && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            {panelContent}
          </div>
        )}
      </div>

      {/* ── Desktop sidebar (always visible) ── */}
      <aside className="hidden w-52 shrink-0 lg:block">
        <div className="sticky top-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {panelContent}
        </div>
      </aside>
    </>
  )
}
