"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppLayout from "@/components/custom/AppLayout";
import AgentStats from "@/components/custom/AgentStats";
import { Card } from "@/components/ui/card";
import type { Role } from "@/types/database";
import { useStudies } from "@/hooks/useStudies";
import StudyListWithFilters from "@/components/custom/StudyListWithFilters";
import { BatchReportUpload } from "@/components/custom/BatchReportUpload";

interface AgentKpiRow {
  agent_id: string;
  agent_name: string;
  en_cours: number;
  termine_ce_mois: number;
}

function AgentDashboardContent() {
  const [agentName, setAgentName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [agentKpis, setAgentKpis] = useState<AgentKpiRow[]>([]);
  const [loadingAgentKpis, setLoadingAgentKpis] = useState(false);
  const [agentKpisError, setAgentKpisError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const {
    studies,
    loading: studiesLoading,
    error: studiesError,
    refresh,
  } = useStudies();

  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<string | null>(
    searchParams.get("status"),
  );

  function handleKpiClick(status: string) {
    const newStatus = activeStatus === status ? null : status; // toggle
    setActiveStatus(newStatus);
    const params = new URLSearchParams(searchParams.toString());
    if (newStatus) {
      params.set("status", newStatus);
    } else {
      params.delete("status");
    }
    router.push(`?${params.toString()}`);
  }

  useEffect(() => {
    const controller = new AbortController();

    const fetchProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || controller.signal.aborted) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (controller.signal.aborted) return;

      const role = profileData?.role as Role | undefined;
      const admin = role === "admin";
      setUserId(user.id);
      setAgentName(profileData?.full_name || "Agent");
      setIsAdmin(admin);

      if (admin) {
        setLoadingAgentKpis(true);
        setAgentKpisError(null);
        try {
          const res = await fetch("/api/stats/agents", {
            signal: controller.signal,
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Error loading data");
          }
          const data = await res.json();
          setAgentKpis(data.agents || []);
        } catch (e: unknown) {
          if ((e as Error).name !== "AbortError") {
            setAgentKpisError(
              e instanceof Error ? e.message : "Error loading data",
            );
          }
        } finally {
          setLoadingAgentKpis(false);
        }
      }
    };

    fetchProfile();
    return () => controller.abort();
  }, []);

  return (
    <AppLayout>
      <div className="p-8 bg-[#f0f4f8] min-h-screen">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-3xl text-midnight font-display">
            Hello, {agentName}
          </h1>
          <p className="text-gray-500 mt-1 font-body text-sm">
            SomnoConnect Dashboard
          </p>
        </div>

        {/* KPIs */}
        <AgentStats />

        {/* Upload rapports en masse */}
        {!isAdmin && (
          <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-heading text-midnight mb-4">
              Report upload
            </h2>
            <BatchReportUpload />
          </div>
        )}

        {/* Admin: KPI par agent */}
        {isAdmin && (
          <Card className="p-6">
            <h2 className="text-base text-midnight mb-4 font-heading">
              Activity by agent
            </h2>
            {loadingAgentKpis ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : agentKpisError ? (
              <p className="text-sm text-red-500">{agentKpisError}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-400 text-xs uppercase tracking-wider">
                      <th className="pb-3 pr-4 font-heading">Agent</th>
                      <th className="pb-3 pr-4 font-heading">In progress</th>
                      <th className="pb-3 font-heading">
                        Completed this month
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {agentKpis.map((row) => (
                      <tr key={row.agent_id}>
                        <td className="py-3 pr-4 text-midnight font-medium">
                          {row.agent_name}
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {row.en_cours}
                        </td>
                        <td className="py-3 text-gray-600">
                          {row.termine_ce_mois}
                        </td>
                      </tr>
                    ))}
                    {agentKpis.length === 0 && (
                      <tr>
                        <td className="py-4 text-gray-400" colSpan={3}>
                          No agents found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Quick filter via KPI shortcuts */}
        {!isAdmin && (
          <div className="flex flex-wrap gap-3 mb-6">
            {[
              {
                label: "Pending",
                status: "en_attente",
                color: "bg-yellow-50 text-yellow-700 border border-yellow-200",
              },
              {
                label: "In progress",
                status: "en_cours",
                color: "bg-blue-50 text-blue-700 border border-blue-200",
              },
              {
                label: "Completed",
                status: "termine",
                color: "bg-green-50 text-green-700 border border-green-200",
              },
            ].map(({ label, status, color }) => (
              <button
                key={status}
                type="button"
                onClick={() => handleKpiClick(status)}
                className={`px-4 py-2 rounded-xl text-sm font-heading transition-all ${color} ${
                  activeStatus === status
                    ? "ring-2 ring-offset-1 ring-teal"
                    : ""
                }`}
              >
                {label}
                {activeStatus === status && " ✓"}
              </button>
            ))}
            {activeStatus && (
              <button
                type="button"
                onClick={() => handleKpiClick(activeStatus)}
                className="px-4 py-2 rounded-xl text-sm font-heading bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {/* Unified study table */}
        {!isAdmin && (
          <div className="mt-4">
            <h2 className="text-xl text-midnight font-heading mb-4">
              All studies
            </h2>
            <StudyListWithFilters
              studies={studies}
              loading={studiesLoading}
              error={studiesError}
              role="agent"
              currentUserId={userId}
              onAssigned={refresh}
              activeChip={activeStatus ?? "all"}
              onChipChange={(status) => setActiveStatus(status)}
            />
          </div>
        )}

        {/* Admin unified study table */}
        {isAdmin && (
          <div className="mt-8">
            <h2 className="text-xl text-midnight font-heading mb-4">
              All studies
            </h2>
            <StudyListWithFilters
              studies={studies}
              loading={studiesLoading}
              error={studiesError}
              role="admin"
              currentUserId={userId}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function AgentDashboardPage() {
  return (
    <Suspense>
      <AgentDashboardContent />
    </Suspense>
  );
}
