const HOTELBEDS_IMAGE_BASE = 'https://photos.hotelbeds.com/giata'

export function contentString(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'content' in value) {
    return String(value.content ?? '')
  }
  return String(value)
}

/**
 * Resolve the first usable image URL from Hotelbeds content `images` array.
 * @param {unknown[]} images
 * @returns {string | null}
 */
export function resolveHotelImageUrl(images) {
  if (!Array.isArray(images) || images.length === 0) return null

  const first = images[0]
  if (typeof first === 'string' && first.startsWith('http')) return first
  if (typeof first !== 'object' || first === null) return null

  const path = first.path ?? first.url ?? ''
  if (!path) return null
  if (typeof path === 'string' && path.startsWith('http')) return path

  const normalizedPath = String(path).startsWith('/') ? String(path) : `/${path}`
  return `${HOTELBEDS_IMAGE_BASE}${normalizedPath}`
}

/**
 * Turn Hotelbeds category codes (e.g. "4EST") into a readable label.
 * @param {string} categoryCode
 * @returns {string}
 */
export function formatCategoryLabel(categoryCode) {
  if (!categoryCode) return 'Rating unavailable'

  const starMatch = String(categoryCode).match(/^(\d)/)
  if (starMatch) {
    const stars = Number(starMatch[1])
    return `${stars} star${stars === 1 ? '' : 's'}`
  }

  return categoryCode
}

/**
 * @param {number} amount
 * @param {string} [currency]
 * @returns {string}
 */
export function formatPrice(amount, currency = '') {
  if (!Number.isFinite(amount) || amount <= 0) return 'Price on request'

  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return currency ? `${currency} ${formatted}` : formatted
}

/**
 * Map search + optional detail payloads into a stable card view model.
 * @param {object} hotel - Normalized availability hotel
 * @param {{ destinationName?: string, imageUrl?: string | null, facilityGroups?: number[] }} [extras]
 */
export function toHotelCardModel(hotel, extras = {}) {
  return {
    code: hotel.code,
    name: contentString(hotel.name) || 'Unnamed hotel',
    destinationCode: hotel.destinationCode,
    destinationLabel:
      extras.destinationName || contentString(hotel.destinationCode) || 'Unknown destination',
    categoryLabel: formatCategoryLabel(hotel.categoryCode),
    price: hotel.minRate,
    currency: hotel.currency,
    priceLabel: formatPrice(hotel.minRate, hotel.currency),
    imageUrl: extras.imageUrl ?? null,
    // Array of Hotelbeds facilityGroupCode integers from the content API.
    // Used by FilterSidebar to filter by Pool, WiFi, Gym, etc.
    facilityGroups: extras.facilityGroups ?? [],
  }
}
