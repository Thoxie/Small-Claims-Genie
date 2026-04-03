import { i18n } from "@/lib/i18n";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, FileText, Scale, BookOpen, HelpCircle, Wand2 } from "lucide-react";

const RESOURCES = [
  {
    category: "Official Court Forms",
    icon: FileText,
    items: [
      { title: "SC-100 — Plaintiff's Claim and Order", desc: "The main form you file to start your small claims case.", url: "https://www.courts.ca.gov/documents/sc100.pdf" },
      { title: "SC-101 — Additional Defendants", desc: "Use this if you are suing more than two defendants.", url: "https://www.courts.ca.gov/documents/sc101.pdf" },
      { title: "SC-104 — Proof of Service", desc: "Required after serving the defendant with court papers.", url: "https://www.courts.ca.gov/documents/sc104.pdf" },
      { title: "SC-120 — Defendant's Claim and Order", desc: "If the defendant wants to counter-sue you (filed by defendant).", url: "https://www.courts.ca.gov/documents/sc120.pdf" },
    ],
  },
  {
    category: "California Courts Self-Help",
    icon: Scale,
    items: [
      { title: "Small Claims Overview — California Courts", desc: "Official California Judicial Branch guide to small claims court.", url: "https://www.courts.ca.gov/selfhelp-smallclaims.htm" },
      { title: "Small Claims Advisor Program", desc: "Free legal advice from certified advisors before you file.", url: "https://www.courts.ca.gov/1196.htm" },
      { title: "Find Your Local Courthouse", desc: "Search for your county courthouse by zip code.", url: "https://www.courts.ca.gov/find-my-court.htm" },
      { title: "Filing Fees Waiver (Fee Waiver)", desc: "Apply to waive filing fees if you cannot afford them.", url: "https://www.courts.ca.gov/documents/fw001.pdf" },
    ],
  },
  {
    category: "Know the Rules",
    icon: BookOpen,
    items: [
      { title: "Small Claims Limits (2026)", desc: "Individuals may claim up to $12,500. Businesses limited to $6,250.", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=116.220.&lawCode=CCP" },
      { title: "Statute of Limitations", desc: "How long you have to file — varies by claim type. Act fast.", url: "https://www.courts.ca.gov/1201.htm" },
      { title: "Service of Process Rules", desc: "How you are required to legally notify the defendant.", url: "https://www.courts.ca.gov/1202.htm" },
      { title: "What Happens at the Hearing", desc: "What to expect on your court date and how to prepare.", url: "https://www.courts.ca.gov/1207.htm" },
    ],
  },
  {
    category: "Common FAQs",
    icon: HelpCircle,
    items: [
      { title: "Can I bring a lawyer to small claims court?", desc: "No. Lawyers are NOT allowed to represent clients in California small claims hearings." },
      { title: "What if the defendant doesn't show up?", desc: "If properly served, the judge will likely rule in your favor by default." },
      { title: "What if I lose?", desc: "You can appeal within 30 days. The defendant can also appeal." },
      { title: "How do I collect my money after winning?", desc: "Winning a judgment doesn't automatically mean you'll be paid. You may need to garnish wages or levy a bank account." },
    ],
  },
];

export default function Resources() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{i18n.landing.resourcesTitle}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Official court forms, California Judicial Branch guides, and answers to the most common small claims questions — all in one place.
        </p>
      </div>

      <div className="space-y-10">
        {RESOURCES.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.category}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{section.category}</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {section.items.map((item) => (
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
            </div>
          );
        })}
      </div>

      <div className="mt-14 p-8 bg-primary rounded-2xl text-primary-foreground text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to Start Your Case?</h2>
        <p className="text-primary-foreground/80 mb-6">
          Stop reading and start preparing. Small Claims Genie walks you through every step.
        </p>
        <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-bold h-13 px-8">
          <Link href="/cases/new"><Wand2 className="mr-2 h-5 w-5" />Start Your Case Free</Link>
        </Button>
      </div>
    </div>
  );
}
