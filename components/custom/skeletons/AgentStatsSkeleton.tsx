export default function AgentStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          data-testid="stat-skeleton"
          className="animate-pulse rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <div className="mb-3 h-3 w-20 rounded bg-gray-200" />
          <div className="h-8 w-12 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
