export type StudyScope = "mine" | "institution";

export function parseScopeParam(raw: string | null): StudyScope {
  if (raw === "institution") return "institution";
  return "mine";
}

export interface ScopeFilterDescriptor {
  scope: StudyScope;
  userId: string;
  applyClientIdFilter: boolean;
}

export function buildClientScopeFilter(
  scope: StudyScope,
  userId: string,
): ScopeFilterDescriptor {
  return {
    scope,
    userId,
    applyClientIdFilter: scope === "mine",
  };
}

export function shouldAuditAccess(
  requesterId: string,
  studyOwnerId: string | null,
): boolean {
  if (studyOwnerId === null) return false;
  return requesterId !== studyOwnerId;
}
