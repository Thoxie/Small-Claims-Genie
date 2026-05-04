import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { i18n } from "@/lib/i18n";
import { DemandLetterTab } from "./demand-letter-tab";
import type { ExtendedCase } from "@/lib/types";

interface Props {
  caseId: number;
  initialData: ExtendedCase;
  onNext: (d: Record<string, unknown>) => void;
  onBack: () => void;
  saving?: boolean;
  onSaveExit: (d: Record<string, unknown>) => void;
}

export function IntakeStep4({ caseId, initialData, onNext, onBack, saving, onSaveExit }: Props) {
  return (
    <div className="space-y-4">
      <DemandLetterTab caseId={caseId} currentCase={initialData} />
      <div className="flex justify-between items-center pt-4 mt-4 border-t border-border">
        <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit({})} disabled={saving}>
          <LogOut className="mr-2 h-4 w-4" />
          Save &amp; Exit
        </Button>
        <Button size="lg" onClick={() => onNext({})} disabled={saving}>
          {saving ? "Saving…" : i18n.intake.saveAndContinue}
        </Button>
      </div>
    </div>
  );
}
