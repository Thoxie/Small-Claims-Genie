import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Play, X, ChevronRight } from "lucide-react";
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
  const [tutorialOpen, setTutorialOpen] = useState(false);

  return (
    <div className="space-y-4">

      {/* ── Top row: label on left, video card on right ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">
            Step 3 — Send a Demand Letter before going to court. Generate a professional letter below.
          </p>
        </div>

        {/* Video tutorial card — mirrors Steps 1 & 2 */}
        <div
          onClick={() => setTutorialOpen(true)}
          className="cursor-pointer group flex-shrink-0 w-[220px] rounded-xl overflow-hidden border-2 border-[#14b8a6] shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
          title="Watch the tutorial for this step"
        >
          <div className="relative bg-[#0f2537] h-[120px] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6]/30 via-transparent to-[#0f2537]" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#14b8a6] flex items-center justify-center shadow-lg group-hover:bg-[#0d9488] transition-colors">
                <Play className="w-5 h-5 text-white ml-1" fill="white" />
              </div>
              <span className="text-white text-xs font-semibold opacity-90">Watch Tutorial</span>
            </div>
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">~3 min</div>
            <div className="absolute top-2 left-2 bg-[#14b8a6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Step 3</div>
          </div>
          <div className="bg-background px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold">Demand Letter</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Generate your pre-litigation letter</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#14b8a6] shrink-0" />
          </div>
        </div>
      </div>

      {/* Demand letter content */}
      <DemandLetterTab caseId={caseId} currentCase={initialData} />

      {/* Nav buttons */}
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

      {/* ── Tutorial modal ── */}
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
                  <p className="text-sm font-bold text-gray-800">Step 3 Tutorial — Demand Letter Generator</p>
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
            <a
              href="https://youtu.be/o0twRB6_k_4"
              target="_blank"
              rel="noopener noreferrer"
              className="relative block bg-black overflow-hidden"
              style={{ aspectRatio: "16 / 9", maxHeight: "calc(95vh - 110px)" }}
            >
              <img
                src="https://img.youtube.com/vi/o0twRB6_k_4/hqdefault.jpg"
                alt="Small Claims Genie Step 3 Tutorial"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-xl hover:bg-red-500 transition-colors">
                  <svg className="w-9 h-9 text-white ml-1.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <span className="text-white text-sm font-semibold drop-shadow-lg bg-black/40 px-3 py-1 rounded-full">
                  Watch tutorial on YouTube ↗
                </span>
              </div>
            </a>
            <div className="px-5 py-3 bg-[#f0fdf9] border-t flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-gray-600 flex-1 min-w-[200px]">
                Click the thumbnail above to watch the tutorial on YouTube.
              </p>
              <button
                onClick={() => setTutorialOpen(false)}
                className="text-xs font-semibold text-[#14b8a6] hover:text-[#0d9488] transition-colors"
              >
                Close &amp; Start Filling
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
