import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

export function usePurchaseStatus(): boolean | null {
  const { getToken } = useAuth();
  const [hasPurchase, setHasPurchase] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    getToken().then(async (token) => {
      if (!token) { setHasPurchase(false); return; }
      try {
        const res = await fetch("/api/stripe/purchase-status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setHasPurchase(!!data.hasPurchase);
        } else {
          setHasPurchase(false);
        }
      } catch {
        if (!cancelled) setHasPurchase(false);
      }
    });
    return () => { cancelled = true; };
  }, [getToken]);

  return hasPurchase;
}
