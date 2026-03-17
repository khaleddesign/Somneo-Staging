'use client'

import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  /** Display name of the section — shown in the fallback UI */
  sectionName?: string
}

interface State {
  hasError: boolean
}

/**
 * React Error Boundary for individual dashboard sections.
 *
 * Catches rendering errors from any child component and displays a
 * recovery UI instead of crashing the entire page.
 *
 * Usage:
 *   <SectionErrorBoundary sectionName="Discussion">
 *     <StudyComments ... />
 *   </SectionErrorBoundary>
 */
export default class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console — will be replaced by Sentry in Batch 4
    console.error(
      `[SectionErrorBoundary] "${this.props.sectionName ?? 'Section'}" crashed:`,
      error.message,
      info.componentStack
    )
  }

  private handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const name = this.props.sectionName ?? 'Cette section'

    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 py-8 px-4 text-center border border-red-100 rounded-xl bg-red-50"
      >
        <AlertTriangle className="h-6 w-6 text-red-400" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-gray-700">
            {name} a rencontré une erreur.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Le reste de la page est intact.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={this.handleRetry}
          className="mt-1"
        >
          Réessayer
        </Button>
      </div>
    )
  }
}
