import { Button } from "@/components/ui/button";
import { Home, Sparkles, ChevronRight } from "lucide-react";
import { i18n } from "@/lib/i18n";
import { DemandLetterTab } from "./demand-letter-tab";
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

export function IntakeStep4({ caseId, initialData, onNext, saving, onSaveExit, onAiCheck }: Props) {
  return (
    <div className="space-y-4">
      <DemandLetterTab caseId={caseId} currentCase={initialData} />
      <div className="sticky bottom-0 z-10 bg-white border-t border-border flex items-center justify-between pl-6 py-2 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] -mx-4" style={{ paddingRight: '165px' }}>
        <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit({})}>
          <Home className="mr-2 h-4 w-4" />
          Save &amp; Exit
        </Button>
        <Button type="button" size="lg" onClick={onAiCheck} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
          <Sparkles className="h-4 w-4" /> AI Genie Check My Case
        </Button>
        <Button type="button" size="lg" onClick={() => onNext({})} disabled={saving} className="gap-2" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
          {saving ? "Saving…" : i18n.intake.saveAndContinue}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
