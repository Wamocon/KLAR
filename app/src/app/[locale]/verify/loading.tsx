import { Skeleton } from "@/components/ui/skeleton";

export default function VerifyLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Skeleton className="mx-auto mb-2 h-10 w-48" />
      <Skeleton className="mx-auto mb-8 h-6 w-80" />
      <Skeleton className="mb-4 h-48 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}
