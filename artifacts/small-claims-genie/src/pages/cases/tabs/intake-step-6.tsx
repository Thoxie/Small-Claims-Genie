import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { i18n } from "@/lib/i18n";
import { FormsTab } from "./forms-tab";
import type { ExtendedCase } from "@/lib/types";

interface Props {
  caseId: number;
  initialData: ExtendedCase;
  onNext: (d: Record<string, unknown>) => void;
  onBack: () => void;
  saving?: boolean;
  onSaveExit: (d: Record<string, unknown>) => void;
}

export function IntakeStep6({ caseId, initialData, onNext, onBack, saving, onSaveExit }: Props) {
  return (
    <div className="space-y-4">
      <FormsTab
        caseId={caseId}
        currentCase={initialData}
        onSwitchToIntake={() => {}}
        onSwitchToPrep={() => onNext({})}
        isDraftMode={false}
      />
      <div className="flex justify-between items-center pt-2">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit({})} disabled={saving}>
            <LogOut className="mr-2 h-4 w-4" />
            Save &amp; Exit
          </Button>
        </div>
        <Button size="lg" onClick={() => onNext({})} disabled={saving}>
          {saving ? "Saving…" : i18n.intake.saveAndContinue}
        </Button>
      </div>
    </div>
  );
}
