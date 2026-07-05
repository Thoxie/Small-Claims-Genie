import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, Sparkles, Eraser, ChevronRight } from "lucide-react";
import { ChatTab } from "./chat-tab";
import { i18n } from "@/lib/i18n";

import type { ExtendedCase } from "@/lib/types";

interface Props {
  caseId: number;
  initialData: Partial<ExtendedCase>;
  onNext: (d: Record<string, unknown>) => void;
  onBack?: () => void;
  saving?: boolean;
  onCheckCase?: () => void;
  onSaveExit: (d: Record<string, unknown>) => void;
  autoCheckMessage?: string;
  onAutoMessageSent?: () => void;
}

// Step 5 is always the full-screen AI Genie Case Review chat — the same
// experience whether reached via the outer step tracker or by clicking
// "Save & Continue" from Step 4. There is no form here.
export function IntakeStep5({ caseId, initialData, onNext, saving, onCheckCase, onSaveExit, autoCheckMessage, onAutoMessageSent }: Props) {
  const [isTyping, setIsTyping] = useState(false);

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 165px)", minHeight: "420px" }}>
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-lg border shadow-sm overflow-hidden">
        <ChatTab
          caseId={caseId}
          isDraftMode={false}
          currentCase={initialData as ExtendedCase}
          autoMessage={autoCheckMessage}
          onAutoMessageSent={onAutoMessageSent}
          hideTutorial={true}
          freshReview={false}
          pageContext="chat"
          onTypingChange={setIsTyping}
        />
      </div>

      <div className="sticky bottom-0 z-10 bg-white border-t border-border flex items-center justify-between px-4 sm:pl-6 sm:pr-[165px] py-2 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] -mx-8 mt-2">
        <Button type="button" variant="ghost" size="lg" className="px-2 sm:px-8" onClick={() => onSaveExit({})}>
          <Home className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Save &amp; Exit</span>
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="gap-1 sm:gap-2 px-2 sm:px-6 border-[#14b8a6] text-[#0d6b5e] hover:bg-[#f0fffe]"
          onClick={() => window.dispatchEvent(new CustomEvent('ai-genie-clear-chat'))}
        >
          <Eraser className="h-4 w-4" />
          <span className="hidden sm:inline">Clear Chat</span>
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={onCheckCase}
          disabled={isTyping || !!autoCheckMessage}
          className="bg-amber-500 hover:bg-amber-600 text-white gap-1 sm:gap-2 px-2 sm:px-8"
        >
          <Sparkles className="h-4 w-4" />
          <span className="sm:hidden">AI Check</span>
          <span className="hidden sm:inline"> AI Genie Check My Case</span>
        </Button>
        <Button type="button" size="lg" onClick={() => onNext({})} disabled={saving} className="gap-2 px-2 sm:px-4">
          <span className="sm:hidden">{saving ? "Saving…" : "Continue"}</span>
          <span className="hidden sm:inline">{saving ? "Saving…" : i18n.intake.saveAndContinue}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
