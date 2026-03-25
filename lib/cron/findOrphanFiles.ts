/**
 * Pure utility for detecting orphaned upload files in Supabase Storage.
 *
 * An orphan is a file in the bucket that:
 *   1. Is NOT referenced by any studies.file_path in the DB
 *   2. Was created more than `ttlHours` ago (default: 24h)
 *
 * Extracted as a pure function so it can be unit-tested without any DB/Storage access.
 */

export interface BucketObject {
  name: string;
  created_at: string; // ISO 8601
}

/**
 * Returns paths of orphaned files that should be deleted.
 *
 * @param bucketObjects - All objects currently in the bucket
 * @param studyFilePaths - All file_path values from the `studies` table (non-null)
 * @param ttlHours - Minimum age in hours before a file is considered orphaned
 */
export function findOrphanPaths(
  bucketObjects: BucketObject[],
  studyFilePaths: string[],
  ttlHours: number,
): string[] {
  const linkedPaths = new Set(studyFilePaths);
  const cutoff = new Date(Date.now() - ttlHours * 60 * 60 * 1000);

  return bucketObjects
    .filter((obj) => {
      const isLinked = linkedPaths.has(obj.name);
      const isOldEnough = new Date(obj.created_at) < cutoff;
      return !isLinked && isOldEnough;
    })
    .map((obj) => obj.name);
}
