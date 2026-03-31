"use client";

import { useEffect, useMemo, useState } from "react";
import { Study } from "@/hooks/useStudies";
import { StudyList } from "./StudyList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import StudyListSkeleton from "@/components/custom/skeletons/StudyListSkeleton";
import EmptyState from "@/components/custom/EmptyState";
import { decrypt } from "@/lib/encryption";

interface StudyListWithFiltersProps {
  studies: Study[];
  loading: boolean;
  error: string | null;
  role: "agent" | "client" | "admin";
  currentUserId?: string | null;
  onAssigned?: () => void;
  activeChip?: string | null;
  onChipChange?: (status: string | null) => void;
}

export default function StudyListWithFilters({
  studies,
  loading,
  error,
  role,
  currentUserId,
  onAssigned,
  activeChip,
  onChipChange,
}: StudyListWithFiltersProps) {
  const [chipFilter, setChipFilter] = useState<string>(activeChip ?? "all");
  const [statusFilter, setStatusFilter] = useState<string>(
    activeChip && activeChip !== "all" ? activeChip : "all",
  );
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (activeChip !== undefined && activeChip !== null) {
      setChipFilter(activeChip);
      setStatusFilter(activeChip === "all" ? "all" : activeChip);
      setCurrentPage(1);
    }
  }, [activeChip]);

  function handleChipClick(value: string) {
    setChipFilter(value);
    setStatusFilter(value === "all" ? "all" : value);
    setCurrentPage(1);
    onChipChange?.(value === "all" ? null : value);
  }

  const filteredStudies = useMemo(() => {
    let result = studies;

    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      result = result.filter((s) => s.priority === priorityFilter);
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery) {
      result = result.filter((s) =>
        decrypt(s.patient_reference).toLowerCase().includes(normalizedQuery),
      );
    }

    return result;
  }, [studies, statusFilter, priorityFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredStudies.length / pageSize));
  const paginatedStudies = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    return filteredStudies.slice(startIndex, startIndex + pageSize);
  }, [filteredStudies, currentPage, totalPages]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-4">
      {/* Quick filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { label: "All", value: "all" },
          { label: "Pending", value: "en_attente" },
          { label: "In progress", value: "en_cours" },
          { label: "Completed", value: "termine" },
          { label: "Cancelled", value: "annule" },
        ].map((chip) => (
          <button
            key={chip.value}
            type="button"
            aria-pressed={chipFilter === chip.value}
            onClick={() => handleChipClick(chip.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-heading transition-colors ${
              chipFilter === chip.value
                ? "bg-teal text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="w-full">
          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2 font-heading">
            Patient search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by patient reference"
              className="pl-9 bg-[#f8fafc] border-2 border-transparent rounded-xl focus-visible:border-teal focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-teal/6"
            />
          </div>
        </div>

        <div className="flex-1 min-w-48">
          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2 font-heading">
            Status
          </label>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setChipFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="bg-[#f8fafc] border-2 border-transparent rounded-xl focus:border-teal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="en_attente">Pending</SelectItem>
              <SelectItem value="en_cours">In progress</SelectItem>
              <SelectItem value="termine">Completed</SelectItem>
              <SelectItem value="annule">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-48">
          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2 font-heading">
            Priority
          </label>
          <Select
            value={priorityFilter}
            onValueChange={(value) => {
              setPriorityFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="bg-[#f8fafc] border-2 border-transparent rounded-xl focus:border-teal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Average</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(statusFilter !== "all" ||
          priorityFilter !== "all" ||
          searchQuery.trim() !== "") && (
          <div className="flex items-end">
            <button
              onClick={() => {
                setStatusFilter("all");
                setChipFilter("all");
                setPriorityFilter("all");
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-4">
          {filteredStudies.length}{" "}
          {filteredStudies.length !== 1 ? "studies" : "study"}
        </p>

        {loading ? (
          <StudyListSkeleton rows={pageSize} />
        ) : !error && filteredStudies.length === 0 ? (
          <EmptyState
            title={searchQuery.trim() ? "No results" : "No studies"}
            description={
              searchQuery.trim()
                ? `No study found for "${searchQuery.trim()}".`
                : "Submitted studies will appear here."
            }
          />
        ) : (
          <StudyList
            studies={paginatedStudies}
            loading={loading}
            error={error}
            role={role}
            currentUserId={currentUserId}
            onAssigned={onAssigned}
          />
        )}

        {!loading && !error && filteredStudies.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <p className="text-sm text-gray-500">
              Page {currentPage} sur {totalPages}
            </p>
            <Button
              variant="outline"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
