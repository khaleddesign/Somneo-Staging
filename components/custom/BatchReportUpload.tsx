"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ReportMatchRow } from "@/components/custom/ReportMatchRow";
import { StudySearchCombobox } from "@/components/custom/StudySearchCombobox";
import { useBatchReportUpload } from "@/hooks/useBatchReportUpload";
import type { StudyMatch } from "@/hooks/useBatchReportUpload";
import {
  Upload,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArchiveX,
  Link2,
} from "lucide-react";
import { formatFileSize } from "@/lib/utils";

interface UnassignedReport {
  id: string;
  original_filename: string;
  file_size: number;
  uploaded_at: string;
}

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

export function BatchReportUpload() {
  const {
    items,
    phase,
    addFiles,
    assignStudy,
    setOverwriteConfirmed,
    markAsSkipAssignment,
    removeItem,
    startBatch,
    retryErrors,
    canStart,
    successCount,
    errorCount,
    unassignedCount,
  } = useBatchReportUpload();

  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pending unassigned reports (from previous sessions)
  const [pendingReports, setPendingReports] = useState<UnassignedReport[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await fetch("/api/reports/unassigned");
      if (res.ok) {
        const data = await res.json();
        setPendingReports(data.reports ?? []);
      }
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  async function assignPending(reportId: string, study: StudyMatch) {
    setAssigningId(reportId);
    setAssignError(null);
    try {
      const res = await fetch(`/api/reports/unassigned/${reportId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ study_id: study.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        setAssignError(err.error || "Assignment error");
      } else {
        await loadPending();
      }
    } catch {
      setAssignError("Network error");
    } finally {
      setAssigningId(null);
    }
  }

  const isDone = phase === "done";
  const isUploading = phase === "uploading";
  const hasErrors = errorCount > 0;

  const unmatchedCount = items.filter(
    (it) => it.uploadState === "idle" && !it.matchedStudy && !it.skipAssignment,
  ).length;
  const overwritePending = items.filter(
    (it) =>
      it.matchedStudy?.has_report &&
      !it.overwriteConfirmed &&
      it.uploadState === "idle",
  ).length;

  async function handleFiles(files: FileList | File[]) {
    setValidationError(null);
    const arr = Array.from(files);
    const invalid = arr.filter((f) => !isPdf(f));

    if (invalid.length > 0) {
      setValidationError(
        `${invalid.length} file(s) ignored: only PDF files are accepted.`,
      );
    }

    const valid = arr.filter(isPdf);
    if (valid.length > 0) await addFiles(valid);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = "";
  }

  const globalProgress =
    items.length === 0
      ? 0
      : Math.round(
          (items.filter(
            (it) =>
              it.uploadState === "completed" || it.uploadState === "skipped",
          ).length /
            items.length) *
            100,
        );

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      {phase === "idle" && (
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            isDragging
              ? "border-teal bg-teal/10"
              : "border-teal/30 bg-teal/5 hover:bg-teal/10"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 mx-auto mb-3 text-teal" />
          <p className="text-base font-medium text-gray-900">
            Drop your PDF reports here
          </p>
          <p className="text-sm text-gray-500 mt-1">or click to browse</p>
          <p className="text-xs text-gray-400 mt-2">
            PDF only · Automatic matching by patient reference
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}

      {/* Validation error */}
      {validationError && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {validationError}
        </div>
      )}

      {/* Global progress bar */}
      {isUploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              {successCount} /{" "}
              {
                items.filter((it) => it.matchedStudy || it.skipAssignment)
                  .length
              }{" "}
              reports uploaded
            </span>
            <span>{globalProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-teal h-2 rounded-full transition-all"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Hints */}
      {phase === "idle" &&
        items.length > 0 &&
        (unmatchedCount > 0 || overwritePending > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 space-y-1">
            {unmatchedCount > 0 && (
              <p>
                <AlertCircle className="inline h-3.5 w-3.5 mr-1" />
                {unmatchedCount} file{unmatchedCount > 1 ? "s" : ""} without a
                match — assign manually or upload without assigning.
              </p>
            )}
            {overwritePending > 0 && (
              <p>
                <AlertCircle className="inline h-3.5 w-3.5 mr-1" />
                {overwritePending} study{overwritePending > 1 ? "ies" : ""} with
                an existing report — confirm overwrite.
              </p>
            )}
          </div>
        )}

      {/* File list */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, index) => (
            <ReportMatchRow
              key={item.id}
              item={item}
              index={index}
              onAssign={assignStudy}
              onOverwriteConfirm={setOverwriteConfirmed}
              onSkipAssignment={markAsSkipAssignment}
              onRemove={removeItem}
              disabled={phase !== "idle"}
            />
          ))}
        </div>
      )}

      {/* Summary when done */}
      {isDone && (
        <div
          className={`rounded-xl p-4 border ${hasErrors ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}
        >
          <div className="flex items-center gap-2">
            {hasErrors ? (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            <p className="text-sm font-medium">
              {successCount} report{successCount > 1 ? "s" : ""} uploaded
              {hasErrors && `, ${errorCount} error${errorCount > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 items-start">
        {phase === "idle" && items.length > 0 && (
          <div className="space-y-1">
            <Button
              onClick={startBatch}
              disabled={!canStart}
              className="bg-teal text-white hover:bg-teal/90"
            >
              <Upload className="h-4 w-4 mr-2" />
              {(() => {
                const assigned = items.filter(
                  (it) => it.matchedStudy && it.uploadState === "idle",
                ).length;
                const unassigned = items.filter(
                  (it) =>
                    !it.matchedStudy &&
                    it.skipAssignment &&
                    it.uploadState === "idle",
                ).length;
                const total = assigned + unassigned;
                return `Confirm and upload (${total} report${total > 1 ? "s" : ""})`;
              })()}
            </Button>
            {unassignedCount > 0 && (
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <ArchiveX className="h-3 w-3" />
                {unassignedCount} report{unassignedCount > 1 ? "s" : ""} will be
                stored without assignment
              </p>
            )}
          </div>
        )}

        {isDone && hasErrors && (
          <Button
            variant="outline"
            onClick={retryErrors}
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry errors ({errorCount})
          </Button>
        )}
      </div>

      {/* Pending unassigned reports (from previous sessions) */}
      {(pendingReports.length > 0 || pendingLoading) && (
        <div className="border-t pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <ArchiveX className="h-4 w-4 text-blue-500" />
                Reports pending assignment
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                These reports were uploaded without a study. Assign them to a
                study to notify the prescriber.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadPending}
              disabled={pendingLoading}
              className="text-xs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1 ${pendingLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {assignError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {assignError}
            </div>
          )}

          <div className="space-y-2">
            {pendingReports.map((report) => (
              <div
                key={report.id}
                className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {report.original_filename}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatFileSize(report.file_size)} · uploaded on{" "}
                      {new Date(report.uploaded_at).toLocaleDateString(
                        "en-GB",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-heading text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                    <ArchiveX className="h-3 w-3" />
                    Pending
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-heading text-gray-600 flex items-center gap-1">
                      <Link2 className="h-3 w-3" />
                      Assign to a study
                    </p>
                    <StudySearchCombobox
                      onSelect={(study) => assignPending(report.id, study)}
                      initialCandidates={[]}
                      disabled={assigningId === report.id}
                    />
                  </div>
                  {assigningId === report.id && (
                    <p className="text-xs text-blue-600 pb-2">Assigning…</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
