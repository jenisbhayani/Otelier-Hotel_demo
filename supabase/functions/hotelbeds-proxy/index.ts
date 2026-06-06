import {createClient} from '@supabase/supabase-js'
import { buildHotelbedsHeaders } from '../_shared/hotelbeds-auth.ts'
import { corsHeaders, handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import {
  normalizeAvailability,
  normalizeCheckRates,
  normalizeDestinations,
  normalizeHotelDetails,
} from '../_shared/normalize.ts'

const HOTELBEDS_BASE_URL =
  Deno.env.get('HOTELBEDS_BASE_URL') ?? 'https://api.test.hotelbeds.com'

type Action = 'destinations' | 'searchHotels' | 'hotelDetails' | 'checkAvailability'

interface ProxyRequest {
  action?: Action
  params?: Record<string, unknown>
}

function fail(message: string, status = 400, code = 'BAD_REQUEST') {
  return jsonResponse({ success: false, error: { message, code, status } }, status)
}

function buildAvailabilityBody(params: Record<string, unknown>) {
  const {
    destinationCode,
    checkIn,
    checkOut,
    adults = 2,
    children = 0,
    childrenAges = [],
    rooms = 1,
    hotelCodes = [],
    minCategory,
    maxRate,
  } = params

  // Validate required fields
  if (!destinationCode && (!hotelCodes || (hotelCodes as string[]).length === 0)) {
    throw new Error('destinationCode or hotelCodes is required for searchHotels')
  }
  if (!checkIn || !checkOut) {
    throw new Error('checkIn and checkOut are required for searchHotels')
  }

  // Build occupancy object
  const occupancy: Record<string, unknown> = {
    rooms: Number(rooms),
    adults: Number(adults),
    children: Number(children),
  }

  const childCount = Number(children)
  if (childCount > 0) {
    if (!Array.isArray(childrenAges) || childrenAges.length !== childCount) {
      throw new Error(
        `childrenAges must be an array of ${childCount} age(s) when children > 0`,
      )
    }
    occupancy.paxes = (childrenAges as number[]).map((age) => ({
      type: 'CH',
      age: Number(age),
    }))
  }

  // Minimal required payload — matches the Hotelbeds Booking API spec exactly:
  // { stay, occupancies, destination } or { stay, occupancies, hotels }
  const body: Record<string, unknown> = {
    stay: { checkIn, checkOut },
    occupancies: [occupancy],
  }

  // Target by hotel code list OR destination code — never both
  if (hotelCodes && (hotelCodes as string[]).length > 0) {
    body.hotels = {
      hotel: (hotelCodes as Array<string | number>).map((code) => {
        const n = Number(code)
        return Number.isFinite(n) ? n : code
      }),
    }
  } else {
    // destination.code is the IATA/Hotelbeds destination code (e.g. "MAD", "1NI")
    body.destination = { code: destinationCode }
  }

  // Only add the filter block when explicitly requested by the caller.
  // Never send a default filter — an unsolicited filter can cause the
  // Hotelbeds sandbox to return 0 results or reject the request entirely.
  const hasExplicitFilter =
    minCategory != null || maxRate != null || params.maxHotels != null

  if (hasExplicitFilter) {
    const filter: Record<string, unknown> = {}
    if (params.maxHotels != null) filter.maxHotels = Number(params.maxHotels)
    if (minCategory != null) filter.minCategory = Number(minCategory)
    if (maxRate != null) filter.maxRate = Number(maxRate)
    body.filter = filter
  }

  return body
}

async function callHotelbeds(
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: Record<string, unknown>,
) {
  const url = `${HOTELBEDS_BASE_URL}${path}`
  console.log(`[hotelbeds-proxy] ${method} ${url}`)

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let parsed: Record<string, unknown> = {}
  try {
    parsed = text ? JSON.parse(text) : {}
  } catch {
    parsed = { raw: text }
  }

  console.log(
    `[hotelbeds-proxy] Response ${response.status} from ${method} ${path}:`,
    JSON.stringify(parsed).slice(0, 500),
  )

  if (!response.ok) {
    const apiError = (parsed?.error as Record<string, unknown>) ?? parsed
    const errObj = {
      status: response.status,
      message: String(
        apiError?.message ?? apiError?.error ?? `Hotelbeds request failed (${response.status})`,
      ),
      code: String(apiError?.code ?? 'HOTELBEDS_ERROR'),
      details: parsed,
    }
    console.error('[hotelbeds-proxy] Hotelbeds API error:', JSON.stringify(errObj))
    throw errObj
  }

  return parsed
}

async function handleAction(
  action: Action,
  params: Record<string, unknown>,
  headers: Record<string, string>,
) {
  switch (action) {
    case 'destinations': {
      const query = new URLSearchParams({
        fields: String(params.fields ?? 'all'),
        language: String(params.language ?? 'ENG'),
      })
      if (params.countryCodes) query.set('countryCodes', String(params.countryCodes))
      if (params.codes) query.set('codes', String(params.codes))
      if (params.from != null) query.set('from', String(params.from))
      if (params.to != null) query.set('to', String(params.to))

      const data = await callHotelbeds(
        'GET',
        `/hotel-content-api/1.0/locations/destinations?${query}`,
        headers,
      )
      return normalizeDestinations(data as { destinations: Array<Record<string, unknown>> })
    }

    case 'hotelDetails': {
      const codes = params.codes ?? params.hotelCodes
      if (!codes || (Array.isArray(codes) && codes.length === 0)) {
        throw new Error('codes (hotel code list) is required for hotelDetails')
      }
      const codeList = Array.isArray(codes) ? codes.join(',') : String(codes)
      const query = new URLSearchParams({
        codes: codeList,
        fields: String(params.fields ?? 'all'),
        language: String(params.language ?? 'ENG'),
      })
      if (params.from != null) query.set('from', String(params.from))
      if (params.to != null) query.set('to', String(params.to))

      const data = await callHotelbeds(
        'GET',
        `/hotel-content-api/1.0/hotels?${query}`,
        headers,
      )
      return normalizeHotelDetails(data as { hotels?: Array<Record<string, unknown>> })
    }

    case 'searchHotels': {
      const body = buildAvailabilityBody(params)
      const data = await callHotelbeds('POST', '/hotel-api/1.0/hotels', headers, body)
      return normalizeAvailability(data as Record<string, unknown>)
    }

    case 'checkAvailability': {
      const rawKeys = params.rateKeys ?? params.rateKey
      if (!rawKeys || (Array.isArray(rawKeys) && rawKeys.length === 0)) {
        throw new Error('rateKeys array is required for checkAvailability')
      }

      const rateKeys = Array.isArray(rawKeys) ? rawKeys : [rawKeys]
      const rooms = rateKeys.map((rateKey) => ({
        rateKey: String(rateKey),
      }))

      const data = await callHotelbeds('POST', '/hotel-api/1.0/checkrates', headers, { rooms })
      return normalizeCheckRates(data as Record<string, unknown>)
    }

    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return fail('Method not allowed. Use POST.', 405, 'METHOD_NOT_ALLOWED')
  }

  const apiKey = Deno.env.get('HOTELBEDS_API_KEY')
  const secret = Deno.env.get('HOTELBEDS_SECRET')
  if (!apiKey || !secret) {
    return fail('Hotelbeds credentials are not configured on the server.', 500, 'CONFIG_ERROR')
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return fail('Missing or invalid Authorization header.', 401, 'UNAUTHORIZED')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    return fail('Supabase environment is not configured.', 500, 'CONFIG_ERROR')
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    return fail('Invalid or expired session.', 401, 'UNAUTHORIZED')
  }

  let payload: ProxyRequest
  try {
    payload = await req.json()
  } catch {
    return fail('Invalid JSON body.', 400, 'INVALID_JSON')
  }

  const action = payload.action
  const params = payload.params ?? {}

  const validActions: Action[] = [
    'destinations',
    'searchHotels',
    'hotelDetails',
    'checkAvailability',
  ]
  if (!action || !validActions.includes(action)) {
    return fail(
      `Invalid action. Expected one of: ${validActions.join(', ')}`,
      400,
      'INVALID_ACTION',
    )
  }

  try {
    const hotelbedsHeaders = await buildHotelbedsHeaders(apiKey, secret)
    const data = await handleAction(action, params, hotelbedsHeaders)
    return jsonResponse({ success: true, data })
  } catch (err) {
    const known = err as {
      status?: number
      message?: string
      code?: string
      details?: unknown
    }
    if (known.status) {
      return jsonResponse(
        {
          success: false,
          error: {
            message: known.message ?? 'Hotelbeds API error',
            code: known.code ?? 'HOTELBEDS_ERROR',
            status: known.status,
            details: known.details,
          },
        },
        known.status >= 400 && known.status < 600 ? known.status : 502,
      )
    }

    return fail(
      known.message ?? (err instanceof Error ? err.message : 'Unexpected proxy error'),
      500,
      'PROXY_ERROR',
    )
  }
})
