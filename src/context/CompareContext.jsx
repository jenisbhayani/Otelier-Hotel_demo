import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const STORAGE_KEY = 'otelier-compare-selection'
const MAX_COMPARE = 5

/**
 * Persist a Map<code, hotelCardModel> to localStorage.
 * The Map values are plain objects, safe to JSON-serialize.
 */
function saveToStorage(selectionMap) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...selectionMap.values()]),
    )
  } catch {
    // Storage write failures are non-fatal.
  }
}

/**
 * Restore the compare Map from localStorage on first load.
 * Returns an empty Map if nothing is stored or parsing fails.
 */
function loadFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Map()
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return new Map()
    return new Map(list.filter((h) => h?.code).map((h) => [h.code, h]))
  } catch {
    return new Map()
  }
}

const CompareContext = createContext(null)

/**
 * Provides hotel comparison selection state to the entire app.
 * Selected hotels are stored as full card models (not just codes) so the
 * Compare page can render without any additional API calls.
 */
export function CompareProvider({ children }) {
  // Map<hotelCode: string, hotelCardModel: object>
  const [selected, setSelected] = useState(() => loadFromStorage())

  // Clear the comparison selection whenever the current user signs out.
  // This prevents one user's selections leaking into the next user's session
  // on the same browser/device.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setSelected(new Map())
        try { window.localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  /**
   * Add a hotel to the comparison selection.
   * No-op if already selected or the max limit is reached.
   */
  const addHotel = useCallback((hotel) => {
    setSelected((prev) => {
      if (prev.has(hotel.code) || prev.size >= MAX_COMPARE) return prev
      const next = new Map(prev)
      next.set(hotel.code, hotel)
      saveToStorage(next)
      return next
    })
  }, [])

  /**
   * Remove a hotel from the comparison selection.
   */
  const removeHotel = useCallback((code) => {
    setSelected((prev) => {
      if (!prev.has(code)) return prev
      const next = new Map(prev)
      next.delete(code)
      saveToStorage(next)
      return next
    })
  }, [])

  /**
   * Toggle a hotel in the selection.
   * `hotel` must be the full card model when adding (selected=true).
   * When removing (selected=false) only `hotel.code` is needed.
   */
  const toggleHotel = useCallback((hotel, isSelected) => {
    if (isSelected) {
      addHotel(hotel)
    } else {
      removeHotel(hotel.code)
    }
  }, [addHotel, removeHotel])

  /**
   * Clear the entire selection.
   */
  const clearAll = useCallback(() => {
    setSelected(new Map())
    try { window.localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }, [])

  const value = useMemo(() => ({
    /** Flat array of hotel card models, ordered by insertion */
    hotels: [...selected.values()],
    /** Set<code> — O(1) membership check for checkbox state */
    selectedCodes: new Set(selected.keys()),
    /** Number of currently selected hotels */
    count: selected.size,
    /** True when the 5-hotel limit has been reached */
    maxReached: selected.size >= MAX_COMPARE,
    toggleHotel,
    clearAll,
  }), [selected, toggleHotel, clearAll])

  return (
    <CompareContext.Provider value={value}>
      {children}
    </CompareContext.Provider>
  )
}

/**
 * Hook to consume the compare selection context.
 * Must be used inside a <CompareProvider />.
 */
export function useCompare() {
  const ctx = useContext(CompareContext)
  if (!ctx) {
    throw new Error('useCompare must be used inside <CompareProvider>')
  }
  return ctx
}
