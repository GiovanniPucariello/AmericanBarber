import { Skeleton, SkeletonList } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="p-6 flex flex-col gap-4">
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
      <SkeletonList rows={3} />
    </div>
  );
}
