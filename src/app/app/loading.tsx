import { Skeleton, SkeletonList } from "@/components/ui/skeleton";

export default function CustomerLoading() {
  return (
    <div className="p-6 flex flex-col gap-4">
      <Skeleton className="h-6 w-40" />
      <SkeletonList rows={3} />
    </div>
  );
}
