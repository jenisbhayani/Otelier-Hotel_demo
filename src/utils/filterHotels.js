/**
 * Client-side hotel filtering utilities.
 * Pure functions — no side effects, easy to unit-test.
 */

// ─── Facility mapping ─────────────────────────────────────────────────────────
// Maps Hotelbeds facilityGroupCode numbers to human-readable display names.
// Each display name covers one or more group codes (e.g. both outdoor + indoor pools).

const FACILITY_GROUP_MAP = {
  Pool:       new Set([70, 72, 73, 74]),
  Gym:        new Set([75]),
  Spa:        new Set([76]),
  Restaurant: new Set([77]),
  Bar:        new Set([78]),
  Parking:    new Set([81]),
  WiFi:       new Set([85]),
}

/** Convert a Hotelbeds facilityGroupCode to a display name, or null if unmapped. */
function groupCodeToLabel(groupCode) {
  for (const [label, codes] of Object.entries(FACILITY_GROUP_MAP)) {
    if (codes.has(groupCode)) return label
  }
  return null
}

// ─── Filter shape ─────────────────────────────────────────────────────────────

/** The zero/empty state for all filters. */
export const EMPTY_FILTERS = Object.freeze({
  name: '',            // free-text hotel name search
  stars: new Set(),   // Set<number> — selected star ratings (1-5)
  facilities: new Set(), // Set<string> — selected facility display names
  destinations: new Set(), // Set<string> — selected destinationCode values
})

// ─── Derivation ───────────────────────────────────────────────────────────────

/**
 * Scan the full hotel array and derive what filter options are actually available.
 * Runs once after search — only facilities/destinations that exist in results are shown.
 *
 * @param {object[]} hotels - Full card model array
 * @returns {{ stars: number[], facilities: string[], destinations: { code: string, label: string }[] }}
 */
export function deriveFilterOptions(hotels) {
  const starSet = new Set()
  const facilitySet = new Set()
  const destinationMap = new Map()

  for (const hotel of hotels) {
    // Star ratings from categoryLabel ("4 stars" → 4)
    const stars = parseStars(hotel.categoryLabel)
    if (stars > 0) starSet.add(stars)

    // Facilities from facilityGroups (array of group codes stored on card model)
    for (const code of hotel.facilityGroups ?? []) {
      const label = groupCodeToLabel(code)
      if (label) facilitySet.add(label)
    }

    // Destinations — keyed by code so each appears once
    if (hotel.destinationCode && !destinationMap.has(hotel.destinationCode)) {
      destinationMap.set(hotel.destinationCode, hotel.destinationLabel || hotel.destinationCode)
    }
  }

  return {
    stars: [...starSet].sort((a, b) => a - b),
    facilities: [...facilitySet].sort(),
    destinations: [...destinationMap.entries()].map(([code, label]) => ({ code, label })),
  }
}

// ─── Filtering ────────────────────────────────────────────────────────────────

/**
 * Apply all active filters to the hotel array.
 * Filters combine with AND (hotel must pass every active filter).
 * Within a filter type (e.g. multi-select stars), hotel passes if it matches ANY selection.
 *
 * Returns the original array reference when no filters are active (avoids useMemo churn).
 *
 * @param {object[]} hotels
 * @param {{ name: string, stars: Set<number>, facilities: Set<string>, destinations: Set<string> }} filters
 * @returns {object[]}
 */
export function applyFilters(hotels, filters) {
  const { name, stars, facilities, destinations } = filters

  const hasName = name.trim().length > 0
  const hasStars = stars.size > 0
  const hasFacilities = facilities.size > 0
  const hasDestinations = destinations.size > 0

  // Bail early — no copy needed when nothing is active
  if (!hasName && !hasStars && !hasFacilities && !hasDestinations) return hotels

  const nameQuery = name.trim().toLowerCase()

  return hotels.filter((hotel) => {
    // 1. Name — case-insensitive substring match
    if (hasName && !hotel.name.toLowerCase().includes(nameQuery)) return false

    // 2. Star rating — hotel must match one of the selected star values
    if (hasStars && !stars.has(parseStars(hotel.categoryLabel))) return false

    // 3. Facilities — hotel must have ALL selected facilities (AND logic)
    if (hasFacilities) {
      for (const facilityName of facilities) {
        const requiredCodes = FACILITY_GROUP_MAP[facilityName]
        if (!requiredCodes) continue
        const hotelHasFacility = (hotel.facilityGroups ?? []).some((c) => requiredCodes.has(c))
        if (!hotelHasFacility) return false
      }
    }

    // 4. Destination — hotel must match one of the selected destination codes
    if (hasDestinations && !destinations.has(hotel.destinationCode)) return false

    return true
  })
}

/** Parse "4 stars" → 4, "1 star" → 1, anything else → 0 */
export function parseStars(categoryLabel) {
  const match = String(categoryLabel ?? '').match(/^(\d)/)
  return match ? Number(match[1]) : 0
}

/** True if every filter Set is empty and name is blank. */
export function isFiltersEmpty(filters) {
  return (
    filters.name === '' &&
    filters.stars.size === 0 &&
    filters.facilities.size === 0 &&
    filters.destinations.size === 0
  )
}
