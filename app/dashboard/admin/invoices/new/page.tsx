"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/custom/AdminLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

interface ClientRow {
  id: string;
  full_name: string | null;
  email: string;
}

interface StudyRow {
  id: string;
  client_id: string;
  patient_reference: string;
  study_type: "PSG" | "PV" | "MSLT" | "MWT";
  status: "en_attente" | "en_cours" | "termine" | "annule";
  completed_at?: string | null;
  submitted_at: string;
}

interface InvoiceRow {
  id: string;
  study_ids: string[];
}

type BillingMode = "per_study" | "monthly";

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB");
}

function formatMoney(value: number) {
  return `${value.toFixed(2)} AED`;
}

export default function AdminNewInvoicePage() {
  const router = useRouter();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [studies, setStudies] = useState<StudyRow[]>([]);
  const [billedStudyIds, setBilledStudyIds] = useState<Set<string>>(new Set());
  const [priceByType, setPriceByType] = useState<Record<string, number>>({});

  const [selectedClientId, setSelectedClientId] = useState("");
  const [mode, setMode] = useState<BillingMode>("per_study");
  const [billingMonth, setBillingMonth] = useState("");
  const [selectedStudyIds, setSelectedStudyIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const [clientsRes, studiesRes, invoicesRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/studies/list"),
        fetch("/api/invoices"),
      ]);

      const clientsData = clientsRes.ok
        ? await clientsRes.json()
        : { clients: [] };
      const studiesData = studiesRes.ok
        ? await studiesRes.json()
        : { studies: [] };
      const invoicesData = invoicesRes.ok
        ? await invoicesRes.json()
        : { invoices: [] };

      const supabase = createSupabaseClient();
      const { data: settings } = await supabase
        .from("invoice_settings")
        .select("study_type, price_ht");

      const nextPrices: Record<string, number> = {};
      (settings || []).forEach((item) => {
        nextPrices[item.study_type] = Number(item.price_ht ?? 0);
      });

      const billed = new Set<string>();
      ((invoicesData.invoices || []) as InvoiceRow[]).forEach((invoice) => {
        (invoice.study_ids || []).forEach((id) => billed.add(id));
      });

      setClients(
        (clientsData.clients || []).map((c: ClientRow) => ({
          id: c.id,
          full_name: c.full_name,
          email: c.email,
        })),
      );
      setStudies((studiesData.studies || []) as StudyRow[]);
      setBilledStudyIds(billed);
      setPriceByType(nextPrices);
      setLoading(false);
    }

    load();
  }, []);

  useEffect(() => {
    setSelectedStudyIds([]);
  }, [selectedClientId, mode, billingMonth]);

  const eligibleStudies = useMemo(() => {
    if (!selectedClientId) return [];
    return studies.filter(
      (study) =>
        study.client_id === selectedClientId &&
        study.status === "termine" &&
        !billedStudyIds.has(study.id),
    );
  }, [selectedClientId, studies, billedStudyIds]);

  const monthlyStudies = useMemo(() => {
    if (mode !== "monthly" || !billingMonth) return [];
    return eligibleStudies.filter((study) => {
      const referenceDate = study.completed_at || study.submitted_at;
      return referenceDate?.startsWith(billingMonth);
    });
  }, [eligibleStudies, mode, billingMonth]);

  const perStudySelection = useMemo(() => {
    if (mode !== "per_study") return [];
    const selected = new Set(selectedStudyIds);
    return eligibleStudies.filter((study) => selected.has(study.id));
  }, [eligibleStudies, mode, selectedStudyIds]);

  const studiesForInvoice =
    mode === "monthly" ? monthlyStudies : perStudySelection;

  const estimatedSubtotal = useMemo(
    () =>
      studiesForInvoice.reduce(
        (sum, study) => sum + (priceByType[study.study_type] || 0),
        0,
      ),
    [studiesForInvoice, priceByType],
  );

  const estimatedTtc = estimatedSubtotal;

  const selectedClient =
    clients.find((client) => client.id === selectedClientId) || null;

  function toggleStudy(id: string, checked: boolean) {
    setSelectedStudyIds((current) => {
      if (checked) return [...current, id];
      return current.filter((studyId) => studyId !== id);
    });
  }

  async function createInvoice() {
    if (!selectedClientId) {
      setError("Please select a client.");
      return;
    }

    if (mode === "per_study" && selectedStudyIds.length === 0) {
      setError("Please select at least one study.");
      return;
    }

    if (mode === "monthly" && !billingMonth) {
      setError("Please select a month.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      client_id: selectedClientId,
      mode,
      billing_month: mode === "monthly" ? billingMonth : undefined,
      study_ids: mode === "per_study" ? selectedStudyIds : undefined,
    };

    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error || "Error creating invoice.");
      setSubmitting(false);
      return;
    }

    router.push("/dashboard/admin/invoices");
  }

  return (
    <AdminLayout>
      <div className="p-2 md:p-4 space-y-6 bg-[#f0f4f8]">
        <div>
          <h1 className="text-4xl text-midnight font-display">New invoice</h1>
          <p className="text-gray-500 font-body">
            Create a client invoice in 3 steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-teal/30 bg-white p-3">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-heading">
              Step A
            </p>
            <p className="text-midnight font-heading">Choose client</p>
          </div>
          <div className="rounded-xl border border-teal/30 bg-white p-3">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-heading">
              Step B
            </p>
            <p className="text-midnight font-heading">Choose mode</p>
          </div>
          <div className="rounded-xl border border-teal/30 bg-white p-3">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-heading">
              Step C
            </p>
            <p className="text-midnight font-heading">Study selection</p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="space-y-2">
            <Label className="font-heading text-midnight">Client</Label>
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              disabled={loading}
            >
              <SelectTrigger className="bg-[#f8fafc] border-2 border-transparent rounded-xl focus:border-teal">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name || client.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-heading text-midnight">Billing mode</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("per_study")}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  mode === "per_study"
                    ? "border-teal bg-teal/5"
                    : "border-gray-200 bg-white hover:border-teal/40"
                }`}
              >
                <p className="font-heading text-midnight">Per reading</p>
                <p className="text-sm text-gray-500 font-body mt-1">
                  An invoice for manually selected studies
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode("monthly")}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  mode === "monthly"
                    ? "border-teal bg-teal/5"
                    : "border-gray-200 bg-white hover:border-teal/40"
                }`}
              >
                <p className="font-heading text-midnight">Monthly</p>
                <p className="text-sm text-gray-500 font-body mt-1">
                  One invoice for all validated studies of the month
                </p>
              </button>
            </div>
          </div>

          {mode === "monthly" && (
            <div className="space-y-2">
              <Label className="font-heading text-midnight">Month</Label>
              <Input
                type="month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                className="max-w-xs bg-[#f8fafc] border-2 border-transparent rounded-xl focus-visible:border-teal"
              />
            </div>
          )}

          <div className="space-y-3 rounded-xl border border-gray-100 bg-[#fafbfc] p-3">
            <p className="font-heading text-midnight">Billable studies</p>

            {mode === "per_study" ? (
              <div className="space-y-2">
                {eligibleStudies.map((study) => {
                  const checked = selectedStudyIds.includes(study.id);
                  const estimatedPrice = priceByType[study.study_type] || 0;
                  return (
                    <label
                      key={study.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            toggleStudy(study.id, e.target.checked)
                          }
                        />
                        <div>
                          <p className="text-sm font-body text-midnight">
                            {study.patient_reference}
                          </p>
                          <p className="text-xs text-gray-500 font-body">
                            {study.study_type} ·{" "}
                            {formatDate(
                              study.completed_at || study.submitted_at,
                            )}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-heading text-gold tabular-nums">
                        {formatMoney(estimatedPrice)}
                      </p>
                    </label>
                  );
                })}
                {eligibleStudies.length === 0 && (
                  <p className="text-sm text-gray-500 font-body">
                    No validated unbilled studies.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {monthlyStudies.map((study) => {
                  const estimatedPrice = priceByType[study.study_type] || 0;
                  return (
                    <div
                      key={study.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-body text-midnight">
                          {study.patient_reference}
                        </p>
                        <p className="text-xs text-gray-500 font-body">
                          {study.study_type} ·{" "}
                          {formatDate(study.completed_at || study.submitted_at)}
                        </p>
                      </div>
                      <p className="text-sm font-heading text-gold tabular-nums">
                        {formatMoney(estimatedPrice)}
                      </p>
                    </div>
                  );
                })}
                {billingMonth && monthlyStudies.length === 0 && (
                  <p className="text-sm text-gray-500 font-body">
                    No validated unbilled studies this month.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="font-heading text-midnight">Summary</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm font-body">
            <p>
              <span className="text-gray-500">Client :</span>{" "}
              {selectedClient?.full_name || selectedClient?.email || "—"}
            </p>
            <p>
              <span className="text-gray-500">Mode:</span>{" "}
              {mode === "monthly" ? "Monthly" : "Per reading"}
            </p>
            <p>
              <span className="text-gray-500">Studies:</span>{" "}
              {studiesForInvoice.length}
            </p>
            <p>
              <span className="text-gray-500">Period:</span>{" "}
              {mode === "monthly" ? billingMonth || "—" : "Manual selection"}
            </p>
            <p>
              <span className="text-gray-500">Total HT :</span>{" "}
              <span className="font-heading text-gold">
                {formatMoney(estimatedSubtotal)}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Total TTC :</span>{" "}
              <span className="font-heading text-gold">
                {formatMoney(estimatedTtc)}
              </span>
            </p>
          </div>

          {error && <p className="text-sm text-red-600 font-body">{error}</p>}

          <div className="flex justify-end">
            <Button
              type="button"
              className="bg-teal text-white hover:bg-teal/90 rounded-xl font-heading"
              onClick={() => void createInvoice()}
              disabled={submitting || loading}
            >
              {submitting ? "Generating..." : "Generate invoice"}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
