import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

const FUNCTION_NAME = 'hotelbeds-proxy'

// Destinations are static content — cache for 7 days to save API quota.
const DESTINATIONS_TTL_MS = 1000 * 60 * 60 * 24 * 7
// Hotel availability prices change frequently — keep cache short.
const SEARCH_TTL_MS = 1000 * 60 * 30 // 30 minutes
// Hotel static details (images, descriptions) — moderate cache.
const DETAILS_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours

// Actions that are cacheable and their TTLs
const CACHE_CONFIG = new Map([
  ['destinations', DESTINATIONS_TTL_MS],
  ['searchHotels', SEARCH_TTL_MS],
  ['hotelDetails', DETAILS_TTL_MS],
])
function stableStringify(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return '{' +
      Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
        .join(',') +
      '}'
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']'
  }
  return JSON.stringify(value)
}

function canUseLocalStorage() {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

export function getCacheKey(action, params) {
  return `hotelbeds-cache:${action}:${stableStringify(params ?? {})}`
}

function getCachedData(key) {
  if (!canUseLocalStorage()) return null

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null

    const entry = JSON.parse(raw)
    if (!entry || typeof entry !== 'object') return null

    // Enforce TTL — discard expired entries
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      window.localStorage.removeItem(key)
      return null
    }

    return entry.data ?? null
  } catch {
    return null
  }
}

function resolveCachedResponse(action, cachedData) {
  if (!cachedData || typeof cachedData !== 'object') return null

  if (action === 'destinations') {
    // Normalizer returns { destinations: [...] }
    if (Array.isArray(cachedData.destinations)) return cachedData
    if (cachedData.data && Array.isArray(cachedData.data.destinations)) return cachedData.data
    if (Array.isArray(cachedData)) return { destinations: cachedData }
  }

  if (action === 'searchHotels') {
    // normalizeAvailability returns { hotels: [...], auditData, total }
    if (Array.isArray(cachedData.hotels)) return cachedData
    if (cachedData.data && Array.isArray(cachedData.data.hotels)) return cachedData.data
  }

  if (action === 'hotelDetails') {
    // normalizeHotelDetails returns { hotels: [...] }
    if (Array.isArray(cachedData.hotels)) return cachedData
    if (cachedData.data && Array.isArray(cachedData.data.hotels)) return cachedData.data
  }

  return null
}

function setCachedData(key, data, ttl) {
  if (!canUseLocalStorage()) return

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ data, expiresAt: Date.now() + ttl }),
    )
  } catch {
    // Ignore storage failures; caching is best-effort.
  }
}

/**
 * Custom error for Hotelbeds / proxy failures (interview-friendly, single catch type).
 */
export class HotelbedsError extends Error {
  constructor(message, { code, status, details } = {}) {
    super(message)
    this.name = 'HotelbedsError'
    this.code = code ?? 'UNKNOWN'
    this.status = status ?? 0
    this.details = details ?? null
  }
}

/**
 * Parse `{ success, error }` JSON from a non-2xx Edge Function response.
 * @param {import('@supabase/supabase-js').FunctionsError} invokeError
 */
async function parseProxyErrorBody(invokeError) {
  const response = invokeError?.context
  if (response && typeof response.json === 'function') {
    try {
      const body = await response.json()
      if (body?.error) {
        return {
          message: body.error.message ?? 'Hotel search request failed.',
          code: body.error.code ?? 'PROXY_ERROR',
          status: body.error.status ?? response.status ?? 0,
          details: body.error.details ?? null,
        }
      }
    } catch {
      // Response body was not JSON; fall through to generic message.
    }
  }

  return {
    message:
      invokeError?.message ??
      (invokeError instanceof FunctionsHttpError
        ? 'Hotel search service returned an error.'
        : 'Failed to reach hotel search service.'),
    code: invokeError?.name ?? 'INVOKE_ERROR',
    status: response?.status ?? 0,
    details: invokeError ?? null,
  }
}

/**
 * Invoke the Supabase Edge Function proxy. Never touches Hotelbeds secrets or signatures.
 *
 * @param {string} action - destinations | searchHotels | hotelDetails
 * @param {object} [params] - Action-specific parameters
 * @returns {Promise<object>} Normalized `data` payload from the proxy
 */
export async function hotelbedsCall(action, params = {}) {
  const cacheTtl = CACHE_CONFIG.get(action) ?? null
  const cacheKey = getCacheKey(action, params)

  if (cacheTtl !== null) {
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      const resolved = resolveCachedResponse(action, cachedData)
      if (resolved) {
        if (import.meta.env.DEV) console.log(`[Hotelbeds] Cache hit for ${action}`)
        return resolved
      }
      // Cached data exists but shape doesn't match — evict and re-fetch
      if (import.meta.env.DEV) console.warn(`[Hotelbeds] Evicting malformed cache entry for ${action}`)
      try { window.localStorage.removeItem(cacheKey) } catch { /* ignore */ }
    }
  }

  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData?.session) {
    throw new HotelbedsError('You must be logged in to search hotels.', {
      code: 'UNAUTHORIZED',
      status: 401,
    })
  }

  if (import.meta.env.DEV) console.log(`[Hotelbeds] Calling edge function: ${action}`, params)
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action, params },
  })

  if (error) {
    const apiError = await parseProxyErrorBody(error)
    if (import.meta.env.DEV) console.error(`[Hotelbeds] Invoke error for ${action}:`, apiError)
    throw new HotelbedsError(apiError.message, apiError)
  }

  if (!data?.success) {
    const apiError = data?.error ?? {}
    if (import.meta.env.DEV) console.error(`[Hotelbeds] Proxy error for ${action}:`, data)
    throw new HotelbedsError(apiError.message ?? 'Hotel search request failed.', {
      code: apiError.code ?? 'PROXY_ERROR',
      status: apiError.status ?? 0,
      details: apiError.details ?? null,
    })
  }

  const responseData = data.data

  if (cacheTtl !== null) {
    setCachedData(cacheKey, responseData, cacheTtl)
  }

  return responseData
}

/** @param {{ countryCodes?: string, language?: string, fields?: string, codes?: string, from?: number, to?: number }} params */
export function getDestinations(params = {}) {
  return hotelbedsCall('destinations', params)
}

/**
 * Synchronously read the destinations list from the localStorage cache.
 * Returns an already-sorted array if the cache is valid and unexpired,
 * or null if the cache is absent / expired / malformed.
 *
 * Use this to seed useState() so there is no loading flash on repeat visits.
 *
 * @param {object} params - The same params object passed to getDestinations()
 * @returns {Array|null}
 */
export function getDestinationsCached(params = {}) {
  const key = getCacheKey('destinations', params)
  const raw = getCachedData(key)
  if (!raw) return null
  const resolved = resolveCachedResponse('destinations', raw)
  if (!resolved || !Array.isArray(resolved.destinations)) return null
  return resolved.destinations
}

/**
 * Search hotel availability (Booking API).
 * @param {{
 *   destinationCode?: string,
 *   hotelCodes?: string[],
 *   checkIn: string,
 *   checkOut: string,
 *   adults?: number,
 *   children?: number,
 *   childrenAges?: number[],
 *   rooms?: number,
 *   minCategory?: number,
 *   maxRate?: number,
 *   maxHotels?: number,
 * }} params
 */
export function searchHotels(params) {
  return hotelbedsCall('searchHotels', params)
}

/** @param {{ codes: string[] | string, hotelCodes?: string[] | string, language?: string, fields?: string }} params */
export function getHotelDetails(params) {
  const codes = params.codes ?? params.hotelCodes
  return hotelbedsCall('hotelDetails', { ...params, codes })
}
