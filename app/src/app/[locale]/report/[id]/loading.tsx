import { Skeleton } from "@/components/ui/skeleton";

export default function ReportLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Skeleton className="mb-8 h-8 w-32" />
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="col-span-2 h-48 rounded-xl" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="mb-4 h-32 w-full rounded-xl" />
      ))}
    </div>
  );
}
