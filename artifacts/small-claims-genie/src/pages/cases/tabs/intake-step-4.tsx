import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { LogOut, Sparkles, MapPin, Phone, Mail, Globe, ExternalLink, CheckCircle } from "lucide-react";
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
      isSuingPublicEntity: initialData.isSuingPublicEntity || false,
      publicEntityClaimFiledDate: initialData.publicEntityClaimFiledDate || "",
      isAttyFeeDispute: initialData.isAttyFeeDispute || false,
      filedMoreThan12Claims: initialData.filedMoreThan12Claims || false,
      claimOver2500: initialData.claimOver2500 || false,
    }
  });

  const suingPublic = form.watch("isSuingPublicEntity");

  return (
    <div className="space-y-5 text-sm">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onComplete)} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Eligibility Questions</h3>
              {[
                { name: "isSuingPublicEntity" as const, label: "Suing a public entity? (e.g. City, County, State)" },
                { name: "isAttyFeeDispute" as const, label: "Is this a dispute with a lawyer about attorney fees?" },
                { name: "filedMoreThan12Claims" as const, label: "Filed more than 12 small claims in California in the past 12 months?" },
                { name: "claimOver2500" as const, label: "Claim over $2,500: Have you filed 2+ other small claims over $2,500 in CA this calendar year?" },
              ].map(({ name, label }) => (
                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
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
            </div>
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Review Your Case</h3>
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
                {initialData.venueBasis && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Venue Basis</p>
                    <p>{initialData.venueBasis.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {onCheckCase && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">Want to strengthen your case?</p>
                <p className="text-sm text-amber-700 mt-0.5">Use the Case Advisor to review your claim description and get specific guidance on evidence to gather.</p>
              </div>
              <Button type="button" onClick={onCheckCase} className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 gap-2 whitespace-nowrap">
                <Sparkles className="h-4 w-4" /> Check My Case
              </Button>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="lg" onClick={onBack}>{i18n.intake.back}</Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => onSaveExit(form.getValues())} disabled={saving}>
                <LogOut className="mr-2 h-4 w-4" />
                Save & Exit
              </Button>
            </div>
            <Button type="submit" size="lg" data-testid="button-complete-intake" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8">
              {saving ? "Saving…" : "Complete Intake ✓"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
