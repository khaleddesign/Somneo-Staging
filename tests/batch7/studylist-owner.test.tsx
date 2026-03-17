/**
 * BATCH 7 — Tests StudyList showOwner prop
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { StudyList } from '@/components/custom/StudyList'
import type { Study } from '@/hooks/useStudies'

afterEach(cleanup)

const makeStudy = (overrides: Partial<Study> = {}): Study => ({
  id: 'study-1',
  client_id: 'client-1',
  assigned_agent_id: null,
  patient_reference: 'REF-001',
  study_type: 'PSG',
  priority: 'medium',
  status: 'en_attente',
  submitted_at: new Date().toISOString(),
  client_name: 'Jean Dupont',
  client_email: 'jean@test.com',
  ...overrides,
})

describe('StudyList — prop showOwner', () => {
  it('n affiche PAS la colonne "Soumis par" si showOwner absent', () => {
    render(
      <StudyList
        studies={[makeStudy()]}
        loading={false}
        error={null}
        role="client"
      />
    )
    expect(screen.queryByText('Soumis par')).toBeNull()
  })

  it('affiche la colonne "Soumis par" si showOwner=true', () => {
    render(
      <StudyList
        studies={[makeStudy()]}
        loading={false}
        error={null}
        role="client"
        showOwner={true}
      />
    )
    expect(screen.getByText('Soumis par')).toBeTruthy()
  })

  it('affiche client_name dans la cellule si showOwner=true', () => {
    render(
      <StudyList
        studies={[makeStudy({ client_name: 'Marie Martin' })]}
        loading={false}
        error={null}
        role="client"
        showOwner={true}
      />
    )
    expect(screen.getByText('Marie Martin')).toBeTruthy()
  })

  it('affiche "—" si showOwner=true mais client_name undefined', () => {
    render(
      <StudyList
        studies={[makeStudy({ client_name: undefined })]}
        loading={false}
        error={null}
        role="client"
        showOwner={true}
      />
    )
    // The cell with "—" for missing owner
    const cells = document.querySelectorAll('td')
    const ownerCells = Array.from(cells).filter(td => td.textContent === '—')
    expect(ownerCells.length).toBeGreaterThan(0)
  })

  it('les colonnes existantes s affichent toujours quelle que soit showOwner', () => {
    render(
      <StudyList
        studies={[makeStudy()]}
        loading={false}
        error={null}
        role="client"
      />
    )
    // Check that at least the status header is present
    expect(screen.getByText('Status')).toBeTruthy()
  })
})
