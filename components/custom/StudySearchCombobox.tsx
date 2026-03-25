"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import type { StudyMatch } from "@/hooks/useBatchReportUpload";

interface StudySearchComboboxProps {
  onSelect: (study: StudyMatch) => void;
  initialCandidates?: StudyMatch[];
  disabled?: boolean;
}

export function StudySearchCombobox({
  onSelect,
  initialCandidates = [],
  disabled,
}: StudySearchComboboxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudyMatch[]>(initialCandidates);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(initialCandidates.length > 0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadDefault = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/studies/search?status=en_attente,en_cours&no_report=true&limit=20",
      );
      const data = await res.json();
      setResults(data.studies ?? []);
      setOpen((data.studies ?? []).length > 0);
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults(initialCandidates);
        setOpen(initialCandidates.length > 0);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/studies/search?patient_ref=${encodeURIComponent(q)}&status=en_attente,en_cours&limit=10`,
        );
        const data = await res.json();
        setResults(data.studies ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    },
    [initialCandidates],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(study: StudyMatch) {
    setOpen(false);
    setQuery(study.patient_reference);
    onSelect(study);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query === "" && results.length === 0) {
              loadDefault();
            } else {
              setOpen(results.length > 0);
            }
          }}
          placeholder="Rechercher par référence patient..."
          disabled={disabled}
          className="pl-8 text-sm border-gray-200 focus-visible:border-teal focus-visible:ring-teal/20"
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-gray-400 animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {results.map((study) => (
            <li key={study.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-teal/5 transition-colors"
                onClick={() => handleSelect(study)}
              >
                <span className="text-sm font-medium text-gray-900">
                  {study.patient_reference}
                </span>
                <span className="text-xs text-gray-400 ml-2">
                  {study.study_type} · {formatDate(study.submitted_at)}
                  {study.has_report && " · rapport existant"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open &&
        !loading &&
        results.length === 0 &&
        (query.length >= 2 || initialCandidates.length > 0) && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-100 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
            Aucune étude trouvée
          </div>
        )}
    </div>
  );
}
