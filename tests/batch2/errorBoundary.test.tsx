/**
 * BATCH 2 — Tâche 2.2 : SectionErrorBoundary
 *
 * Teste que le composant attrape les erreurs React et affiche un fallback
 * sans propager l'erreur au parent.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import SectionErrorBoundary from '@/components/custom/SectionErrorBoundary'

// Composant qui throw intentionnellement
function BombComponent({ shouldExplode }: { shouldExplode: boolean }) {
  if (shouldExplode) throw new Error('💥 Simulated component crash')
  return <div>Contenu OK</div>
}

// Supprimer les logs d'erreur React attendus dans les tests
const suppressError = () => vi.spyOn(console, 'error').mockImplementation(() => {})

describe('SectionErrorBoundary', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  // ── Test 1 : affiche les enfants normalement si pas d'erreur ─────────────
  it('affiche les enfants quand tout va bien', () => {
    render(
      <SectionErrorBoundary>
        <BombComponent shouldExplode={false} />
      </SectionErrorBoundary>
    )
    expect(screen.getByText('Contenu OK')).toBeInTheDocument()
  })

  // ── Test 2 : affiche le fallback quand un enfant crashe ──────────────────
  it('affiche le fallback quand un enfant lève une erreur', () => {
    suppressError()
    render(
      <SectionErrorBoundary sectionName="Report Editor">
        <BombComponent shouldExplode={true} />
      </SectionErrorBoundary>
    )
    expect(screen.queryByText('Contenu OK')).not.toBeInTheDocument()
    expect(screen.getByText(/Report Editor/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument()
  })

  // ── Test 3 : le fallback générique est affiché sans sectionName ──────────
  it('affiche un fallback générique sans prop sectionName', () => {
    suppressError()
    render(
      <SectionErrorBoundary>
        <BombComponent shouldExplode={true} />
      </SectionErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument()
  })

  // ── Test 4 : le bouton Réessayer reset le boundary ────────────────────────
  it('réinitialise le boundary en cliquant sur Réessayer', () => {
    suppressError()
    const { rerender } = render(
      <SectionErrorBoundary>
        <BombComponent shouldExplode={true} />
      </SectionErrorBoundary>
    )

    // Fallback visible
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument()

    // D'abord rerender avec des enfants qui ne crashent plus, PUIS click retry
    // (sinon le reset immédiat re-crashe avec les mêmes enfants)
    rerender(
      <SectionErrorBoundary>
        <BombComponent shouldExplode={false} />
      </SectionErrorBoundary>
    )
    fireEvent.click(screen.getByRole('button', { name: /réessayer/i }))

    expect(screen.getByText('Contenu OK')).toBeInTheDocument()
  })

  // ── Test 5 : n'affecte pas les composants sibling ────────────────────────
  it('n\'affecte pas les éléments à l\'extérieur du boundary', () => {
    suppressError()
    render(
      <div>
        <SectionErrorBoundary>
          <BombComponent shouldExplode={true} />
        </SectionErrorBoundary>
        <div data-testid="sibling">Élément frère intact</div>
      </div>
    )
    expect(screen.getByTestId('sibling')).toBeInTheDocument()
    expect(screen.getByText('Élément frère intact')).toBeInTheDocument()
  })
})
