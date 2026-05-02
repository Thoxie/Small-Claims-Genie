import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { i18n } from "@/lib/i18n";
import { HearingPrepTab } from "./hearing-prep-tab";
import type { ExtendedCase } from "@/lib/types";

interface Props {
  caseId: number;
  initialData: ExtendedCase;
  onComplete: (d: Record<string, unknown>) => void;
  onBack: () => void;
  saving?: boolean;
  onSaveExit: (d: Record<string, unknown>) => void;
}

export function IntakeStep7({ caseId, initialData, onComplete, onBack, saving, onSaveExit }: Props) {
  return (
    <div className="space-y-4">
      {/* HeyGen hearing prep video */}
      <div className="rounded-xl overflow-hidden border border-border shadow-sm">
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src="https://app.heygen.com/embeds/fa72d99ef1f24cf1a4c6138f6d8aae6d"
            title="HeyGen video player"
            frameBorder="0"
            allow="encrypted-media; fullscreen;"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>

      <HearingPrepTab caseId={caseId} currentCase={initialData} isDraftMode={false} />
      <div className="flex justify-between items-center pt-2">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit({})} disabled={saving}>
            <LogOut className="mr-2 h-4 w-4" />
            Save &amp; Exit
          </Button>
        </div>
        <Button
          size="lg"
          onClick={() => onComplete({})}
          disabled={saving}
          data-testid="button-complete-intake"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8"
        >
          {saving ? "Saving…" : "Complete Intake ✓"}
        </Button>
      </div>
    </div>
  );
}
