import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/clerk-react";
import { usePurchaseStatus } from "@/hooks/usePurchaseStatus";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const TIMEOUT_MS = 10000;

export default function Start() {
  const { isLoaded, isSignedIn } = useAuth();
  const hasPurchase = usePurchaseStatus();
  const [, navigate] = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (hasPurchase !== null) return;

    const timer = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, hasPurchase]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      navigate("/sign-in?redirect=/start", { replace: true });
      return;
    }

    if (hasPurchase === null) return;

    if (hasPurchase) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/pricing", { replace: true });
    }
  }, [isLoaded, isSignedIn, hasPurchase, navigate]);

  if (timedOut && hasPurchase === null) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-muted-foreground text-sm">Having trouble verifying your account. Please try again.</p>
        <Button
          variant="outline"
          onClick={() => {
            setTimedOut(false);
            window.location.reload();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
