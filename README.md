# Otelier — Hotel Search & Compare

A production-quality hospitality frontend built as a technical assignment. Users can search hotel availability by destination, dates and occupancy, filter results client-side, and compare up to five properties side-by-side with Recharts visualisations.

> **Live demo:** [https://otelier-hotel-demo.vercel.app/](https://otelier-hotel-demo.vercel.app/)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite |
| Routing | React Router v6 |
| Auth & DB | Supabase (email/password, JWT) |
| API proxy | Supabase Edge Functions (Deno) |
| Hotel data | Hotelbeds Availability & Content APIs |
| Charts | Recharts |
| Styling | Tailwind CSS |
| Language | JavaScript (JSX) + TypeScript (edge functions) |

---

## Features

- **Authentication** — email/password signup and login via Supabase; email confirmation flow; protected and guest-only routes
- **Hotel search** — search by destination, check-in, check-out, and number of adults
- **Rich result cards** — hotel image, name, city, star rating, minimum nightly price
- **Filter sidebar** — filter by hotel name, star rating, facilities (Pool, Gym, WiFi, Restaurant, Parking, Spa, Bar) and destination; desktop sticky column, mobile collapsible panel
- **Load More pagination** — 10 hotels revealed at a time from an already-fetched result set; no repeat API calls
- **Hotel comparison** — select up to 5 hotels, persist selection to localStorage across page navigations
- **Compare page** — side-by-side attribute table + price bar chart + star rating bar chart (Recharts)
- **Security** — Hotelbeds API credentials never reach the browser; all requests are proxied through a Supabase Edge Function with HMAC-SHA256 signing

---

## Architecture

### The Edge Function Proxy — most important decision

Hotelbeds requires every request to carry an HMAC-SHA256 signature derived from the API key and secret. Doing this client-side would expose both secrets in the browser.

Instead, all hotel API calls go through a Supabase Edge Function (`hotelbeds-proxy`):

```
Browser (React)
  │  POST /functions/v1/hotelbeds-proxy
  │  Authorization: Bearer <supabase-jwt>        ← user's session token
  │  Body: { action: "searchHotels", params: {...} }
  ▼
Supabase Edge Function (Deno)
  │  1. Validates the JWT with supabase.auth.getUser()
  │  2. Reads HOTELBEDS_API_KEY + HOTELBEDS_SECRET from env
  │  3. Builds X-Signature = SHA256(apiKey + secret + unixTimestamp)
  │  4. Forwards request to api.test.hotelbeds.com
  ▼
Hotelbeds API
  │  Returns availability / hotel content
  ▼
Edge Function normalises the response → returns { success: true, data: {...} }
  ▼
Browser renders results
```

This means:
- Zero secrets in client bundles or network requests from the browser
- JWT validation on every proxy call — unauthenticated requests are rejected at the edge
- Response normalisation in one place (`_shared/normalize.ts`) so the React app has a stable contract regardless of Hotelbeds API shape changes

### State management

**Context API** was chosen over Redux because the app has two clearly-bounded state domains:

| Context | Owns | Persisted |
|---|---|---|
| `AuthContext` | Supabase session, user, sign-in/sign-up/sign-out | Supabase SDK (cookies/localStorage) |
| `CompareContext` | Hotel comparison selection (Map of card models) | `localStorage` with sign-out cleanup |

Redux would add boilerplate without meaningful benefit at this scope.

### Client-side caching

To preserve limited API quota, responses are cached in `localStorage` with tiered TTLs:

| Action | TTL | Rationale |
|---|---|---|
| `destinations` | 7 days | Static geographic content |
| `hotelDetails` | 24 hours | Images/facilities rarely change |
| `searchHotels` | 30 minutes | Prices are date-sensitive |

The destinations list is read synchronously on first render (lazy `useState` initializer) to eliminate any loading flash on repeat visits.

### Filtering architecture

Filters operate entirely on the already-fetched hotel array — **no API calls on filter change**.

```
Search API (once) → hotels[]          ← never mutated
                        ↓
          useHotelFilters(hotels)      ← memoized, pure functions
                        ↓
          filteredHotels[]
                        ↓
          useLoadMore(filteredHotels)  ← auto-resets to 10 on filter change
                        ↓
          visibleHotels[] → HotelList
```

Filter logic lives in `utils/filterHotels.js` as pure functions with no React dependencies — straightforward to unit test in isolation.

### Load More over infinite scroll

Infinite scroll was deliberately avoided because this is a **comparison workflow**: users need to scan the full list, check multiple cards, and select items. Infinite scroll makes it harder to get back to a card once it has scrolled past. Load More keeps every loaded card accessible and makes the total visible clearly ("Showing 20 of 42 hotels").

### Compare selection persistence

`CompareContext` rehydrates from `localStorage` on mount. On sign-out, it subscribes to `supabase.auth.onAuthStateChange` and clears both the in-memory Map and the storage key — preventing one user's selection from leaking to the next user on the same device.

---

## Setup

### Prerequisites

- Node.js ≥ 18
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`)
- A [Hotelbeds developer account](https://developer.hotelbeds.com/) (sandbox keys are free)

### 1. Clone and install

```bash
git clone https://github.com/your-username/otelier-hotel-search.git
cd otelier-hotel-search
npm install
```

### 2. Create environment variables

```bash
cp .env.example .env
```

Fill in `.env` with your values (see table below).

### 3. Start the Supabase local stack

```bash
supabase start
```

This starts a local Postgres instance, Auth server, and Edge Function runtime.

### 4. Set edge function secrets

```bash
supabase secrets set HOTELBEDS_API_KEY=your_api_key
supabase secrets set HOTELBEDS_SECRET=your_secret
supabase secrets set HOTELBEDS_BASE_URL=https://api.test.hotelbeds.com
```

### 5. Deploy the edge function (local)

```bash
supabase functions serve hotelbeds-proxy --env-file .env.local
```

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Deploying to production (Supabase Cloud)

```bash
supabase functions deploy hotelbeds-proxy
```

Set the same secrets in your Supabase project dashboard under **Project Settings → Edge Functions → Secrets**.

---

## Environment Variables

Create a `.env` file at the project root:

```env
# .env.example

# Supabase project URL (found in Project Settings → API)
VITE_SUPABASE_URL=https://your-project.supabase.co

# Supabase anon/public key (safe to expose — no elevated privileges)
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> **Never put** `HOTELBEDS_API_KEY` or `HOTELBEDS_SECRET` in `.env`. These are set as Supabase **secrets** (server-side only) and are never visible to the browser.

| Variable | Where set | Exposed to browser |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env` | ✅ Yes (safe) |
| `VITE_SUPABASE_ANON_KEY` | `.env` | ✅ Yes (safe) |
| `HOTELBEDS_API_KEY` | Supabase secrets | ❌ No |
| `HOTELBEDS_SECRET` | Supabase secrets | ❌ No |
| `HOTELBEDS_BASE_URL` | Supabase secrets | ❌ No |

---

## Folder Structure

```
src/
├── api/
│   └── hotelbeds.js          # hotelbedsCall(), localStorage cache, HotelbedsError
│
├── components/
│   ├── FilterSidebar.jsx     # Desktop: sticky left col. Mobile: collapsible toggle
│   ├── HotelCard.jsx         # Card + compare checkbox
│   ├── HotelList.jsx         # Loading / empty / error states + Load More button
│   ├── SearchForm.jsx        # Destination dropdown, date pickers, adults input
│   └── charts/
│       ├── PriceComparisonChart.jsx
│       ├── RatingComparisonChart.jsx
│       └── chartShared.jsx   # Shared: ChartEmptyState, HotelNameTick
│
├── context/
│   ├── AuthContext.jsx       # Supabase session + signUp/signIn/signOut
│   └── CompareContext.jsx    # Selection Map, localStorage persistence, sign-out cleanup
│
├── hooks/
│   ├── useAuth.js            # Thin consumer of AuthContext
│   ├── useHotelFilters.js    # Filter state + memoized applyFilters
│   └── usePagination.js      # useLoadMore — auto-resets on items change
│
├── pages/
│   ├── Dashboard.jsx         # Search + filter sidebar + hotel list (wired together)
│   ├── Compare.jsx           # Table + two Recharts charts
│   ├── Login.jsx
│   └── Signup.jsx
│
├── routes/
│   ├── ProtectedRoute.jsx    # Redirects to /login if no session
│   ├── GuestRoute.jsx        # Redirects to /dashboard if already logged in
│   └── RootRedirect.jsx      # / → /dashboard or /login based on auth state
│
└── utils/
    ├── filterHotels.js       # applyFilters(), deriveFilterOptions() — pure functions
    └── hotelDisplay.js       # toHotelCardModel(), formatPrice(), contentString()

supabase/
└── functions/
    ├── hotelbeds-proxy/
    │   └── index.ts          # JWT validation, action routing, request builder
    └── _shared/
        ├── hotelbeds-auth.ts # HMAC-SHA256 X-Signature header
        ├── normalize.ts      # normalizeAvailability(), normalizeDestinations()
        ├── helpers.ts        # parseAmount(), contentString()
        └── cors.ts           # CORS preflight + jsonResponse()
```

---

## Assumptions & Tradeoffs

| Decision | Rationale |
|---|---|
| Max 5 hotels in compare list | More than 5 bars on a Recharts chart becomes unreadable; 5 is also a natural cognitive limit for comparison |
| Prices shown are minimum nightly rates | Hotelbeds returns `minRate` per hotel across all room types — a reasonable headline figure without needing to enumerate all rooms |
| Hotelbeds sandbox environment | Production keys require a commercial agreement; the sandbox behaves identically for development purposes |
| Destinations cached for 7 days | Geographic data is static; fetching it on every visit would waste quota unnecessarily |
| Facilities mapped by `facilityGroupCode` | Hotelbeds returns numeric codes, not strings; a local mapping table covers the most common categories (Pool, Gym, WiFi, etc.) |
| Two API calls per search | `searchHotels` (Booking API) and `hotelDetails` (Content API) use separate rate limit pools, so both can be called without doubling quota consumption |

---

## What I Would Add With More Time

**Testing**
- Unit tests for `filterHotels.js` and `hotelDisplay.js` with Vitest — pure functions make this straightforward
- Integration tests for `hotelbedsCall` with mocked Supabase `functions.invoke`
- End-to-end tests with Playwright covering the full search → filter → compare flow

**Security & reliability**
- Rate limiting on the edge function (token bucket per user ID) to prevent quota exhaustion from a single bad actor
- Request validation with Zod on the edge function's `params` input before forwarding to Hotelbeds
- Retry logic with exponential backoff for transient Hotelbeds API errors

**UX improvements**
- Skeleton loading cards instead of a full-page spinner — perceived performance improvement
- URL-synced filters (push filter state to query params) so users can share or bookmark a filtered view
- Optimistic UI for the compare checkbox — toggle responds instantly, rolls back on error
- `react-window` virtualised list for very large result sets (100+ hotels)

**Product features**
- Price sort and sort-by-star controls
- Map view alongside the list (Leaflet or Mapbox) using hotel `latitude`/`longitude`
- Save searches to a Supabase table for quick repeat access
- Multi-currency display using the exchange rate from the Hotelbeds response

---

## Interview Notes

### Auth flow
1. User submits email + password → `supabase.auth.signUp` or `signInWithPassword`
2. Supabase returns a JWT stored in `localStorage` by the Supabase SDK
3. Every subsequent request to the edge function includes `Authorization: Bearer <jwt>`
4. The edge function calls `supabase.auth.getUser()` to validate the JWT — if invalid or missing, returns 401 immediately
5. On sign-out, `supabase.auth.signOut()` is called, the JWT is invalidated, and both `hotelbeds-cache:*` and `otelier-compare-selection` keys are cleared from `localStorage`

### API integration
- The browser calls `supabase.functions.invoke('hotelbeds-proxy', { body: { action, params } })`
- The proxy validates auth, builds the Hotelbeds request with correct HMAC-SHA256 signing, forwards it, normalises the response, and returns `{ success: true, data }`
- Client-side, `HotelbedsError` (a typed Error subclass) carries `code`, `status`, and `details` for structured error handling in the UI

### State management
- **AuthContext** initialises from `supabase.auth.getSession()` on mount and subscribes to `onAuthStateChange` — single source of truth for session state
- **CompareContext** stores the selection as a `Map<code, cardModel>` (O(1) lookup for checkbox state) and derives a flat array and a `Set` for the UI
- Both contexts are consumed through typed hooks (`useAuth`, `useCompare`) that throw if used outside their provider

### Filter logic
`applyFilters(hotels, filters)` is a single function in `utils/filterHotels.js`:
- Returns the original array reference when no filters are active (avoids unnecessary `useMemo` recomputation)
- Combines filter types with AND (hotel must pass every active filter type)
- Within a type (e.g. star rating checkboxes), uses OR (hotel passes if it matches any selected value)
- Facilities use AND across selections — selecting Pool + WiFi returns only hotels that have both

---

## License

MIT
