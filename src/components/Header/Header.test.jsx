import { render, screen, fireEvent } from '@testing-library/react'
import Header from './Header'

describe('Header', () => {
  it('renders the OpenRoad logo', () => {
    render(<Header />)
    expect(screen.getByText('OpenRoad')).toBeInTheDocument()
  })

  it('renders the tagline', () => {
    render(<Header />)
    expect(screen.getByText('Free road trip planner')).toBeInTheDocument()
  })

  it('renders the status text', () => {
    render(<Header />)
    expect(screen.getByText('AI-powered trip planning made simple')).toBeInTheDocument()
  })

  it('renders action buttons', () => {
    render(<Header />)
    expect(screen.getByText('New Trip')).toBeInTheDocument()
  })
})