import { useEffect } from "react";
import { useLocation } from "wouter";
import { useListCases } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import logoPath from "@assets/2small-claims-genie-logo_1775074104796.png";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: cases, isLoading } = useListCases();

  useEffect(() => {
    if (isLoading) return;
    if (cases && cases.length > 0) {
      // Restore the last tab the user was on so they resume where they left off
      const caseId = cases[0].id;
      const savedTab = localStorage.getItem(`case-last-tab-${caseId}`);
      const hash = savedTab ? `#${savedTab}` : "";
      setLocation(`/cases/${caseId}${hash}`);
    } else {
      // No case yet — send them to create one
      setLocation("/cases/new");
    }
  }, [cases, isLoading, setLocation]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white">
      <img src={logoPath} alt="Small Claims Genie" className="h-20 w-auto opacity-80" />
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">Loading your case…</span>
      </div>
    </div>
  );
}
