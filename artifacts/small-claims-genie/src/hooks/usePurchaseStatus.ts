import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 1500;

export function usePurchaseStatus(): boolean | null {
  const { getToken, isSignedIn } = useAuth();
  const [hasPurchase, setHasPurchase] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;
    let attempts = 0;

    async function check() {
      if (cancelled || attempts >= MAX_ATTEMPTS) return;
      attempts++;

      try {
        const token = await getToken();
        if (cancelled) return;

        if (!token) {
          if (attempts < MAX_ATTEMPTS) setTimeout(check, RETRY_DELAY_MS);
          return;
        }

        const res = await fetch("/api/stripe/purchase-status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          setHasPurchase(!!data.hasPurchase);
        } else if (attempts < MAX_ATTEMPTS) {
          setTimeout(check, RETRY_DELAY_MS);
        }
      } catch {
        if (!cancelled && attempts < MAX_ATTEMPTS) {
          setTimeout(check, RETRY_DELAY_MS);
        }
      }
    }

    check();
    return () => { cancelled = true; };
  }, [getToken, isSignedIn]);

  return hasPurchase;
}
