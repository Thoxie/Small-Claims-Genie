import { useState } from "react";
import { Mail, Clock, Calendar, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ContactDialogProps {
  trigger?: React.ReactNode;
  triggerClassName?: string;
}

export function ContactDialog({ trigger, triggerClassName }: ContactDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className={triggerClassName} style={{ cursor: "pointer" }}>
          {trigger}
        </span>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className={triggerClassName ?? "text-xs text-primary/50 hover:text-primary underline underline-offset-2 transition-colors"}
        >
          Contact Support
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {/* Header */}
          <div className="bg-[#0d6b5e] px-6 pt-6 pb-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <MessageSquare className="h-4.5 w-4.5 text-white" />
              </div>
              <DialogHeader className="p-0 text-left">
                <DialogTitle className="text-white text-lg font-semibold leading-tight">
                  Contact Support
                </DialogTitle>
                <p className="text-white/70 text-[13px] font-normal mt-0.5">
                  We're here to help you succeed in court.
                </p>
              </DialogHeader>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#f0fdf9] flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="h-4 w-4 text-[#0d6b5e]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                  Email Us
                </p>
                <a
                  href="mailto:Support@SmallClaimsGenie.com"
                  className="text-[#0d6b5e] font-semibold text-sm hover:underline"
                >
                  Support@SmallClaimsGenie.com
                </a>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Response time */}
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#f0fdf9] flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="h-4 w-4 text-[#0d6b5e]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                  Response Time
                </p>
                <p className="text-sm font-medium text-foreground">
                  Within 24 hours
                </p>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Availability */}
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#f0fdf9] flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="h-4 w-4 text-[#0d6b5e]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                  Support Hours
                </p>
                <p className="text-sm font-medium text-foreground">
                  Monday – Saturday
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  9:00 AM – 6:00 PM Pacific Standard Time
                </p>
              </div>
            </div>

            {/* Footer note */}
            <div className="bg-muted/50 rounded-lg px-4 py-3 mt-1">
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                For the fastest response, please include your case type and a brief description of your question.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
