import { Skeleton } from "@/components/ui/skeleton";

export default function SignupLoading() {
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <Skeleton className="mx-auto mb-6 h-10 w-40" />
      <Skeleton className="mb-4 h-12 w-full rounded-xl" />
      <Skeleton className="mb-4 h-12 w-full rounded-xl" />
      <Skeleton className="mb-4 h-12 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
