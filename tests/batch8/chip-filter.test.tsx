/**
 * BATCH 8 — Agent dashboard chip filter tests
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import StudyListWithFilters from '@/components/custom/StudyListWithFilters'

afterEach(cleanup)

// Minimal studies fixture
const makeStudy = (status: string, id: string) => ({
  id,
  client_id: 'c1',
  assigned_agent_id: null,
  patient_reference: `REF-${id}`,
  study_type: 'PSG' as const,
  priority: 'medium' as const,
  status: status as 'en_attente' | 'en_cours' | 'termine' | 'annule',
  submitted_at: new Date().toISOString(),
})

const studies = [
  makeStudy('en_attente', '1'),
  makeStudy('en_cours', '2'),
  makeStudy('termine', '3'),
]

describe('StudyListWithFilters — chips de filtre rapide', () => {
  it('rend un chip "Toutes" et les chips de statut', () => {
    render(
      <StudyListWithFilters
        studies={studies}
        loading={false}
        error={null}
        role="agent"
      />
    )
    expect(screen.getByRole('button', { name: /Toutes/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /En attente/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /En cours/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Terminées/i })).toBeTruthy()
  })

  it('clic sur chip "En attente" filtre le tableau', () => {
    render(
      <StudyListWithFilters
        studies={studies}
        loading={false}
        error={null}
        role="agent"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /En attente/i }))
    expect(screen.getByText('REF-1')).toBeTruthy()
    expect(screen.queryByText('REF-2')).toBeNull()
    expect(screen.queryByText('REF-3')).toBeNull()
  })

  it('clic sur "Toutes" après filtre réinitialise', () => {
    render(
      <StudyListWithFilters
        studies={studies}
        loading={false}
        error={null}
        role="agent"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /En attente/i }))
    fireEvent.click(screen.getByRole('button', { name: /Toutes/i }))
    expect(screen.getByText('REF-1')).toBeTruthy()
    expect(screen.getByText('REF-2')).toBeTruthy()
    expect(screen.getByText('REF-3')).toBeTruthy()
  })

  it('chip actif a aria-pressed=true, inactif a aria-pressed=false', () => {
    render(
      <StudyListWithFilters
        studies={studies}
        loading={false}
        error={null}
        role="agent"
      />
    )
    const toutesBtn = screen.getByRole('button', { name: /Toutes/i })
    // Initially "Toutes" is active
    expect(toutesBtn.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: /En attente/i }))
    expect(toutesBtn.getAttribute('aria-pressed')).toBe('false')
    expect(
      screen.getByRole('button', { name: /En attente/i }).getAttribute('aria-pressed')
    ).toBe('true')
  })

  it('prop activeChip pré-sélectionne le bon chip', () => {
    render(
      <StudyListWithFilters
        studies={studies}
        loading={false}
        error={null}
        role="agent"
        activeChip="en_cours"
      />
    )
    expect(
      screen.getByRole('button', { name: /En cours/i }).getAttribute('aria-pressed')
    ).toBe('true')
    // Only en_cours study visible
    expect(screen.queryByText('REF-1')).toBeNull()
    expect(screen.getByText('REF-2')).toBeTruthy()
  })
})
