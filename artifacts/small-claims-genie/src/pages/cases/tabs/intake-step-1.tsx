import { useState } from "react";
import { useListCounties } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LogOut } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { i18n } from "@/lib/i18n";
import { formatPhone, intakeStep1Schema } from "./shared";

interface Props {
  initialData: any;
  onNext: (d: any) => void;
  onBack: () => void;
  saving?: boolean;
  onSaveExit: (d: any) => void;
}

export function IntakeStep1({ initialData, onNext, saving, onSaveExit }: Props) {
  const { data: counties } = useListCounties();

  const [plaintiffMailingDiffers, setPlaintiffMailingDiffers] = useState(
    !!(initialData.plaintiffMailingAddress)
  );
  const [defendantMailingDiffers, setDefendantMailingDiffers] = useState(
    !!(initialData.defendantMailingAddress)
  );
  const [agentAddressExpanded, setAgentAddressExpanded] = useState(
    !!(initialData.defendantAgentStreet)
  );

  const form = useForm({
    resolver: zodResolver(intakeStep1Schema),
    defaultValues: {
      countyId: initialData.countyId || "",
      courthouseId: initialData.courthouseId || "",
      plaintiffName: initialData.plaintiffName || "",
      plaintiffIsBusiness: initialData.plaintiffIsBusiness || false,
      secondPlaintiffName: initialData.secondPlaintiffName || "",
      plaintiffTitle: initialData.plaintiffTitle || "",
      plaintiffPhone: initialData.plaintiffPhone || "",
      plaintiffAddress: initialData.plaintiffAddress || "",
      plaintiffCity: initialData.plaintiffCity || "",
      plaintiffState: initialData.plaintiffState || "CA",
      plaintiffZip: initialData.plaintiffZip || "",
      plaintiffEmail: initialData.plaintiffEmail || "",
      plaintiffMailingAddress: initialData.plaintiffMailingAddress || "",
      plaintiffMailingCity: initialData.plaintiffMailingCity || "",
      plaintiffMailingState: initialData.plaintiffMailingState || "CA",
      plaintiffMailingZip: initialData.plaintiffMailingZip || "",
      secondPlaintiffPhone: initialData.secondPlaintiffPhone || "",
      secondPlaintiffAddress: initialData.secondPlaintiffAddress || "",
      secondPlaintiffCity: initialData.secondPlaintiffCity || "",
      secondPlaintiffState: initialData.secondPlaintiffState || "CA",
      secondPlaintiffZip: initialData.secondPlaintiffZip || "",
      secondPlaintiffEmail: initialData.secondPlaintiffEmail || "",
      defendantIsBusinessOrEntity: initialData.defendantIsBusinessOrEntity || false,
      defendantName: initialData.defendantName || "",
      defendantAgentName: initialData.defendantAgentName || "",
      defendantAgentTitle: initialData.defendantAgentTitle || "",
      defendantAgentStreet: initialData.defendantAgentStreet || "",
      defendantAgentCity: initialData.defendantAgentCity || "",
      defendantAgentState: initialData.defendantAgentState || "CA",
      defendantAgentZip: initialData.defendantAgentZip || "",
      defendantPhone: initialData.defendantPhone || "",
      defendantAddress: initialData.defendantAddress || "",
      defendantCity: initialData.defendantCity || "",
      defendantState: initialData.defendantState || "CA",
      defendantZip: initialData.defendantZip || "",
      defendantMailingAddress: initialData.defendantMailingAddress || "",
      defendantMailingCity: initialData.defendantMailingCity || "",
      defendantMailingState: initialData.defendantMailingState || "CA",
      defendantMailingZip: initialData.defendantMailingZip || "",
    }
  });

  const isBusiness = form.watch("defendantIsBusinessOrEntity");
  const plaintiffIsBusiness = form.watch("plaintiffIsBusiness");
  const selectedCountyId = form.watch("countyId");
  const selectedCourthouseId = form.watch("courthouseId");

  const selectedCounty = counties?.find((c: any) => c.id === selectedCountyId);
  const hasMultipleCourthouses = selectedCounty?.courthouses && selectedCounty.courthouses.length > 0;
  const selectedCourthouse = hasMultipleCourthouses
    ? selectedCounty.courthouses.find((ch: any) => ch.id === selectedCourthouseId)
    : null;

  const courtName = selectedCourthouse?.name ?? selectedCounty?.courthouseName;
  const courtAddress = selectedCourthouse
    ? `${selectedCourthouse.address}, ${selectedCourthouse.city}, CA ${selectedCourthouse.zip}`
    : selectedCounty ? `${selectedCounty.courthouseAddress}, ${selectedCounty.courthouseCity}, CA ${selectedCounty.courthouseZip}` : "";
  const courtPhone = selectedCourthouse?.phone ?? selectedCounty?.phone;

  const handleSubmit = (data: any) => {
    if (!plaintiffMailingDiffers) {
      data.plaintiffMailingAddress = "";
      data.plaintiffMailingCity = "";
      data.plaintiffMailingState = "";
      data.plaintiffMailingZip = "";
    }
    if (!defendantMailingDiffers) {
      data.defendantMailingAddress = "";
      data.defendantMailingCity = "";
      data.defendantMailingState = "";
      data.defendantMailingZip = "";
    }
    if (!agentAddressExpanded || !isBusiness) {
      data.defendantAgentStreet = "";
      data.defendantAgentCity = "";
      data.defendantAgentState = "";
      data.defendantAgentZip = "";
    }
    onNext({
      ...data,
      courthouseName: courtName || null,
      courthouseAddress: selectedCourthouse?.address ?? selectedCounty?.courthouseAddress ?? null,
      courthouseCity: selectedCourthouse?.city ?? selectedCounty?.courthouseCity ?? null,
      courthouseZip: selectedCourthouse?.zip ?? selectedCounty?.courthouseZip ?? null,
      courthousePhone: courtPhone || null,
      courthouseWebsite: selectedCounty?.website ?? null,
      courthouseClerkEmail: selectedCounty?.clerkEmail ?? null,
    });
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

          <div className="rounded-xl border bg-muted/20 p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Filing County &amp; Court</h3>
            <div className="flex flex-wrap gap-3 items-end mb-3">
              <FormField control={form.control} name="countyId" render={({ field }) => (
                <FormItem className="flex-1 min-w-[200px]">
                  <FormLabel className="font-semibold">California County <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={(v) => { field.onChange(v); form.setValue("courthouseId", ""); }} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select your county" /></SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72 overflow-y-auto">
                      {counties?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} County</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {hasMultipleCourthouses && (
                <FormField control={form.control} name="courthouseId" render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel className="font-semibold">Courthouse Location</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select courthouse" /></SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72 overflow-y-auto">
                        {selectedCounty.courthouses.map((ch: any) => (
                          <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>
            {selectedCounty && courtName && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-background border px-4 py-2.5 text-sm">
                <span className="font-semibold text-foreground">{courtName}</span>
                {courtAddress && <span className="text-muted-foreground">{courtAddress}</span>}
                {courtPhone && <span className="text-muted-foreground">{courtPhone}</span>}
                {selectedCounty?.website && (
                  <a href={selectedCounty.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium inline-flex items-center gap-0.5">
                    Court website ↗
                  </a>
                )}
              </div>
            )}
            {selectedCountyId && !courtName && <p className="text-xs text-muted-foreground italic">Loading court information…</p>}
            {!selectedCountyId && <p className="text-xs text-muted-foreground">Select a county to see the court location.</p>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ── Plaintiff ── */}
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Your Information (Plaintiff)</h3>
              <FormField control={form.control} name="plaintiffIsBusiness" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border p-3 bg-muted/20">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-normal cursor-pointer">I am filing as a business or organization</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="plaintiffName" render={({ field }) => (
                <FormItem>
                  <FormLabel>{plaintiffIsBusiness ? "Business / Organization Name" : "Your Full Name"} <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {plaintiffIsBusiness && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="secondPlaintiffName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name (Individual) <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input {...field} placeholder="First Last" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="plaintiffTitle" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Title / Position</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Owner, President" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="plaintiffPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input {...field} placeholder="(555) 555-5555" value={field.value} onChange={(e) => field.onChange(formatPhone(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="plaintiffEmail" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="plaintiffAddress" render={({ field }) => (
                <FormItem><FormLabel>Street Address <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-5 gap-2">
                <FormField control={form.control} name="plaintiffCity" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="plaintiffState" render={({ field }) => (
                  <FormItem className="col-span-1"><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="plaintiffZip" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>ZIP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              {/* Mailing address toggle */}
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="plaintiff-mailing-toggle"
                  checked={plaintiffMailingDiffers}
                  onCheckedChange={(v) => setPlaintiffMailingDiffers(!!v)}
                />
                <label htmlFor="plaintiff-mailing-toggle" className="text-sm text-muted-foreground cursor-pointer select-none">
                  My mailing address is different from my street address
                </label>
              </div>
              {plaintiffMailingDiffers && (
                <div className="rounded-lg border border-dashed p-3 space-y-3 bg-muted/10">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mailing Address</p>
                  <FormField control={form.control} name="plaintiffMailingAddress" render={({ field }) => (
                    <FormItem><FormLabel>Street</FormLabel><FormControl><Input {...field} placeholder="P.O. Box or different street" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-5 gap-2">
                    <FormField control={form.control} name="plaintiffMailingCity" render={({ field }) => (
                      <FormItem className="col-span-2"><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="plaintiffMailingState" render={({ field }) => (
                      <FormItem className="col-span-1"><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="plaintiffMailingZip" render={({ field }) => (
                      <FormItem className="col-span-2"><FormLabel>ZIP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>
              )}
            </div>

            {/* ── Defendant ── */}
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Defendant Information</h3>
              <FormField control={form.control} name="defendantIsBusinessOrEntity" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border p-3 bg-muted/20">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-normal cursor-pointer">I am suing a business or public entity</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="defendantName" render={({ field }) => (
                <FormItem><FormLabel>{isBusiness ? "Business Name" : "Full Name"} <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              {/* Agent for service (business/entity defendants) */}
              {isBusiness && (
                <div className="rounded-lg border border-dashed p-3 space-y-3 bg-muted/10">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Agent for Service of Process</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="defendantAgentName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent Name (if known)</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. John Smith" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="defendantAgentTitle" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title (if known)</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. CEO, Registered Agent" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="agent-address-toggle"
                      checked={agentAddressExpanded}
                      onCheckedChange={(v) => setAgentAddressExpanded(!!v)}
                    />
                    <label htmlFor="agent-address-toggle" className="text-sm text-muted-foreground cursor-pointer select-none">
                      Agent's address differs from business address
                    </label>
                  </div>
                  {agentAddressExpanded && (
                    <div className="space-y-2">
                      <FormField control={form.control} name="defendantAgentStreet" render={({ field }) => (
                        <FormItem><FormLabel>Agent Street Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <div className="grid grid-cols-5 gap-2">
                        <FormField control={form.control} name="defendantAgentCity" render={({ field }) => (
                          <FormItem className="col-span-2"><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="defendantAgentState" render={({ field }) => (
                          <FormItem className="col-span-1"><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="defendantAgentZip" render={({ field }) => (
                          <FormItem className="col-span-2"><FormLabel>ZIP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <FormField control={form.control} name="defendantPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input {...field} placeholder="(555) 555-5555" value={field.value} onChange={(e) => field.onChange(formatPhone(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="defendantAddress" render={({ field }) => (
                <FormItem><FormLabel>Street Address <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-5 gap-2">
                <FormField control={form.control} name="defendantCity" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="defendantState" render={({ field }) => (
                  <FormItem className="col-span-1"><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="defendantZip" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>ZIP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              {/* Defendant mailing address toggle */}
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="defendant-mailing-toggle"
                  checked={defendantMailingDiffers}
                  onCheckedChange={(v) => setDefendantMailingDiffers(!!v)}
                />
                <label htmlFor="defendant-mailing-toggle" className="text-sm text-muted-foreground cursor-pointer select-none">
                  Defendant's mailing address is different
                </label>
              </div>
              {defendantMailingDiffers && (
                <div className="rounded-lg border border-dashed p-3 space-y-3 bg-muted/10">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Defendant Mailing Address</p>
                  <FormField control={form.control} name="defendantMailingAddress" render={({ field }) => (
                    <FormItem><FormLabel>Street</FormLabel><FormControl><Input {...field} placeholder="P.O. Box or different street" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-5 gap-2">
                    <FormField control={form.control} name="defendantMailingCity" render={({ field }) => (
                      <FormItem className="col-span-2"><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="defendantMailingState" render={({ field }) => (
                      <FormItem className="col-span-1"><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="defendantMailingZip" render={({ field }) => (
                      <FormItem className="col-span-2"><FormLabel>ZIP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit(form.getValues())} disabled={saving}>
              <LogOut className="mr-2 h-4 w-4" />
              Save & Exit
            </Button>
            <Button type="submit" size="lg" data-testid="button-next-step" disabled={saving}>
              {saving ? "Saving…" : i18n.intake.saveAndContinue}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
