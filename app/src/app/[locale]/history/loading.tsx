import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Skeleton className="mb-6 h-10 w-36" />
      <Skeleton className="mb-4 h-10 w-full rounded-lg" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
