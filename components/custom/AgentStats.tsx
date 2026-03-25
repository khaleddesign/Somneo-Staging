"use client";

import { useEffect, useState } from "react";
import { BarChart3, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import AgentStatsSkeleton from "@/components/custom/skeletons/AgentStatsSkeleton";

interface Stats {
  total_studies: number;
  en_attente: number;
  en_cours: number;
  termine: number;
}

export default function AgentStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/stats", { signal: controller.signal });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Error loading data");
        }
        const data = await res.json();
        setStats(data);
      } catch (e: unknown) {
        if ((e as Error).name !== "AbortError") {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    return () => controller.abort();
  }, []);

  if (loading) {
    return <AgentStatsSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="mb-8 bg-red-50 p-4 rounded border border-red-200 text-red-700 text-sm">
        {error || "Error loading data des statistiques"}
      </div>
    );
  }

  const cards = [
    {
      label: "Total studies",
      value: stats.total_studies,
      icon: BarChart3,
      bgColor: "bg-teal/10",
      iconColor: "text-teal",
    },
    {
      label: "Pending",
      value: stats.en_attente,
      icon: AlertCircle,
      bgColor: "bg-gold/10",
      iconColor: "text-yellow-600",
    },
    {
      label: "In progress",
      value: stats.en_cours,
      icon: Clock,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Completed",
      value: stats.termine,
      icon: CheckCircle2,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-heading">
                  {card.label}
                </p>
                <p className="text-3xl text-midnight font-display leading-none">
                  {card.value}
                </p>
              </div>
              <div className={`${card.bgColor} p-2.5 rounded-xl`}>
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
