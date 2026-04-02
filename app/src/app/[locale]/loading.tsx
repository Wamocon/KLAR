import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Skeleton className="mb-6 h-10 w-64" />
      <Skeleton className="mb-4 h-6 w-full" />
      <Skeleton className="mb-4 h-6 w-3/4" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
