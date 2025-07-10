import { render, screen, fireEvent } from '@testing-library/react'
import TripPlanner from './TripPlanner'
import { TripProvider } from '../../contexts/TripContext'

const renderWithTripProvider = (component) => {
  return render(
    <TripProvider>
      {component}
    </TripProvider>
  )
}

describe('TripPlanner', () => {
  it('renders the trip planner heading', () => {
    renderWithTripProvider(<TripPlanner />)
    expect(screen.getByText('Plan Your Trip')).toBeInTheDocument()
  })

  it('renders start and end location inputs', () => {
    renderWithTripProvider(<TripPlanner />)
    
    expect(screen.getByPlaceholderText('Where are you starting from?')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Where are you going?')).toBeInTheDocument()
  })

  it('only shows start and end waypoints by default', () => {
    renderWithTripProvider(<TripPlanner />)
    
    // Should only have start and end waypoints, no intermediate waypoints
    expect(screen.getByPlaceholderText('Where are you starting from?')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Where are you going?')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Add a stop along the way')).not.toBeInTheDocument()
  })

  it('renders action buttons', () => {
    renderWithTripProvider(<TripPlanner />)
    
    expect(screen.getByText('Plan Route')).toBeInTheDocument()
    expect(screen.getByText('Save Trip')).toBeInTheDocument()
    expect(screen.getByText('New Trip')).toBeInTheDocument()
  })
})