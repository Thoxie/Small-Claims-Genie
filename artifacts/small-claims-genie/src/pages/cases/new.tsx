import { useState } from "react";
import { useLocation } from "wouter";
import { useListCounties, useCreateCase } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const CLAIM_TYPES = [
  "Money Owed",
  "Unpaid Debt",
  "Security Deposit",
  "Property Damage",
  "Vehicle Damage/Accident",
  "Landlord/Tenant Dispute",
  "Online Purchase/Marketplace Dispute",
  "Unpaid Wages/Employment",
  "Contract Dispute",
  "Fraud",
  "Other",
];

type JurisdictionState = "CA" | "FL" | "IL" | "NC" | "NJ" | "TX" | "VA" | "WA";

const STATE_OPTIONS: { value: JurisdictionState; label: string; flag: string; sub: string }[] = [
  { value: "CA", label: "California", flag: "🌴", sub: "Up to $12,500" },
  { value: "FL", label: "Florida", flag: "☀️", sub: "Up to $8,000" },
  { value: "IL", label: "Illinois", flag: "🌽", sub: "Up to $10,000" },
  { value: "NC", label: "North Carolina", flag: "🏛️", sub: "Up to $10,000" },
  { value: "NJ", label: "New Jersey", flag: "🌊", sub: "Up to $5,000" },
  { value: "TX", label: "Texas", flag: "⭐", sub: "Up to $20,000" },
  { value: "VA", label: "Virginia", flag: "🦅", sub: "Up to $5,000" },
  { value: "WA", label: "Washington", flag: "🏔️", sub: "Up to $10,000" },
];

export default function NewCase() {
  const [, setLocation] = useLocation();
  const createCase = useCreateCase();
  const { toast } = useToast();

  const [jurisdictionState, setJurisdictionState] = useState<JurisdictionState>("CA");
  const { data: counties } = useListCounties({ state: jurisdictionState });

  const [title, setTitle] = useState("");
  const [claimType, setClaimType] = useState("");
  const [countyId, setCountyId] = useState("");
  const [errors, setErrors] = useState<{ title?: string; claimType?: string; countyId?: string }>({});

  const handleStateChange = (s: JurisdictionState) => {
    setJurisdictionState(s);
    setCountyId("");
  };

  const handleSubmit = () => {
    const newErrors: { title?: string; claimType?: string; countyId?: string } = {};
    if (title.trim().length < 3) newErrors.title = "Please enter a title (at least 3 characters)";
    if (!claimType) newErrors.claimType = "Please select a claim type";
    if (!countyId) newErrors.countyId = "Please select a county";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    createCase.mutate(
      { data: { title: title.trim(), claimType, countyId, jurisdictionState } },
      {
        onSuccess: (newCase) => {
          setLocation(`/cases/${newCase.id}`);
        },
        onError: (err: Error) => {
          toast({
            title: "Could not create your case",
            description: err?.message || "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const selectedCounty = counties?.find((c) => c.id === countyId);

  const countyLabel =
    jurisdictionState === "CA" ? "California County" :
    jurisdictionState === "IL" ? "Illinois County" :
    jurisdictionState === "TX" ? "Texas County" :
    jurisdictionState === "NC" ? "North Carolina County" :
    jurisdictionState === "VA" ? "Virginia County/City" :
    jurisdictionState === "NJ" ? "New Jersey County" :
    jurisdictionState === "WA" ? "Washington County" :
    "Florida County";
  const countyHint =
    jurisdictionState === "CA"
      ? "Usually where the defendant lives or where the incident happened."
      : "Usually where the defendant lives, where the contract was signed, or where the incident happened.";

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card className="border-2 shadow-lg">
        <CardHeader className="pb-6 border-b bg-muted/20">
          <CardTitle className="text-3xl">Start Your Case</CardTitle>
          <CardDescription className="text-base text-muted-foreground mt-2">
            Fill in the basics to get started. You can add more details after.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8 space-y-8">

          {/* State selector */}
          <div>
            <label className="text-base font-semibold block mb-2">
              Which state are you filing in?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STATE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStateChange(opt.value)}
                  className={`flex flex-col items-center justify-center gap-1 px-4 py-4 rounded-lg border-2 transition-all ${
                    jurisdictionState === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:border-primary/50 text-foreground"
                  }`}
                >
                  <span className="text-2xl">{opt.flag}</span>
                  <span className="font-semibold text-sm">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Case Title */}
          <div>
            <label className="text-base font-semibold block mb-2">
              What is this case about?
            </label>
            <Input
              placeholder="e.g., Unpaid Rent from John Smith"
              className="h-14 text-lg"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: undefined })); }}
            />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
          </div>

          {/* Claim Type */}
          <div>
            <label className="text-base font-semibold block mb-2">
              Type of claim
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CLAIM_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setClaimType(type); setErrors((p) => ({ ...p, claimType: undefined })); }}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                    claimType === type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            {errors.claimType && <p className="text-sm text-destructive mt-1">{errors.claimType}</p>}
          </div>

          {/* County */}
          <div>
            <label className="text-base font-semibold block mb-2">
              {countyLabel} <span className="text-red-500">*</span>
            </label>
            <select
              className={`w-full h-14 px-3 rounded-md border bg-background text-base ${errors.countyId ? "border-red-500" : "border-input"}`}
              value={countyId}
              onChange={(e) => { setCountyId(e.target.value); setErrors((p) => ({ ...p, countyId: undefined })); }}
            >
              <option value="">Select your county</option>
              {[...(counties ?? [])]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((county) => (
                  <option key={county.id} value={county.id}>
                    {county.name} County
                  </option>
                ))}
            </select>
            <p className="text-sm text-muted-foreground mt-1">{countyHint}</p>
            {jurisdictionState === "IL" && selectedCounty?.filingFeeUnder10000 != null && (
              <p className="text-sm text-muted-foreground mt-1">
                Filing fee: <span className="font-medium text-foreground">${selectedCounty.filingFeeUnder10000}</span> (up to $10,000 · may vary by claim amount)
              </p>
            )}
            {(selectedCounty?.state === "CA" || selectedCounty?.state === "TX") && selectedCounty.filingFeeUnder1500 != null && (
              <p className="text-sm text-muted-foreground mt-1">
                Filing fee:{" "}
                <span className="font-medium text-foreground">${selectedCounty.filingFeeUnder1500}</span> (≤$1,500){" "}
                · <span className="font-medium text-foreground">${selectedCounty.filingFee1500to5000}</span> ($1,500–$5,000){" "}
                · <span className="font-medium text-foreground">${selectedCounty.filingFeeOver5000}</span> (&gt;$5,000)
              </p>
            )}
            {errors.countyId && <p className="text-sm text-destructive mt-1">{errors.countyId}</p>}
          </div>

          {/* Submit */}
          <Button
            type="button"
            className="w-full h-14 text-lg font-bold"
            disabled={createCase.isPending}
            onClick={handleSubmit}
          >
            {createCase.isPending ? "Creating your case…" : "Create My Case →"}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
