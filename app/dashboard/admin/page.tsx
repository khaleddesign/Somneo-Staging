"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/custom/AdminLayout";
import {
  Users,
  UserRound,
  FileText,
  Clock,
  CheckCircle2,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdminStats {
  total_agents: number;
  total_clients: number;
  total_studies: number;
  en_attente_non_assignees: number;
  en_cours: number;
  termine_ce_mois: number;
  avg_turnaround: number;
}

interface AgentPerf {
  agent_id: string;
  agent_name: string;
  en_cours: number;
  termine_total: number;
  avg_turnaround: number;
  last_activity: string | null;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [agents, setAgents] = useState<AgentPerf[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [statsRes, agentsRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/stats/agents"),
      ]);

      const statsData = statsRes.ok ? await statsRes.json() : null;
      const agentData = agentsRes.ok ? await agentsRes.json() : null;

      setStats(statsData);
      setAgents(agentData?.agents || []);
      setLoading(false);
    }

    load();
  }, []);

  const cards = [
    {
      label: "Total agents actifs",
      value: stats?.total_agents ?? 0,
      icon: Users,
      bg: "bg-teal/10",
      color: "text-teal",
    },
    {
      label: "Total clients actifs",
      value: stats?.total_clients ?? 0,
      icon: UserRound,
      bg: "bg-gold/10",
      color: "text-gold",
    },
    {
      label: "Total studies",
      value: stats?.total_studies ?? 0,
      icon: FileText,
      bg: "bg-teal/10",
      color: "text-teal",
    },
    {
      label: "Pending studies",
      value: stats?.en_attente_non_assignees ?? 0,
      icon: Clock,
      bg: "bg-gold/10",
      color: "text-gold",
    },
    {
      label: "Studies in progress",
      value: stats?.en_cours ?? 0,
      icon: Timer,
      bg: "bg-teal/10",
      color: "text-teal",
    },
    {
      label: "Completed this month",
      value: stats?.termine_ce_mois ?? 0,
      icon: CheckCircle2,
      bg: "bg-gold/10",
      color: "text-gold",
    },
    {
      label: "Avg. turnaround",
      value: `${stats?.avg_turnaround ?? 0}h`,
      icon: Timer,
      bg: "bg-teal/10",
      color: "text-teal",
    },
  ];

  return (
    <AdminLayout>
      <div className="p-3 md:p-5 space-y-8 bg-[#f0f4f8]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl lg:text-5xl text-midnight font-display leading-tight">
              Control tower
            </h1>
            <p className="text-gray-500 font-body mt-1">
              Pilotage complet de la plateforme SomnoConnect
            </p>
          </div>
          <Badge className="text-[9px] tracking-[3px] bg-gold/10 text-gold border border-gold/20 rounded-full px-2 py-0.5 font-heading">
            ADMIN
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.label}
                className="shadow-sm border-gray-100 rounded-2xl bg-white transition-all hover:shadow-md hover:-translate-y-px"
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-400 font-heading">
                        {card.label}
                      </p>
                      <p className="text-3xl text-midnight font-display mt-1 tabular-nums">
                        {loading ? "…" : card.value}
                      </p>
                    </div>
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center ${card.bg}`}
                    >
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl text-midnight font-heading">
              Performance agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm font-body">
                <thead className="bg-midnight/5">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-gray-500 font-heading">
                      Nom agent
                    </th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-gray-500 font-heading">
                      In progress
                    </th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-gray-500 font-heading">
                      Completed
                    </th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-gray-500 font-heading">
                      Avg. turnaround
                    </th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-gray-500 font-heading">
                      Last activity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr
                      key={agent.agent_id}
                      className="border-t border-gray-100"
                    >
                      <td className="px-3 py-3 font-body text-midnight">
                        {agent.agent_name}
                      </td>
                      <td className="px-3 py-3 font-display text-midnight tabular-nums">
                        {agent.en_cours}
                      </td>
                      <td className="px-3 py-3 font-display text-midnight tabular-nums">
                        {agent.termine_total}
                      </td>
                      <td className="px-3 py-3 font-body text-midnight">
                        {agent.avg_turnaround} h
                      </td>
                      <td className="px-3 py-3 font-body text-gray-600">
                        {agent.last_activity
                          ? new Date(agent.last_activity).toLocaleString(
                              "en-GB",
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {!loading && agents.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-gray-500 font-body"
                      >
                        No agent data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
