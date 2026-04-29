import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { i18n } from "@/lib/i18n";
import { DemandLetterTab } from "./demand-letter-tab";

interface Props {
  caseId: number;
  initialData: any;
  onNext: (d: any) => void;
  onBack: () => void;
  saving?: boolean;
  onSaveExit: (d: any) => void;
}

export function IntakeStep3({ caseId, initialData, onNext, onBack, saving, onSaveExit }: Props) {
  return (
    <div className="space-y-4">
      <DemandLetterTab caseId={caseId} currentCase={initialData} />
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
