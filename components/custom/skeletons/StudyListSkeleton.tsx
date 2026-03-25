interface Props {
  rows?: number;
}

export default function StudyListSkeleton({ rows = 5 }: Props) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          data-testid="skeleton-row"
          className="animate-pulse flex items-center gap-4 rounded-md border border-gray-100 bg-white p-4"
        >
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="ml-auto h-4 w-16 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
