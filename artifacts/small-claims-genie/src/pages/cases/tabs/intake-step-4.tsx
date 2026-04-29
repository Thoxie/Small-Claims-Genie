import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { LogOut, Sparkles, MapPin, Phone, Mail, Globe, ExternalLink } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { i18n } from "@/lib/i18n";
import { intakeStep4Schema } from "./shared";

interface Props {
  initialData: any;
  onComplete: (d: any) => void;
  onBack: () => void;
  saving?: boolean;
  onCheckCase?: () => void;
  onSaveExit: (d: any) => void;
}

export function IntakeStep4({ initialData, onComplete, onBack, saving, onCheckCase, onSaveExit }: Props) {
  const form = useForm({
    resolver: zodResolver(intakeStep4Schema),
    defaultValues: {
      priorDemandMade: initialData.priorDemandMade ?? false,
      priorDemandDescription: initialData.priorDemandDescription || "",
      priorDemandWhyNot: initialData.priorDemandWhyNot || "",
      venueBasis: initialData.venueBasis || "",
      venueReason: initialData.venueReason || "",
      isSuingPublicEntity: initialData.isSuingPublicEntity || false,
      publicEntityClaimFiledDate: initialData.publicEntityClaimFiledDate || "",
      isAttyFeeDispute: initialData.isAttyFeeDispute || false,
      hadArbitration: initialData.hadArbitration || false,
      filedMoreThan12Claims: initialData.filedMoreThan12Claims || false,
      claimOver2500: initialData.claimOver2500 || false,
    }
  });

  const madeDemand = form.watch("priorDemandMade");
  const basis = form.watch("venueBasis");
  const suingPublic = form.watch("isSuingPublicEntity");
  const attyFeeDispute = form.watch("isAttyFeeDispute");

  return (
    <div className="space-y-5 text-sm">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onComplete)} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ── Left column ── */}
            <div className="space-y-4">

              {/* Prior Demand */}
              <div className="rounded-xl border p-5 space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Prior Demand</h3>
                <FormField control={form.control} name="priorDemandMade" render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="font-medium">Have you already asked the defendant to pay you?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(val) => field.onChange(val === "true")}
                        defaultValue={field.value ? "true" : "false"}
                        className="flex flex-row gap-0 rounded-lg border overflow-hidden"
                      >
                        <FormItem className="flex-1 flex items-center justify-center space-x-2 space-y-0 p-3 cursor-pointer border-r last:border-r-0">
                          <FormControl><RadioGroupItem value="true" /></FormControl>
                          <FormLabel className="font-normal cursor-pointer">Yes</FormLabel>
                        </FormItem>
                        <FormItem className="flex-1 flex items-center justify-center space-x-2 space-y-0 p-3 cursor-pointer">
                          <FormControl><RadioGroupItem value="false" /></FormControl>
                          <FormLabel className="font-normal cursor-pointer">No</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {madeDemand && (
                  <FormField control={form.control} name="priorDemandDescription" render={({ field }) => (
                    <FormItem>
                      <FormLabel>How and when did you ask them?</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-[90px]" placeholder="e.g. Sent a text on Oct 1st and an email on Oct 5th demanding payment." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                {!madeDemand && (
                  <FormField control={form.control} name="priorDemandWhyNot" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Why not? <span className="text-muted-foreground font-normal">(optional — goes on the form)</span></FormLabel>
                      <FormControl>
                        <Textarea className="min-h-[72px]" placeholder="e.g. Defendant refuses to communicate, or it would be unsafe to contact them." {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">The form asks you to explain if you have not yet made a demand. Leave blank if you prefer not to answer.</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>

              {/* Why This County */}
              <div className="rounded-xl border p-5 space-y-4">
                <FormField control={form.control} name="venueBasis" render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Why This County? <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-2">
                        {[
                          { value: "where_defendant_lives",      label: "Where the defendant lives or does business" },
                          { value: "where_damage_happened",      label: "Where the damage or injury happened" },
                          { value: "where_contract_made_broken", label: "Where the contract was made or broken" },
                          { value: "other",                      label: "Other reason" },
                        ].map(({ value, label }) => (
                          <FormItem key={value} className="flex items-center space-x-3 space-y-0 rounded-lg border p-3 cursor-pointer">
                            <FormControl><RadioGroupItem value={value} /></FormControl>
                            <FormLabel className="font-normal cursor-pointer">{label}</FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {basis === "other" && (
                  <FormField control={form.control} name="venueReason" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Please explain</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>

              {/* Eligibility Questions */}
              <div className="rounded-xl border p-5 space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Eligibility Questions</h3>
                {[
                  { name: "isSuingPublicEntity"    as const, label: "Suing a public entity? (e.g. City, County, State)" },
                  { name: "isAttyFeeDispute"       as const, label: "Is this a dispute with a lawyer about attorney fees?" },
                  { name: "filedMoreThan12Claims"  as const, label: "Filed more than 12 small claims in California in the past 12 months?" },
                  { name: "claimOver2500"          as const, label: "Claim over $2,500: Have you filed 2+ other small claims over $2,500 in CA this calendar year?" },
                ].map(({ name, label }) => (
                  <FormField key={name} control={form.control} name={name} render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                      <FormControl><Checkbox checked={field.value as boolean} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel className="cursor-pointer">{label}</FormLabel></div>
                    </FormItem>
                  )} />
                ))}
                {suingPublic && (
                  <FormField control={form.control} name="publicEntityClaimFiledDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>When did you file a government claim with them?</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                {attyFeeDispute && (
                  <FormField control={form.control} name="hadArbitration" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <FormControl><Checkbox checked={field.value as boolean} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">Have you already gone through arbitration about these fees?</FormLabel>
                        <p className="text-xs text-muted-foreground">If yes, you must fill out and attach form SC-101.</p>
                      </div>
                    </FormItem>
                  )} />
                )}
              </div>
            </div>

            {/* ── Right column — Review Your Case ── */}
            <div className="rounded-xl border p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Review Your Case</h3>
                {onCheckCase && (
                  <Button type="button" onClick={onCheckCase} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5 whitespace-nowrap shrink-0">
                    <Sparkles className="h-3.5 w-3.5" /> Check My Case
                  </Button>
                )}
              </div>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Plaintiff</p>
                    <p className="font-semibold">{initialData.plaintiffName || "—"}</p>
                    <p className="text-muted-foreground">{initialData.plaintiffAddress || ""}</p>
                    <p className="text-muted-foreground">{[initialData.plaintiffCity, initialData.plaintiffState, initialData.plaintiffZip].filter(Boolean).join(", ")}</p>
                    {initialData.plaintiffPhone && <p className="text-muted-foreground">{initialData.plaintiffPhone}</p>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Defendant</p>
                    <p className="font-semibold">{initialData.defendantName || "—"}</p>
                    <p className="text-muted-foreground">{initialData.defendantAddress || ""}</p>
                    <p className="text-muted-foreground">{[initialData.defendantCity, initialData.defendantState, initialData.defendantZip].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Claim</p>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">{initialData.claimType || "—"}</span>
                    <span className="font-bold text-primary text-sm">${initialData.claimAmount ? Number(initialData.claimAmount).toLocaleString() : "—"}</span>
                  </div>
                  {initialData.incidentDate && <p className="text-muted-foreground text-sm mb-1">Date: {initialData.incidentDate}</p>}
                  {initialData.claimDescription && <p className="text-sm text-muted-foreground line-clamp-3">{initialData.claimDescription}</p>}
                  {initialData.howAmountCalculated && (
                    <div className="mt-2 pt-2 border-t border-dashed">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Amount Calculation</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{initialData.howAmountCalculated}</p>
                    </div>
                  )}
                </div>
                {(initialData.courthouseName || initialData.countyId) && (
                  <div className="border-t pt-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Court</p>
                    {initialData.courthouseName && <p className="font-semibold leading-snug">{initialData.courthouseName}</p>}
                    {initialData.courthouseAddress && (
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{initialData.courthouseAddress}, {initialData.courthouseCity} {initialData.courthouseZip}</span>
                      </div>
                    )}
                    {initialData.courthousePhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <a href={`tel:${initialData.courthousePhone.replace(/\D/g, "")}`} className="text-primary font-medium hover:underline">{initialData.courthousePhone}</a>
                      </div>
                    )}
                    {initialData.courthouseClerkEmail && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <a href={`mailto:${initialData.courthouseClerkEmail}`} className="text-primary hover:underline break-all">{initialData.courthouseClerkEmail}</a>
                      </div>
                    )}
                    {initialData.courthouseWebsite && (
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <a href={initialData.courthouseWebsite} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 break-all">
                          Court website <ExternalLink className="w-3 h-3 inline shrink-0" />
                        </a>
                      </div>
                    )}
                    {initialData.filingFee && <p className="text-sm">Filing fee: <span className="font-bold">${initialData.filingFee}</span></p>}
                    {initialData.courthouseAddress && (
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${initialData.courthouseAddress}, ${initialData.courthouseCity}, CA ${initialData.courthouseZip}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                        <MapPin className="w-3.5 h-3.5" /> Get Directions
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`rounded-xl border p-4 flex items-center gap-3 ${onCheckCase ? "border-amber-200 bg-amber-50" : "border-border bg-muted/30"}`}>
            <div className="flex gap-2 shrink-0">
              <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit(form.getValues())} disabled={saving}>
                <LogOut className="mr-2 h-4 w-4" />
                Save &amp; Exit
              </Button>
            </div>
            {onCheckCase && (
              <div className="flex-1 px-3 min-w-0">
                <p className="text-sm font-semibold text-amber-900">Want to strengthen your case?</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">Use the Case Advisor to review your claim description and get specific guidance on evidence to gather.</p>
              </div>
            )}
            {!onCheckCase && <div className="flex-1" />}
            <Button type="submit" size="lg" data-testid="button-complete-intake" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 shrink-0">
              {saving ? "Saving…" : "Complete Intake ✓"}
            </Button>
            {onCheckCase && (
              <Button type="button" onClick={onCheckCase} className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 gap-2 whitespace-nowrap">
                <Sparkles className="h-4 w-4" /> Check My Case
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
