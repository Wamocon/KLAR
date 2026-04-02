export default function BenchmarkLoading() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-80 rounded bg-muted" />
        <div className="h-5 w-96 rounded bg-muted" />
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
