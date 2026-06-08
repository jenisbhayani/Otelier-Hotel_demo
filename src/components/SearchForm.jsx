import { useState } from 'react'
import { contentString } from '../utils/hotelDisplay'
import { FormAlert, INPUT_DISABLED_CLASS } from './ui'

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function defaultCheckIn() {
  const date = new Date()
  date.setDate(date.getDate() + 14)
  return date.toISOString().slice(0, 10)
}

function defaultCheckOut(checkIn) {
  const date = new Date(`${checkIn}T12:00:00`)
  date.setDate(date.getDate() + 3)
  return date.toISOString().slice(0, 10)
}

/**
 * @param {{
 *   destinations?: Array<{ code: string, name: string, countryCode?: string }>,
 *   destinationsLoading?: boolean,
 *   destinationsError?: string,
 *   isSearching?: boolean,
 *   onSearch: (values: { destinationCode: string, checkIn: string, checkOut: string, adults: number }) => void,
 * }} props
 */
export default function SearchForm({
  destinations = [],
  destinationsLoading = false,
  destinationsError = '',
  isSearching = false,
  onSearch,
}) {
  const [destinationCode, setDestinationCode] = useState('')
  const [checkIn, setCheckIn] = useState(defaultCheckIn)
  const [checkOut, setCheckOut] = useState(() => defaultCheckOut(defaultCheckIn()))
  const [adults, setAdults] = useState(2)
  const [validationError, setValidationError] = useState('')

  function handleCheckInChange(value) {
    setCheckIn(value)
    if (checkOut <= value) {
      setCheckOut(defaultCheckOut(value))
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    setValidationError('')

    if (!destinationCode) {
      setValidationError('Please select a destination.')
      return
    }

    if (!checkIn || !checkOut) {
      setValidationError('Check-in and check-out dates are required.')
      return
    }

    if (checkOut <= checkIn) {
      setValidationError('Check-out must be after check-in.')
      return
    }

    if (checkIn < todayIsoDate()) {
      setValidationError('Check-in cannot be in the past.')
      return
    }

    const adultCount = Number(adults)
    if (!Number.isFinite(adultCount) || adultCount < 1) {
      setValidationError('At least one adult is required.')
      return
    }

    onSearch({
      destinationCode,
      checkIn,
      checkOut,
      adults: adultCount,
    })
  }

  const isDisabled = isSearching || destinationsLoading

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      noValidate
    >
      <h2 className="text-lg font-semibold text-slate-900">Search hotels</h2>
      <p className="mt-1 text-sm text-slate-600">
        Choose a destination and travel dates to find available stays.
      </p>

        <FormAlert message={validationError || destinationsError} className="mt-4" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="search-destination" className="block text-sm font-medium text-slate-700">
            Destination
          </label>
          <select
            id="search-destination"
            value={destinationCode}
            onChange={(e) => setDestinationCode(e.target.value)}
            disabled={isDisabled || Boolean(destinationsError)}
            required
            className={`${INPUT_DISABLED_CLASS} bg-white`}
          >
            <option value="">
              {destinationsLoading ? 'Loading destinations…' : 'Select destination'}
            </option>
            {destinations.map((destination) => (
              <option key={destination.code} value={destination.code}>
                {contentString(destination.name)} ({destination.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="search-check-in" className="block text-sm font-medium text-slate-700">
            Check-in
          </label>
          <input
            id="search-check-in"
            type="date"
            value={checkIn}
            min={todayIsoDate()}
            onChange={(e) => handleCheckInChange(e.target.value)}
            disabled={isDisabled}
            required
            className={INPUT_DISABLED_CLASS}
          />
        </div>

        <div>
          <label htmlFor="search-check-out" className="block text-sm font-medium text-slate-700">
            Check-out
          </label>
          <input
            id="search-check-out"
            type="date"
            value={checkOut}
            min={checkIn || todayIsoDate()}
            onChange={(e) => setCheckOut(e.target.value)}
            disabled={isDisabled}
            required
            className={INPUT_DISABLED_CLASS}
          />
        </div>

        <div>
          <label htmlFor="search-adults" className="block text-sm font-medium text-slate-700">
            Adults
          </label>
          <input
            id="search-adults"
            type="number"
            min={1}
            max={6}
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
            disabled={isDisabled}
            required
            className={INPUT_DISABLED_CLASS}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isDisabled}
        className="mt-6 w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isSearching ? 'Searching…' : 'Search Hotels'}
      </button>
    </form>
  )
}
