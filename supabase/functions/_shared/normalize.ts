/** Normalized shapes returned to the React app (stable contract). */

import { contentString, parseAmount } from './helpers.ts'

function normalizeRate(rate: Record<string, unknown>) {
  return {
    rateKey: String(rate.rateKey ?? ''),
    rateClass: String(rate.rateClass ?? ''),
    rateType: String(rate.rateType ?? ''),
    net: parseAmount(rate.net),
    sellingRate: parseAmount(rate.sellingRate ?? rate.net),
    boardCode: String(rate.boardCode ?? ''),
    boardName: String(rate.boardName ?? ''),
    cancellationPolicies: rate.cancellationPolicies ?? [],
    rooms: Number(rate.rooms ?? 1),
    adults: Number(rate.adults ?? 2),
    children: Number(rate.children ?? 0),
  }
}

function normalizeRooms(rooms: unknown[]) {
  return rooms.map((room: Record<string, unknown>) => ({
    code: String(room.code ?? ''),
    name: String(room.name ?? ''),
    rates: ((room.rates as unknown[]) ?? []).map((rate) =>
      normalizeRate(rate as Record<string, unknown>),
    ),
  }))
}

export function normalizeDestinations(payload: {
  destinations?: Array<Record<string, unknown>>
}) {
  const list = payload?.destinations ?? (Array.isArray(payload) ? payload : [])
  return {
    destinations: list.map((d) => ({
      code: String(d.code ?? ''),
      name: contentString(d.name),
      countryCode: String(d.countryCode ?? ''),
    })),
  }
}

export function normalizeHotelDetails(payload: {
  hotels?: Array<Record<string, unknown>>
}) {
  const hotels = (payload?.hotels ?? []).map((hotel) => ({
    code: String(hotel.code ?? ''),
    name: contentString(hotel.name),
    description: contentString(hotel.description),
    categoryCode: String(hotel.categoryCode ?? ''),
    destinationCode: String(hotel.destinationCode ?? ''),
    address: hotel.address ?? null,
    coordinates: hotel.coordinates ?? null,
    images: hotel.images ?? [],
    facilities: hotel.facilities ?? [],
  }))
  return { hotels }
}

export function normalizeAvailability(payload: Record<string, unknown>) {
  // Hotelbeds Booking API v1 shape:
  // { hotels: { hotels: [...], total: N, checkIn, checkOut }, auditData: {...} }
  // Some sandbox responses may differ — handle both shapes defensively.
  const hotelsWrapper = payload?.hotels as Record<string, unknown> | undefined
  let rawHotels: unknown[] = []

  if (Array.isArray(hotelsWrapper)) {
    // Flat array at top level (rare but guard it)
    rawHotels = hotelsWrapper
  } else if (hotelsWrapper && Array.isArray(hotelsWrapper.hotels)) {
    rawHotels = hotelsWrapper.hotels as unknown[]
  } else if (Array.isArray(payload?.hotels)) {
    rawHotels = payload.hotels as unknown[]
  }

  const hotels = rawHotels.map((item: Record<string, unknown>) => {
    // Each item IS the hotel object directly in the Hotelbeds API response.
    // Rooms are nested inside each hotel as hotel.rooms[]
    const rooms = normalizeRooms((item.rooms as unknown[]) ?? [])

    return {
      code: String(item.code ?? ''),
      name: contentString(item.name),
      categoryCode: String(item.categoryCode ?? ''),
      destinationCode: String(item.destinationCode ?? ''),
      latitude: Number(item.latitude ?? 0),
      longitude: Number(item.longitude ?? 0),
      minRate: parseAmount(item.minRate),
      maxRate: parseAmount(item.maxRate),
      currency: String(item.currency ?? ''),
      rooms,
    }
  })

  return {
    hotels,
    auditData: payload?.auditData ?? null,
    total: hotels.length,
  }
}

export function normalizeCheckRates(payload: Record<string, unknown>) {
  const hotel = (payload?.hotel as Record<string, unknown>) ?? {}
  const rooms = normalizeRooms((hotel.rooms as unknown[]) ?? [])

  return {
    hotel: {
      code: String(hotel.code ?? ''),
      name: contentString(hotel.name),
      rooms,
    },
    auditData: payload?.auditData ?? null,
  }
}
