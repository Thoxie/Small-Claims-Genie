import { Link, useLocation } from "wouter";
import { i18n } from "@/lib/i18n";
import logoPath from "@assets/2small-claims-genie-logo_1775074104796.png";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location === href || location.startsWith(href.split("#")[0] + "/");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white text-foreground">
      <header className="sticky top-0 z-40 w-full bg-white shadow-sm" style={{ borderBottom: '2px solid #ddf6f3' }}>
        <div className="container mx-auto px-6 h-[106px] flex items-center justify-between">

          {/* Logo — shifted 1 inch right */}
          <Link href="/" className="flex items-center shrink-0 ml-24">
            <img src={logoPath} alt={i18n.brand.name} className="h-[92px] w-auto" />
          </Link>

          {/* Center nav links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-primary hover:bg-primary/5 ${isActive("/") ? "text-primary bg-primary/5" : "text-muted-foreground"}`}
            >
              Home
            </Link>
            <Link
              href="/how-it-works"
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-primary hover:bg-primary/5 ${isActive("/how-it-works") ? "text-primary bg-primary/5" : "text-muted-foreground"}`}
            >
              {i18n.nav.howItWorks}
            </Link>
            <Link
              href="/types-of-cases"
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-primary hover:bg-primary/5 ${isActive("/types-of-cases") ? "text-primary bg-primary/5" : "text-muted-foreground"}`}
            >
              Types of Cases
            </Link>
            <Link
              href="/faq"
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-primary hover:bg-primary/5 ${isActive("/faq") ? "text-primary bg-primary/5" : "text-muted-foreground"}`}
            >
              FAQ
            </Link>
            <Link
              href="/counties"
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-primary hover:bg-primary/5 ${isActive("/counties") ? "text-primary bg-primary/5" : "text-muted-foreground"}`}
            >
              {i18n.nav.counties}
            </Link>
            <Link
              href="/resources"
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-primary hover:bg-primary/5 ${isActive("/resources") ? "text-primary bg-primary/5" : "text-muted-foreground"}`}
            >
              {i18n.nav.resources}
            </Link>
          </nav>

          {/* Right side CTAs */}
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground hover:text-primary font-semibold">
              <Link href="/dashboard">{i18n.nav.dashboard}</Link>
            </Button>
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold shadow-sm rounded-full px-5">
              <Link href="/cases/new">
                <Wand2 className="mr-1.5 h-4 w-4" />
                Start Your Case
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t py-8" style={{ backgroundColor: '#ddf6f3' }}>
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-sm text-primary/60">
              © {new Date().getFullYear()} {i18n.brand.name}. Not a law firm. Legal advice only.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="text-sm text-primary/60 hover:text-primary underline underline-offset-2 transition-colors">
                Terms of Use
              </Link>
              <Link href="/tos" className="text-sm text-primary/60 hover:text-primary underline underline-offset-2 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
