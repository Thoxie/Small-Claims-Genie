import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LogOut } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { i18n } from "@/lib/i18n";
import { intakeStep3Schema } from "./shared";

interface Props {
  initialData: any;
  onNext: (d: any) => void;
  onBack: () => void;
  saving?: boolean;
  onSaveExit: (d: any) => void;
}

export function IntakeStep3({ initialData, onNext, onBack, saving, onSaveExit }: Props) {
  const form = useForm({
    resolver: zodResolver(intakeStep3Schema),
    defaultValues: {
      priorDemandMade: initialData.priorDemandMade ?? false,
      priorDemandDescription: initialData.priorDemandDescription || "",
      priorDemandWhyNot: initialData.priorDemandWhyNot || "",
      courthouseId: initialData.courthouseId || "",
      venueBasis: initialData.venueBasis || "",
      venueReason: initialData.venueReason || "",
    }
  });

  const madeDemand = form.watch("priorDemandMade");
  const basis = form.watch("venueBasis");

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Prior Demand</h3>
              <FormField control={form.control} name="priorDemandMade" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="font-medium">Have you already asked the defendant to pay you?</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={(val) => field.onChange(val === 'true')} defaultValue={field.value ? 'true' : 'false'} className="flex flex-col space-y-2">
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value="true" /></FormControl>
                        <FormLabel className="font-normal">Yes, I asked them.</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value="false" /></FormControl>
                        <FormLabel className="font-normal">No, I have not asked them yet.</FormLabel>
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
                    <FormControl><Textarea className="min-h-[100px]" placeholder="e.g. Sent a text on Oct 1st and an email on Oct 5th demanding payment." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              {!madeDemand && (
                <FormField control={form.control} name="priorDemandWhyNot" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Why not? (optional — goes on the form)</FormLabel>
                    <FormControl><Textarea className="min-h-[80px]" placeholder="e.g. Defendant refuses to communicate, or it would be unsafe to contact them." {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">The form asks you to explain if you have not yet made a demand. Leave blank if you prefer not to answer.</p>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Why This County?</h3>
              <FormField control={form.control} name="venueBasis" render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="font-medium">Select the reason you're filing here <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-2">
                      {[
                        { value: "where_defendant_lives", label: "Where the defendant lives or does business" },
                        { value: "where_damage_happened", label: "Where the damage or injury happened" },
                        { value: "where_contract_made_broken", label: "Where the contract was made or broken" },
                        { value: "other", label: "Other reason" },
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
              {basis === 'other' && (
                <FormField control={form.control} name="venueReason" render={({ field }) => (
                  <FormItem><FormLabel>Please explain</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              )}
            </div>
          </div>
          <div className="flex justify-between items-center pt-2">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit(form.getValues())} disabled={saving}>
                <LogOut className="mr-2 h-4 w-4" />
                Save & Exit
              </Button>
            </div>
            <Button type="submit" size="lg" data-testid="button-next-step" disabled={saving}>
              {saving ? "Saving…" : i18n.intake.saveAndContinue}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
