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
  "Contract Dispute",
  "Fraud",
  "Other",
];

export default function NewCase() {
  const [, setLocation] = useLocation();
  const { data: counties } = useListCounties();
  const createCase = useCreateCase();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [claimType, setClaimType] = useState("");
  const [countyId, setCountyId] = useState("");
  const [errors, setErrors] = useState<{ title?: string; claimType?: string; countyId?: string }>({});

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
      { data: { title: title.trim(), claimType, countyId } },
      {
        onSuccess: (newCase) => {
          setLocation(`/cases/${newCase.id}`);
        },
        onError: (err: any) => {
          toast({
            title: "Could not create your case",
            description: err?.message || "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

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

          {/* County — required */}
          <div>
            <label className="text-base font-semibold block mb-2">
              California County <span className="text-red-500">*</span>
            </label>
            <select
              className={`w-full h-14 px-3 rounded-md border bg-background text-base ${errors.countyId ? "border-red-500" : "border-input"}`}
              value={countyId}
              onChange={(e) => { setCountyId(e.target.value); setErrors((p) => ({ ...p, countyId: undefined })); }}
            >
              <option value="">Select your county</option>
              {counties?.map((county) => (
                <option key={county.id} value={county.id}>
                  {county.name} County
                </option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground mt-1">
              Usually where the defendant lives or where the incident happened.
            </p>
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
