import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/clerk-react";
import { usePurchaseStatus } from "@/hooks/usePurchaseStatus";
import { Loader2 } from "lucide-react";

export default function Start() {
  const { isLoaded, isSignedIn } = useAuth();
  const hasPurchase = usePurchaseStatus();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      navigate("/pricing", { replace: true });
      return;
    }

    if (hasPurchase === null) return;

    if (hasPurchase) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/pricing", { replace: true });
    }
  }, [isLoaded, isSignedIn, hasPurchase, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
