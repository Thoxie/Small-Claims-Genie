import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DraftOverlayProps {
  children: React.ReactNode;
  isDraftMode: boolean;
  className?: string;
}

export function DraftOverlay({ children, isDraftMode, className }: DraftOverlayProps) {
  if (!isDraftMode) return <>{children}</>;

  return (
    <div className={`relative overflow-hidden rounded-lg ${className ?? ""}`}>
      {children}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
        <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
          <defs>
            <pattern id="draft-watermark-pattern" x="0" y="0" width="220" height="100" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
              <text x="0" y="60" fontSize="28" fontWeight="900" fill="#0d6b5e" fontFamily="Arial, sans-serif" opacity="0.07" letterSpacing="4">DRAFT</text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#draft-watermark-pattern)" />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-4">
          <div className="flex items-center gap-2 bg-white border border-[#0d6b5e]/30 rounded-full px-4 py-2 shadow-md">
            <Lock className="h-3.5 w-3.5 text-[#0d6b5e]" />
            <span className="text-xs font-semibold text-gray-700">Draft — Subscribe to unlock</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DraftLockedButtonProps {
  label?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
  fullWidth?: boolean;
}

export function DraftLockedButton({ label = "Subscribe to Download", size = "default", className = "", fullWidth = false }: DraftLockedButtonProps) {
  return (
    <Button
      disabled
      variant="outline"
      size={size}
      className={`gap-2 cursor-not-allowed border-dashed border-[#0d6b5e]/40 text-[#0d6b5e]/60 ${fullWidth ? "w-full" : ""} ${className}`}
    >
      <Lock className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

export function DraftModeBanner() {
  return (
    <div className="rounded-xl border-2 border-dashed border-[#0d6b5e]/30 bg-[#f0fffe] px-4 py-3 flex items-center gap-3">
      <Lock className="h-4 w-4 text-[#0d6b5e] shrink-0" />
      <p className="text-sm text-[#0d6b5e]">
        <span className="font-bold">Draft mode</span> — Subscribe to download, print, or save any document.
      </p>
    </div>
  );
}
