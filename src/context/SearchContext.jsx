import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const SearchContext = createContext(null)

/**
 * Persists hotel search results across page navigation.
 *
 * Results survive navigating to the Compare page and back.
 * Automatically cleared when the user signs out so stale data
 * from one session never leaks into the next.
 */
export function SearchProvider({ children }) {
  const [hotels, setHotels] = useState([])
  const [hasSearched, setHasSearched] = useState(false)

  // Mirror CompareContext: clear everything on sign-out.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setHotels([])
        setHasSearched(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  /**
   * Store a completed (or just-started) search result.
   * Calling with [] at the start of a search immediately hides old results
   * while the spinner is active. Calling with the full array on success
   * shows the new results.
   * Both calls mark hasSearched=true so HotelList never falls back to
   * the "enter criteria" empty state once a search has been triggered.
   */
  const setSearchResults = useCallback((newHotels) => {
    setHotels(newHotels)
    setHasSearched(true)
  }, [])

  return (
    <SearchContext.Provider value={{ hotels, hasSearched, setSearchResults }}>
      {children}
    </SearchContext.Provider>
  )
}

/**
 * Hook to read/write the persisted search results.
 * Must be used inside a <SearchProvider />.
 */
export function useSearch() {
  const ctx = useContext(SearchContext)
  if (!ctx) {
    throw new Error('useSearch must be used inside <SearchProvider>')
  }
  return ctx
}
