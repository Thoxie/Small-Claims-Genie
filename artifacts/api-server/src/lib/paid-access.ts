import { userHasBetaAccess } from "./beta";
import { userHasPurchase } from "./purchases";

export type PaidAccessSource = "purchase" | "beta" | null;

export type PaidAccessStatus = {
  hasAccess: boolean;
  hasPurchase: boolean;
  hasBetaAccess: boolean;
  accessSource: PaidAccessSource;
};

export async function getPaidAccessStatus(userId: string): Promise<PaidAccessStatus> {
  const [hasPurchase, hasBetaAccess] = await Promise.all([
    userHasPurchase(userId),
    userHasBetaAccess(userId),
  ]);

  const accessSource: PaidAccessSource = hasPurchase
    ? "purchase"
    : hasBetaAccess
      ? "beta"
      : null;

  return {
    hasAccess: accessSource !== null,
    hasPurchase,
    hasBetaAccess,
    accessSource,
  };
}