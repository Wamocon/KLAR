import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Skeleton className="mb-8 h-10 w-48" />
      <Skeleton className="mb-6 h-40 w-full rounded-xl" />
      <Skeleton className="mb-6 h-32 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
