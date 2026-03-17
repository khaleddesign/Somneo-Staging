/**
 * BATCH 4 — Skeleton loaders & Empty states
 *
 * Teste :
 *   - StudyListSkeleton : rend N lignes de skeleton pendant le loading
 *   - AgentStatsSkeleton : rend 4 cartes skeleton
 *   - EmptyState : rend le message et l'icône passés en props
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import StudyListSkeleton from '@/components/custom/skeletons/StudyListSkeleton'
import AgentStatsSkeleton from '@/components/custom/skeletons/AgentStatsSkeleton'
import EmptyState from '@/components/custom/EmptyState'

afterEach(cleanup)

// ─── StudyListSkeleton ────────────────────────────────────────────────────────

describe('StudyListSkeleton', () => {
  // Test 1 : rend le bon nombre de lignes par défaut (5)
  it('rend 5 lignes skeleton par défaut', () => {
    render(<StudyListSkeleton />)
    const rows = document.querySelectorAll('[data-testid="skeleton-row"]')
    expect(rows).toHaveLength(5)
  })

  // Test 2 : rend le nombre de lignes demandé
  it('rend le nombre de lignes demandé via prop rows', () => {
    render(<StudyListSkeleton rows={3} />)
    const rows = document.querySelectorAll('[data-testid="skeleton-row"]')
    expect(rows).toHaveLength(3)
  })

  // Test 3 : les lignes ont la classe animate-pulse
  it('les lignes skeleton ont la classe animate-pulse', () => {
    render(<StudyListSkeleton rows={1} />)
    const row = document.querySelector('[data-testid="skeleton-row"]')
    expect(row?.className).toContain('animate-pulse')
  })

  // Test 4 : pas de contenu texte réel pendant loading
  it('ne contient pas de données réelles (no patient ref)', () => {
    render(<StudyListSkeleton />)
    expect(screen.queryByText(/patient/i)).toBeNull()
    expect(screen.queryByText(/PSG|PV/)).toBeNull()
  })
})

// ─── AgentStatsSkeleton ───────────────────────────────────────────────────────

describe('AgentStatsSkeleton', () => {
  // Test 5 : rend 4 cartes skeleton
  it('rend 4 cartes skeleton KPI', () => {
    render(<AgentStatsSkeleton />)
    const cards = document.querySelectorAll('[data-testid="stat-skeleton"]')
    expect(cards).toHaveLength(4)
  })

  // Test 6 : les cartes ont animate-pulse
  it('les cartes ont la classe animate-pulse', () => {
    render(<AgentStatsSkeleton />)
    const card = document.querySelector('[data-testid="stat-skeleton"]')
    expect(card?.className).toContain('animate-pulse')
  })
})

// ─── EmptyState ───────────────────────────────────────────────────────────────

describe('EmptyState', () => {
  // Test 7 : affiche le titre passé en prop
  it('affiche le titre', () => {
    render(<EmptyState title="Aucune étude" />)
    expect(screen.getByText('Aucune étude')).toBeTruthy()
  })

  // Test 8 : affiche la description si fournie
  it('affiche la description si fournie', () => {
    render(<EmptyState title="Vide" description="Aucun résultat pour ce filtre." />)
    expect(screen.getByText('Aucun résultat pour ce filtre.')).toBeTruthy()
  })

  // Test 9 : n'affiche pas de description si absente
  it('ne plante pas sans description', () => {
    expect(() => render(<EmptyState title="Vide" />)).not.toThrow()
  })

  // Test 10 : rend les children si fournis (bouton d'action)
  it('rend les children comme zone d action', () => {
    render(
      <EmptyState title="Vide">
        <button>Créer une étude</button>
      </EmptyState>
    )
    expect(screen.getByRole('button', { name: 'Créer une étude' })).toBeTruthy()
  })
})
