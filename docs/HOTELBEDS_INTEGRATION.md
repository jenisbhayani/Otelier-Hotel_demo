# Hotelbeds integration (Phase 2)

## Architecture review (before implementation)

### What works well for this assignment

| Decision | Why |
|----------|-----|
| **Supabase Edge Function proxy** | Keeps `HOTELBEDS_API_KEY` / `HOTELBEDS_SECRET` off the client; satisfies rubric security story. |
| **Action-based proxy** (`destinations`, `searchHotels`, …) | Stable contract; frontend does not build raw Hotelbeds paths. |
| **JWT verification in the function** | Only logged-in users consume paid API quota. |
| **Normalized JSON responses** | UI depends on a small shape, not full Hotelbeds payloads. |
| **Single `hotelbedsCall()` + named helpers** | DRY, easy to mock in tests/interviews. |

### Suggested improvements (optional, later phases)

1. **Rate limiting** — Simple per-user throttle in the Edge Function (e.g. Deno KV or Supabase table) to avoid accidental quota burn during demos.
2. **Request logging** — Log `action` + `user.id` + latency (never log secrets or full card data).
3. **Caching destinations** — `getDestinations` changes rarely; cache in memory for 24h inside the function to reduce Content API calls.
4. **`HotelsContext`** — Wrap search results + compare selection in Context (assignment requirement) instead of prop-drilling from Dashboard only.
5. **Typed params (JSDoc or TS)** — Already started with JSDoc on `hotelbeds.js`; migrate to TypeScript if the project grows.
6. **Vite dev proxy** — Not needed when using `functions.invoke`; keep all traffic through Supabase.
7. **Production base URL** — Set secret `HOTELBEDS_BASE_URL=https://api.hotelbeds.com` when going live; test uses `https://api.test.hotelbeds.com`.

### Data flow

```
React (authenticated)
  → supabase.functions.invoke('hotelbeds-proxy', { action, params })
    → Edge Function verifies JWT
    → Builds X-Signature (Api-key + Secret + timestamp)
    → Hotelbeds Booking API / Content API
    → normalize*()
  ← { success, data } | { success: false, error }
```

---

## Environment variables

### Frontend (`.env` — already used for Supabase)

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-or-publishable-key>
```

No Hotelbeds variables on the frontend.

### Supabase Edge Function secrets

Set via CLI (never commit):

```bash
supabase secrets set HOTELBEDS_API_KEY=your_api_key
supabase secrets set HOTELBEDS_SECRET=your_secret
# Optional: production/live API host
supabase secrets set HOTELBEDS_BASE_URL=https://api.test.hotelbeds.com
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically when the function runs in Supabase.

---

## Deployment steps

### 1. Install Supabase CLI

https://supabase.com/docs/guides/cli

### 2. Login and link project

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

### 3. Create function (if not already in repo)

```bash
supabase functions new hotelbeds-proxy
```

This repo already includes `supabase/functions/hotelbeds-proxy/index.ts`.

### 4. Set secrets

```bash
supabase secrets set HOTELBEDS_API_KEY=your_api_key
supabase secrets set HOTELBEDS_SECRET=your_secret
supabase secrets set HOTELBEDS_BASE_URL=https://api.test.hotelbeds.com
```

### 5. Deploy

```bash
supabase functions deploy hotelbeds-proxy
```

### 6. Verify

With a logged-in app session, call from browser console or a temporary button:

```javascript
import { getDestinations } from './api/hotelbeds'
const result = await getDestinations({ countryCodes: 'US', language: 'ENG' })
console.log(result.destinations)
```

---

## Frontend usage

```javascript
import {
  searchHotels,
  getHotelDetails,
  getDestinations,
  checkAvailability,
  HotelbedsError,
} from '../api/hotelbeds'

// Destinations for filter dropdown
const { destinations } = await getDestinations({
  countryCodes: 'ES',
  language: 'ENG',
})

// Availability search
const { hotels, total } = await searchHotels({
  destinationCode: 'PMI',
  checkIn: '2026-08-01',
  checkOut: '2026-08-05',
  adults: 2,
  children: 0,
  rooms: 1,
})

// Static content for hotel cards
const { hotels: details } = await getHotelDetails({ codes: ['1234', '5678'] })

// When a rate has rateType RECHECK
const recheck = await checkAvailability({
  rateKeys: ['<rateKey-from-search>'],
})

try {
  // ...
} catch (err) {
  if (err instanceof HotelbedsError) {
    console.error(err.message, err.code, err.status)
  }
}
```

---

## Proxy actions reference

| Action | Hotelbeds API | Method |
|--------|---------------|--------|
| `destinations` | `/hotel-content-api/1.0/locations/destinations` | GET |
| `hotelDetails` | `/hotel-content-api/1.0/hotels` | GET |
| `searchHotels` | `/hotel-api/1.0/hotels` | POST |
| `checkAvailability` | `/hotel-api/1.0/checkrates` | POST |

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| 401 from proxy | User logged in? JWT sent automatically by `supabase.functions.invoke`? |
| Signature verification failed | Server clock skew; verify API key matches **Hotel** API (not Activities/Transfers). |
| Empty destinations | Use test credentials; try `countryCodes` + `language=ENG`. |
| CORS errors | Function must return `corsHeaders`; redeploy after changes. |
