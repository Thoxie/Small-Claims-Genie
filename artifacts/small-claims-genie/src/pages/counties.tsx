import { Helmet } from 'react-helmet-async';
import { useState, useMemo, useEffect } from "react";
import { useListCounties } from "@workspace/api-client-react";
import { STATE_FACTS, STATE_ORDER, type StateCode } from "@workspace/state-facts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Globe, Landmark, Search, Wand2 } from "lucide-react";
import { i18n } from "@/lib/i18n";

// State list/order comes from the canonical @workspace/state-facts registry
// (see .agents/skills/state-expansion/SKILL.md) so a new state only needs to
// be added once.
const STATE_TABS: StateCode[] = STATE_ORDER;

type StateTab = StateCode;

type CountyItem = {
  name: string;
  courthouseName: string;
  courthouseAddress: string;
  courthouseCity: string;
  courthouseZip: string;
  state: string;
  phone?: string;
  website?: string;
  clerkWebsite?: string;
  filingFeeUnder1500?: number;
  filingFee1500to5000?: number;
  filingFeeOver5000?: number;
  filingFeeUnder10000?: number;
  notes?: string;
  id: string;
};

// Fee display is intentionally per-state: each state's County data models filing
// fees differently (CA/TX/NC use 3 numeric tiers, IL uses a single flat number,
// FL uses a fixed statutory table, VA/NJ/WA have no numeric per-county fee and
// rely on the county's free-text `notes` field). Never fabricate numbers for a
// state that doesn't have them — fall back to notes/statewide facts instead.
function FilingFeesPanel({ state, county }: { state: StateTab; county: CountyItem }) {
  if (state === "FL") {
    return (
      <>
        <h4 className="font-semibold mb-2">Filing Fees (Fla. Stat. 34.041)</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Under $100</span><span className="font-medium">$55</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">$101–$500</span><span className="font-medium">$80</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">$501–$2,500</span><span className="font-medium">$175</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Over $2,500</span><span className="font-medium">$300</span></div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">+ summons, service, and e-filing fees</p>
      </>
    );
  }

  const hasTiers =
    county.filingFeeUnder1500 != null &&
    county.filingFee1500to5000 != null &&
    county.filingFeeOver5000 != null;

  if (hasTiers) {
    return (
      <>
        <h4 className="font-semibold mb-2">{i18n.counties.filingFees || "Filing Fees"}</h4>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-muted-foreground mb-1">{i18n.counties.under1500 || "Under $1.5k"}</div>
            <div className="font-medium">${county.filingFeeUnder1500}</div>
          </div>
          <div className="border-x border-border/50">
            <div className="text-xs text-muted-foreground mb-1">{i18n.counties.upTo5000 || "$1.5k–$5k"}</div>
            <div className="font-medium">${county.filingFee1500to5000}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">{i18n.counties.over5000 || "Over $5k"}</div>
            <div className="font-medium">${county.filingFeeOver5000}</div>
          </div>
        </div>
      </>
    );
  }

  if (county.filingFeeUnder10000 != null) {
    return (
      <>
        <h4 className="font-semibold mb-2">Filing Fee</h4>
        <div className="text-center">
          <span className="text-lg font-semibold">${county.filingFeeUnder10000}</span>
        </div>
        {county.notes && <p className="text-xs text-muted-foreground mt-2">{county.notes}</p>}
      </>
    );
  }

  // No numeric per-county fee data (VA, NJ, WA): surface the statewide fee note.
  // Never use `county.notes` here — for these states it holds general courthouse
  // caveats (e.g. address/phone confidence), not fee information, and showing it
  // under a "Filing Fee" heading is misleading.
  return (
    <>
      <h4 className="font-semibold mb-2">Filing Fee</h4>
      <p className="text-xs text-muted-foreground">
        {STATE_FACTS[state].filingFeeNote || "Varies — check with the local court before filing."}
      </p>
    </>
  );
}

export default function Counties() {
  const [selectedState, setSelectedState] = useState<StateTab>("CA");
  const { data: counties, isLoading, isError } = useListCounties({ state: selectedState } as Parameters<typeof useListCounties>[0]);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCounties = useMemo(() => {
    if (!counties) return [];
    if (!searchTerm) return counties;
    const lower = searchTerm.toLowerCase();
    return counties.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.courthouseName.toLowerCase().includes(lower) ||
        c.courthouseCity.toLowerCase().includes(lower)
    );
  }, [counties, searchTerm]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("help-genie-jurisdiction", {
      detail: { state: selectedState },
    }));
  }, [selectedState]);

  const stateFacts = STATE_FACTS[selectedState];
  const countCopy = counties ? `all ${counties.length}` : "every";
  const headingText = selectedState === "CA"
    ? "All 58 California Counties"
    : `${countCopy === "every" ? "" : countCopy.charAt(0).toUpperCase() + countCopy.slice(1) + " "}${stateFacts.name} Counties`;
  const subtitleText = selectedState === "CA"
    ? (i18n.counties.subtitle || "Find your courthouse, filing fees, and contact info for all 58 California small claims courts.")
    : `Find your courthouse, filing fees, and contact info for ${countCopy} ${stateFacts.name} small claims courts.`;
  const pageTitle = `${stateFacts.name} Small Claims Court Counties — Small Claims Genie`;
  const pageDescription = `Find your county courthouse, filing fees, limits, and contact information for ${stateFacts.name} small claims courts.`;
  const countiesSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": "https://smallclaimsgenie.com/counties",
    "name": pageTitle,
    "description": pageDescription,
    "isPartOf": { "@id": "https://smallclaimsgenie.com/#website" },
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href="https://smallclaimsgenie.com/counties" />
        <meta property="og:url" content="https://smallclaimsgenie.com/counties" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content="https://smallclaimsgenie.com/opengraph.jpg" />
        <script type="application/ld+json">{JSON.stringify(countiesSchema)}</script>
      </Helmet>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{headingText}</h1>
        <p className="text-muted-foreground text-lg mb-4">
          {subtitleText}
        </p>

        {/* State toggle */}
        <div className="flex flex-wrap gap-2 mb-5">
          {STATE_TABS.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => { setSelectedState(code); setSearchTerm(""); }}
              className={`flex items-center gap-2 px-5 py-2 rounded-full border-2 font-semibold text-sm transition-all ${
                selectedState === code
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              }`}
            >
              {STATE_FACTS[code].flagEmoji} {STATE_FACTS[code].name}
            </button>
          ))}
        </div>
        
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={i18n.counties.searchPlaceholder || "Search counties..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-base"
            data-testid="input-county-search"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 text-center bg-destructive/10 text-destructive rounded-lg">
          <p>Failed to load counties. Please try again later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCounties.map((county) => (
            <Card key={county.id} data-testid={`card-county-${county.id}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  {county.name} County
                </CardTitle>
                <CardDescription className="font-medium text-foreground">
                  {county.courthouseName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      {county.courthouseAddress}<br />
                      {county.courthouseCity}, {county.state} {county.courthouseZip}
                    </span>
                  </div>
                  
                  {county.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <a href={`tel:${county.phone}`} className="hover:text-primary hover:underline">
                        {county.phone}
                      </a>
                    </div>
                  )}
                  
                  {(county.website || county.clerkWebsite) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4 shrink-0" />
                      <a 
                        href={county.website || county.clerkWebsite} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-primary hover:underline truncate"
                      >
                        {county.website ? "Court Website" : "Clerk Website"}
                      </a>
                    </div>
                  )}
                </div>

                <div className="bg-muted/50 rounded-md p-3 text-sm">
                  <FilingFeesPanel state={selectedState} county={county} />
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredCounties.length === 0 && (
            <div className="col-span-full p-12 text-center text-muted-foreground bg-muted/30 rounded-lg">
              No counties found matching "{searchTerm}"
            </div>
          )}
        </div>
      )}

      {/* ── Bottom CTA ── */}
      <div className="mt-12 border-2 border-[#a8e6df] rounded-xl px-8 py-8 text-center bg-[#f0fffe]">
        <h2 className="text-lg font-black text-primary mb-1.5">Not sure which county to file in?</h2>
        <p className="text-sm text-muted-foreground mb-2">
          Describe your situation in plain English — by voice or text. The Genie will help you figure out
          where to file, what to expect, and how Small Claims Genie can help you prepare.
        </p>
        <Button
          size="lg"
          onClick={() => window.dispatchEvent(new Event("open-help-genie"))}
          className="h-11 px-7 text-sm bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-sm"
        >
          <Wand2 className="mr-2 h-4 w-4" />
          Ask the Genie — Free
        </Button>
      </div>
    </div>
  );
}
