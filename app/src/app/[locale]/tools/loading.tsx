import { Skeleton } from "@/components/ui/skeleton";

export default function ToolsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Skeleton className="mb-8 h-10 w-48" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
