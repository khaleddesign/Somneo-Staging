"use client"

import { useEffect, useState } from 'react'
import {
  BarChart3,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Timer,
  Users,
} from 'lucide-react'

interface Stats {
  total_studies: number
  en_attente: number
  en_cours: number
  termine: number
  this_week: number
  avg_turnaround: number
  total_clients: number
}

export default function AgentStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/stats')
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Erreur lors du chargement')
        }
        const data = await res.json()
        setStats(data)
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="bg-gray-100 animate-pulse h-24 rounded-lg" />
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="mb-8 bg-red-50 p-4 rounded border border-red-200 text-red-700 text-sm">
        {error || 'Erreur lors du chargement des statistiques'}
      </div>
    )
  }

  const cards = [
    {
      label: 'Total études',
      value: stats.total_studies,
      icon: BarChart3,
      bgColor: 'bg-gray-100',
      iconColor: 'text-gray-600',
    },
    {
      label: 'En attente',
      value: stats.en_attente,
      icon: AlertCircle,
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
    },
    {
      label: 'En cours',
      value: stats.en_cours,
      icon: Clock,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Terminées',
      value: stats.termine,
      icon: CheckCircle2,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Cette semaine',
      value: stats.this_week,
      icon: TrendingUp,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Délai moyen',
      value: `${stats.avg_turnaround}h`,
      icon: Timer,
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Clients actifs',
      value: stats.total_clients,
      icon: Users,
      bgColor: 'bg-teal-100',
      iconColor: 'text-teal-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <Icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
