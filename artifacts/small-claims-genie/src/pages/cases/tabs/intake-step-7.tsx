import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Play, X, ChevronRight } from "lucide-react";
import { i18n } from "@/lib/i18n";
import { HearingPrepTab } from "./hearing-prep-tab";
import type { ExtendedCase } from "@/lib/types";

interface Props {
  caseId: number;
  initialData: ExtendedCase;
  onComplete: (d: Record<string, unknown>) => void;
  onBack?: () => void;
  saving?: boolean;
  onSaveExit: (d: Record<string, unknown>) => void;
}

export function IntakeStep7({ caseId, initialData, onComplete, saving, onSaveExit }: Props) {
  const [tutorialOpen, setTutorialOpen] = useState(false);

  return (
    <div className="space-y-4">

      {/* Video tutorial card */}
      <div
        onClick={() => setTutorialOpen(true)}
        className="cursor-pointer group flex items-center gap-4 rounded-xl overflow-hidden border-2 border-[#14b8a6] shadow-md hover:shadow-lg transition-all hover:scale-[1.01] bg-white p-0"
        title="Watch the tutorial for this step"
      >
        <div className="relative bg-[#0f2537] h-[100px] w-[160px] shrink-0 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6]/30 via-transparent to-[#0f2537]" />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-[#14b8a6] flex items-center justify-center shadow-lg group-hover:bg-[#0d9488] transition-colors">
              <Play className="w-5 h-5 text-white ml-1" fill="white" />
            </div>
          </div>
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">~2 min</div>
          <div className="absolute top-2 left-2 bg-[#14b8a6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Step 7</div>
        </div>
        <div className="flex-1 px-2">
          <p className="text-sm font-bold text-gray-800">Watch: Prep for Your Hearing</p>
          <p className="text-xs text-muted-foreground mt-0.5">A short video walkthrough of what to expect and how to prepare for court.</p>
        </div>
        <ChevronRight className="w-5 h-5 text-[#14b8a6] shrink-0 mr-4" />
      </div>

      <HearingPrepTab caseId={caseId} currentCase={initialData} isDraftMode={false} />

      <div className="flex justify-between items-center pt-4 mt-4 border-t border-border">
        <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit({})} disabled={saving}>
          <LogOut className="mr-2 h-4 w-4" />
          Save &amp; Exit
        </Button>
        <Button
          size="lg"
          onClick={() => onComplete({})}
          disabled={saving}
          data-testid="button-complete-intake"
        >
          {saving ? "Saving…" : i18n.intake.saveAndContinue}
        </Button>
      </div>

      {/* Video modal — same pattern as all other intake steps */}
      {tutorialOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setTutorialOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-[95vw] max-h-[95vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b bg-[#f8fffe]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#14b8a6] flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Step 7 Tutorial — Prep for Your Hearing</p>
                  <p className="text-[10px] text-gray-500">Small Claims Genie Training Video</p>
                </div>
              </div>
              <button
                onClick={() => setTutorialOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              width="800"
              height="450"
              src="https://app.heygen.com/embeds/1ac88511fa1c4a5a9dd5b4d517cc46c5"
              title="HeyGen video player"
              frameBorder="0"
              allow="encrypted-media; fullscreen;"
              allowFullScreen
              className="block"
            />
            <div className="px-5 py-3 bg-[#f0fdf9] border-t flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-gray-600 flex-1 min-w-[200px]">
                Video plays above — click X or press Escape to return to your case.
              </p>
              <button
                onClick={() => setTutorialOpen(false)}
                className="text-xs font-semibold text-[#14b8a6] hover:text-[#0d9488] transition-colors"
              >
                Close &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
