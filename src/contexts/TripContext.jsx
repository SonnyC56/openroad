import { createContext, useContext, useReducer, useEffect, useMemo } from 'react'

const TripContext = createContext()

const initialState = {
  currentTrip: null,
  trips: [],
  activeTab: 'planner',
  selectedWaypoints: [],
  mapInstance: null,
  selectedLeg: null // Track which leg of the journey is selected
}

// Local storage utilities
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

const loadFromLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error('Error loading from localStorage:', error)
    return defaultValue
  }
}

const tripReducer = (state, action) => {
  let newState
  
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload }
    
    case 'SET_CURRENT_TRIP':
      newState = { ...state, currentTrip: action.payload }
      // Save current trip to localStorage
      if (action.payload) {
        saveToLocalStorage('openroad-current-trip', action.payload)
      }
      return newState
    
    case 'ADD_WAYPOINT':
      if (!state.currentTrip) return state
      
      let newWaypoints
      if (action.payload.insertAt !== undefined) {
        // Insert at specific position
        const insertIndex = action.payload.insertAt
        const waypointData = { ...action.payload }
        delete waypointData.insertAt
        
        newWaypoints = [
          ...state.currentTrip.waypoints.slice(0, insertIndex),
          waypointData,
          ...state.currentTrip.waypoints.slice(insertIndex)
        ]
      } else {
        // Add at end (before final end waypoint if it exists)
        const hasEndWaypoint = state.currentTrip.waypoints.some(wp => wp.type === 'end')
        if (hasEndWaypoint) {
          const endIndex = state.currentTrip.waypoints.findIndex(wp => wp.type === 'end')
          newWaypoints = [
            ...state.currentTrip.waypoints.slice(0, endIndex),
            action.payload,
            ...state.currentTrip.waypoints.slice(endIndex)
          ]
        } else {
          newWaypoints = [...state.currentTrip.waypoints, action.payload]
        }
      }
      
      newState = {
        ...state,
        currentTrip: {
          ...state.currentTrip,
          waypoints: newWaypoints,
          updated: new Date().toISOString()
        }
      }
      saveToLocalStorage('openroad-current-trip', newState.currentTrip)
      return newState
    
    case 'UPDATE_WAYPOINT':
      if (!state.currentTrip) return state
      newState = {
        ...state,
        currentTrip: {
          ...state.currentTrip,
          waypoints: state.currentTrip.waypoints.map(wp =>
            wp.id === action.payload.id ? { ...wp, ...action.payload.updates } : wp
          ),
          updated: new Date().toISOString()
        }
      }
      saveToLocalStorage('openroad-current-trip', newState.currentTrip)
      return newState
    
    case 'REMOVE_WAYPOINT':
      if (!state.currentTrip) return state
      newState = {
        ...state,
        currentTrip: {
          ...state.currentTrip,
          waypoints: state.currentTrip.waypoints.filter(wp => wp.id !== action.payload),
          updated: new Date().toISOString()
        }
      }
      saveToLocalStorage('openroad-current-trip', newState.currentTrip)
      return newState
    
    case 'SAVE_TRIP':
      const existingIndex = state.trips.findIndex(trip => trip.id === action.payload.id)
      let newTrips
      
      if (existingIndex >= 0) {
        newTrips = [...state.trips]
        newTrips[existingIndex] = action.payload
      } else {
        newTrips = [...state.trips, action.payload]
      }
      
      newState = { ...state, trips: newTrips }
      saveToLocalStorage('openroad-saved-trips', newTrips)
      return newState
    
    case 'LOAD_TRIPS':
      return { ...state, trips: action.payload }
    
    case 'LOAD_FROM_STORAGE':
      return {
        ...state,
        currentTrip: action.payload.currentTrip,
        trips: action.payload.trips
      }
    
    case 'DELETE_TRIP':
      newState = {
        ...state,
        trips: state.trips.filter(trip => trip.id !== action.payload)
      }
      saveToLocalStorage('openroad-saved-trips', newState.trips)
      return newState
    
    case 'SET_MAP_INSTANCE':
      return { ...state, mapInstance: action.payload }
    
    case 'NEW_TRIP':
      const newTrip = {
        id: `trip-${Date.now()}`,
        name: action.payload?.name || 'Untitled Trip',
        waypoints: [
          {
            id: 'start-' + Date.now(),
            location: '',
            type: 'start',
            date: '',
            time: '',
            notes: '',
            lat: null,
            lng: null,
            address: ''
          },
          {
            id: 'end-' + Date.now() + 1,
            location: '',
            type: 'end', 
            date: '',
            time: '',
            notes: '',
            lat: null,
            lng: null,
            address: ''
          }
        ],
        route: null,
        distance: null,
        duration: null,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }
      
      // Save to localStorage
      saveToLocalStorage('openroad-current-trip', newTrip)
      
      return { ...state, currentTrip: newTrip, selectedLeg: null }
    
    case 'SET_SELECTED_LEG':
      return { ...state, selectedLeg: action.payload }
    
    default:
      return state
  }
}

export const TripProvider = ({ children }) => {
  const [state, dispatch] = useReducer(tripReducer, initialState)

  // Load data from localStorage on mount
  useEffect(() => {
    const currentTrip = loadFromLocalStorage('openroad-current-trip')
    const savedTrips = loadFromLocalStorage('openroad-saved-trips', [])
    
    if (currentTrip || savedTrips.length > 0) {
      dispatch({ 
        type: 'LOAD_FROM_STORAGE', 
        payload: { 
          currentTrip, 
          trips: savedTrips 
        } 
      })
    }
  }, [])

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    state,
    dispatch,
    // Helper functions
    setActiveTab: (tab) => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab }),
    setCurrentTrip: (trip) => dispatch({ type: 'SET_CURRENT_TRIP', payload: trip }),
    addWaypoint: (waypoint) => dispatch({ type: 'ADD_WAYPOINT', payload: waypoint }),
    updateWaypoint: (id, updates) => dispatch({ type: 'UPDATE_WAYPOINT', payload: { id, updates } }),
    removeWaypoint: (id) => dispatch({ type: 'REMOVE_WAYPOINT', payload: id }),
    saveTrip: (trip) => dispatch({ type: 'SAVE_TRIP', payload: trip }),
    loadTrips: (trips) => dispatch({ type: 'LOAD_TRIPS', payload: trips }),
    deleteTrip: (id) => dispatch({ type: 'DELETE_TRIP', payload: id }),
    newTrip: (name) => dispatch({ type: 'NEW_TRIP', payload: { name } }),
    setMapInstance: (map) => dispatch({ type: 'SET_MAP_INSTANCE', payload: map }),
    setSelectedLeg: (legIndex) => dispatch({ type: 'SET_SELECTED_LEG', payload: legIndex })
  }), [state, dispatch])

  return (
    <TripContext.Provider value={value}>
      {children}
    </TripContext.Provider>
  )
}

export const useTrip = () => {
  const context = useContext(TripContext)
  if (context === undefined) {
    throw new Error('useTrip must be used within a TripProvider')
  }
  return context
}

export default TripContext