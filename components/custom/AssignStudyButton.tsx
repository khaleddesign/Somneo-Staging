"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AssignStudyButtonProps {
  studyId: string;
}

export default function AssignStudyButton({ studyId }: AssignStudyButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/studies/${studyId}/assign`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Unable to take on this study");
      router.refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleAssign}
        disabled={loading}
        size="lg"
        className="w-full bg-teal text-midnight hover:bg-teal/90 font-heading text-base shadow-sm"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Assignation en cours...
          </>
        ) : (
          "Take on this study"
        )}
      </Button>
      {error && <p className="text-sm text-red-600 font-body">{error}</p>}
    </div>
  );
}
