import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Home, Sparkles, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { i18n } from "@/lib/i18n";
import { intakeStep4Schema } from "./shared";
import { DemandLetterTab } from "./demand-letter-tab";
import type { ExtendedCase } from "@/lib/types";

interface Props {
  caseId: number;
  initialData: ExtendedCase;
  onNext: (d: Record<string, unknown>) => void;
  onBack?: () => void;
  saving?: boolean;
  onSaveExit: (d: Record<string, unknown>) => void;
  onAiCheck?: () => void;
}

export function IntakeStep4({ caseId, initialData, onNext, saving, onSaveExit, onAiCheck }: Props) {
  const form = useForm({
    resolver: zodResolver(intakeStep4Schema),
    defaultValues: {
      priorDemandMade: initialData.priorDemandMade ?? false,
      priorDemandDate: initialData.priorDemandDate || "",
      priorDemandMethod: initialData.priorDemandMethod || "",
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
    <div className="space-y-4">
      <DemandLetterTab caseId={caseId} currentCase={initialData} />

      <div className="px-4 pb-2 space-y-4 text-sm">
        <Form {...form}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Prior Demand */}
              <div className="rounded-xl border p-5 space-y-4">
                <FormField control={form.control} name="priorDemandMade" render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Have you already asked the defendant to pay you?</FormLabel>
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
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="priorDemandDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of demand</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="priorDemandMethod" render={({ field }) => (
                        <FormItem>
                          <FormLabel>How did you contact them?</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="in person">In person</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="text message">Text message</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="written letter">Written letter</SelectItem>
                              <SelectItem value="certified mail">Certified mail</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="priorDemandDescription" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Their response <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                        <FormControl>
                          <Textarea className="min-h-[72px]" placeholder="e.g. They said they would pay but never did, or they denied owing anything." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
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
        </Form>
      </div>

      <div className="sticky bottom-0 z-10 bg-white border-t border-border flex items-center justify-between pl-6 py-2 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] -mx-4" style={{ paddingRight: '165px' }}>
        <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit(form.getValues())}>
          <Home className="mr-2 h-4 w-4" />
          Save &amp; Exit
        </Button>
        <Button type="button" size="lg" onClick={onAiCheck} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
          <Sparkles className="h-4 w-4" /> AI Genie Check My Case
        </Button>
        <Button type="button" size="lg" onClick={() => onNext(form.getValues())} disabled={saving} className="gap-2" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
          {saving ? "Saving…" : i18n.intake.saveAndContinue}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
