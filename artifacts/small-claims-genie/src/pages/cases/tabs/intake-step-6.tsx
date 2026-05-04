import { Button } from "@/components/ui/button";
import { LogOut, Sparkles, ChevronRight } from "lucide-react";
import { i18n } from "@/lib/i18n";
import { FormsTab } from "./forms-tab";
import type { ExtendedCase } from "@/lib/types";

interface Props {
  caseId: number;
  initialData: ExtendedCase;
  onNext: (d: Record<string, unknown>) => void;
  onBack?: () => void;
  saving?: boolean;
  onSaveExit: (d: Record<string, unknown>) => void;
  onAiCheck?: () => void;
}

export function IntakeStep6({ caseId, initialData, onNext, saving, onSaveExit, onAiCheck }: Props) {
  return (
    <div className="space-y-4">
      <FormsTab
        caseId={caseId}
        currentCase={initialData}
        onSwitchToIntake={() => {}}
        onSwitchToPrep={() => onNext({})}
        isDraftMode={false}
      />
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
        <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit({})} disabled={saving}>
          <LogOut className="mr-2 h-4 w-4" />
          Save &amp; Exit
        </Button>
        <Button type="button" size="lg" onClick={onAiCheck} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
          <Sparkles className="h-4 w-4" /> AI Check My Case
        </Button>
        <Button size="lg" onClick={() => onNext({})} disabled={saving} className="gap-2">
          {saving ? "Saving…" : i18n.intake.saveAndContinue}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
