import { Helmet } from 'react-helmet-async';
import { useEffect, useMemo, useState } from "react";
import { i18n } from "@/lib/i18n";
import { Link } from "wouter";
import { useListCounties } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, FileText, Scale, BookOpen, HelpCircle, Wand2, Play, X, ChevronRight, MapPin, Phone, Globe, Landmark, Gavel, Clock, Send } from "lucide-react";
import { STATE_RESOURCES, STATE_ORDER, type ResourceStateCode } from "@/lib/state-resources";

const resourcesSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "url": "https://smallclaimsgenie.com/resources",
  "name": "Small Claims Court Resources",
  "description": "Free guides, court links, deadlines, and tips for small claims court plaintiffs. Find your county courthouse and learn your rights.",
  "isPartOf": { "@id": "https://smallclaimsgenie.com/#website" },
};

// CA-only official external PDF links, preserved exactly as before — do not remove or
// change these; other states intentionally have no verified external PDF link and fall
// back to the in-app form flow instead (see stateResourceSections below).
const CA_SELF_HELP_LINKS = [
  { title: "Small Claims Advisor Program", desc: "Free legal advice from certified advisors before you file.", url: "https://www.courts.ca.gov/1196.htm" },
  { title: "Find Your Local Courthouse", desc: "Search for your county courthouse by zip code.", url: "https://www.courts.ca.gov/find-my-court.htm" },
];

export default function Resources() {
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [selectedState, setSelectedState] = useState<ResourceStateCode>("CA");
  const [selectedCountyId, setSelectedCountyId] = useState<string>("");

  const { data: counties, isLoading: countiesLoading } = useListCounties({ state: selectedState } as Parameters<typeof useListCounties>[0]);

  const sortedCounties = useMemo(
    () => [...(counties ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [counties]
  );

  const selectedCounty = useMemo(
    () => sortedCounties.find((c) => c.id === selectedCountyId),
    [sortedCounties, selectedCountyId]
  );

  const info = STATE_RESOURCES[selectedState];

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("help-genie-jurisdiction", {
      detail: { state: selectedState, county: selectedCounty?.name ?? null },
    }));
  }, [selectedState, selectedCounty]);

  const formsSection = useMemo(() => {
    if (selectedState === "CA") {
      return [
        { title: "SC-100 — Plaintiff's Claim and Order", desc: "The main form you file to start your small claims case.", url: "https://www.courts.ca.gov/documents/sc100.pdf" },
        { title: "SC-101 — Additional Defendants", desc: "Use this if you are suing more than two defendants.", url: "https://www.courts.ca.gov/documents/sc101.pdf" },
        { title: "SC-104 — Proof of Service", desc: "Required after serving the defendant with court papers.", url: "https://www.courts.ca.gov/documents/sc104.pdf" },
        { title: "SC-120 — Defendant's Claim and Order", desc: "If the defendant wants to counter-sue you (filed by defendant).", url: "https://www.courts.ca.gov/documents/sc120.pdf" },
      ];
    }
    return info.formsUsed;
  }, [selectedState, info]);

  return (
    <div className="container mx-auto px-4 pt-4 pb-10 max-w-5xl">
      <Helmet>
        <title>Small Claims Court Resources — Small Claims Genie</title>
        <meta name="description" content="Free guides, court links, deadlines, and tips for small claims court plaintiffs. Find your county courthouse and learn your rights." />
        <link rel="canonical" href="https://smallclaimsgenie.com/resources" />
        <meta property="og:url" content="https://smallclaimsgenie.com/resources" />
        <meta property="og:title" content="Small Claims Court Resources — Small Claims Genie" />
        <meta property="og:description" content="Free guides, court links, deadlines, and tips for small claims court plaintiffs. Find your county courthouse and learn your rights." />
        <meta property="og:image" content="https://smallclaimsgenie.com/opengraph.jpg" />
        <script type="application/ld+json">{JSON.stringify(resourcesSchema)}</script>
      </Helmet>

      {/* Header row: title/description on left, video card on right */}
      <div className="flex items-start justify-between gap-6 mb-10">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{i18n.landing.resourcesTitle}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Official court forms, state Judicial Branch guides, and answers to the most common small claims questions — all in one place.
          </p>
        </div>

        {/* Video thumbnail card — matches case workspace pattern */}
        <div
          onClick={() => setTutorialOpen(true)}
          className="cursor-pointer group flex-shrink-0 w-[220px] rounded-xl overflow-hidden border-2 border-[#14b8a6] shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
          title="Watch the Video Guide"
        >
          <div className="relative bg-[#0f2537] h-[120px] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6]/30 via-transparent to-[#0f2537]" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#14b8a6] flex items-center justify-center shadow-lg group-hover:bg-[#0d9488] transition-colors">
                <Play className="w-[18px] h-[18px] text-white ml-1" fill="white" />
              </div>
              <span className="text-white text-xs font-semibold opacity-90">Watch Video Guide</span>
            </div>
          </div>
          <div className="bg-background px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold">Small Claims Overview</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">How to win your case</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#14b8a6] shrink-0" />
          </div>
        </div>
      </div>

      {/* State & county selector */}
      <div className="rounded-xl border bg-muted/20 p-4 mb-8">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Find Resources for Your State &amp; County</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {STATE_ORDER.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => { setSelectedState(code); setSelectedCountyId(""); }}
              data-testid={`button-state-${code}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-semibold text-sm transition-all ${
                selectedState === code
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              }`}
            >
              {STATE_RESOURCES[code].flagEmoji} {STATE_RESOURCES[code].name}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-[280px]">
          <Select
            value={selectedCountyId || "__all__"}
            onValueChange={(v) => setSelectedCountyId(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-10 w-full" data-testid="select-resource-county">
              <SelectValue placeholder={countiesLoading ? "Loading counties..." : "Select your county (optional)"} />
            </SelectTrigger>
            <SelectContent className="max-h-72 overflow-y-auto">
              <SelectItem value="__all__">All {info.name} counties</SelectItem>
              {sortedCounties.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} County</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* County-specific courthouse card */}
      {selectedCounty && (
        <Card className="mb-8 border-primary/30" data-testid="card-selected-county">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              {selectedCounty.name} County, {info.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="text-sm space-y-2">
              <p className="font-medium">{selectedCounty.courthouseName}</p>
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{selectedCounty.courthouseAddress}, {selectedCounty.courthouseCity}, {selectedState} {selectedCounty.courthouseZip}</span>
              </div>
              {selectedCounty.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <a href={`tel:${selectedCounty.phone}`} className="hover:text-primary hover:underline">{selectedCounty.phone}</a>
                </div>
              )}
              {(selectedCounty.website || selectedCounty.clerkWebsite) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4 shrink-0" />
                  <a
                    href={selectedCounty.website || selectedCounty.clerkWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary hover:underline truncate"
                  >
                    County Court / Clerk Website
                  </a>
                </div>
              )}
            </div>
            <div className="bg-muted/50 rounded-md p-3 text-sm h-fit">
              <p className="font-semibold mb-1">Filing Fees</p>
              <p className="text-muted-foreground">{info.filingFeeSummary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resource sections — dynamic by selected state */}
      <div className="space-y-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Official Court Forms — {info.name}</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {formsSection.map((item) => (
              <Card key={item.title} className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-base font-semibold flex items-start justify-between gap-2">
                    <span>{item.title}</span>
                    {"url" in item && item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${item.title}`}
                        className="text-muted-foreground hover:text-primary transition-colors shrink-0 mt-0.5"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {selectedState !== "CA" && (
            <p className="text-xs text-muted-foreground mt-3">
              Small Claims Genie prepares and fills in these forms for you automatically —{" "}
              <Link href="/cases/new" className="text-primary hover:underline font-medium">start your case</Link> to generate them.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">{info.name} Courts Self-Help</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-base font-semibold flex items-start justify-between gap-2">
                  <span>{info.courtBranchName}</span>
                  <a
                    href={info.selfHelpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${info.selfHelpLabel}`}
                    className="text-muted-foreground hover:text-primary transition-colors shrink-0 mt-0.5"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <p className="text-sm text-muted-foreground leading-relaxed">Official {info.name} Judicial Branch website — small claims self-help information and court locations.</p>
              </CardContent>
            </Card>
            {selectedState === "CA" && CA_SELF_HELP_LINKS.map((item) => (
              <Card key={item.title} className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-base font-semibold flex items-start justify-between gap-2">
                    <span>{item.title}</span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${item.title}`}
                      className="text-muted-foreground hover:text-primary transition-colors shrink-0 mt-0.5"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Know the Rules — {info.name}</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-primary shrink-0" /> Claim Limit
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{info.claimLimit}</p>
              </CardContent>
            </Card>
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary shrink-0" /> Statute of Limitations
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <ul className="text-sm text-muted-foreground leading-relaxed space-y-1">
                  {info.statuteOfLimitations.map((s) => (
                    <li key={s.label} className="flex justify-between gap-2">
                      <span>{s.label}</span>
                      <span className="font-medium text-foreground">{s.period}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary shrink-0" /> Filing Fees
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{info.filingFeeSummary}</p>
              </CardContent>
            </Card>
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary shrink-0" /> Service of Process
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{info.serviceOfProcess}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Common FAQs</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: "Can I bring a lawyer to small claims court?", desc: "In most states, lawyers are NOT allowed to represent clients in small claims hearings." },
              { title: "What if the defendant doesn't show up?", desc: "If properly served, the judge will likely rule in your favor by default." },
              { title: "What if I lose?", desc: info.appealNote },
              { title: "How do I collect my money after winning?", desc: "Winning a judgment doesn't automatically mean you'll be paid. You may need to garnish wages or levy a bank account." },
            ].map((item) => (
              <Card key={item.title} className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-14 p-8 bg-primary rounded-2xl text-primary-foreground text-center">
        <h2 className="text-2xl font-bold mb-3">Have a question about your situation?</h2>
        <p className="text-primary-foreground/80 mb-6">
          Describe what happened — by voice or text. The Genie will tell you if you have a case,
          what evidence you need, and how to win. No account required.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            size="lg"
            onClick={() => window.dispatchEvent(new Event("open-help-genie"))}
            className="h-12 px-8 text-base bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg"
          >
            <Wand2 className="mr-2 h-5 w-5" />
            Ask the Genie — Free
          </Button>
          <Button asChild size="lg" className="h-12 px-8 text-base bg-white/10 hover:bg-white/20 text-white rounded-full font-bold border border-white/30">
            <Link href="/cases/new">
              <Wand2 className="mr-2 h-5 w-5" />Start Your Case
            </Link>
          </Button>
        </div>
        <p className="text-xs text-primary-foreground/40 mt-3">No sign-up needed to chat. Flat fee to start your case.</p>
      </div>

      {/* Video modal — same pattern as case workspace tabs */}
      {tutorialOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setTutorialOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-[95vw] max-h-[95vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b bg-[#f8fffe]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#14b8a6] flex items-center justify-center">
                  <Play className="w-3 h-3 text-white ml-0.5" fill="white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Video Guide — Small Claims Overview</p>
                  <p className="text-[10px] text-gray-500">Small Claims Genie Training Video</p>
                </div>
              </div>
              <button
                onClick={() => setTutorialOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              width="800"
              height="450"
              src="https://app.heygen.com/embeds/5167b9a7012c45b1b7c781248c046b7d"
              title="HeyGen video player"
              frameBorder="0"
              allow="encrypted-media; fullscreen;"
              allowFullScreen
              className="block"
            />
            <div className="px-5 py-3 bg-[#f0fdf9] border-t flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-gray-600 flex-1 min-w-[200px]">
                Video plays above — click X or anywhere outside to close.
              </p>
              <button
                onClick={() => setTutorialOpen(false)}
                className="text-xs font-semibold text-[#14b8a6] hover:text-[#0d9488] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
