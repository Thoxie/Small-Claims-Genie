import { useEffect } from "react";
import { useLocation } from "wouter";
import { useListCases } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Resume() {
  const [, setLocation] = useLocation();
  const { data: cases, isLoading } = useListCases();

  useEffect(() => {
    if (isLoading || !cases) return;
    if (cases.length === 0) {
      setLocation("/cases/new");
    } else if (cases.length === 1) {
      setLocation(`/cases/${cases[0].id}`);
    } else {
      const mostRecent = cases.reduce((a, b) =>
        new Date(b.updatedAt ?? 0) > new Date(a.updatedAt ?? 0) ? b : a
      );
      setLocation(`/cases/${mostRecent.id}`);
    }
  }, [cases, isLoading, setLocation]);

  return (
    <div className="container mx-auto px-4 py-16 max-w-md flex flex-col items-center gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-4 w-56" />
    </div>
  );
}
