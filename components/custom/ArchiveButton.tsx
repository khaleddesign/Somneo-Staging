"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Package } from "lucide-react";

export default function ArchiveButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    archived: number;
    errors: string[];
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleArchive = async () => {
    if (
      !window.confirm(
        "Archiver les fichiers EDF de plus de 30 jours ? Cette action est irréversible.",
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/archive", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error lors de l'archivage");
      }
      const data = await res.json();
      setResult(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleArchive}
        disabled={loading}
        className="flex items-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Archivage en cours...
          </>
        ) : (
          <>
            <Package className="h-4 w-4" />
            Lancer l&apos;archivage
          </>
        )}
      </Button>

      {result && (
        <div className="bg-green-50 p-3 rounded border border-green-200">
          <p className="text-green-700 text-sm font-medium">{result.message}</p>
          {result.errors && result.errors.length > 0 && (
            <div className="mt-2 text-xs text-green-600">
              <p className="font-medium">Errors :</p>
              <ul className="list-disc pl-4">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 p-3 rounded border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
