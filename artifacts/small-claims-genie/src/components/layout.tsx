import { Link, useLocation } from "wouter";
import { i18n } from "@/lib/i18n";
import logoPath from "@assets/2small-claims-genie-logo.png_1775057452576.png";
import { Button } from "@/components/ui/button";
import { Wand2, Info } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location === href || location.startsWith(href.split("#")[0] + "/");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <img src={logoPath} alt={i18n.brand.name} className="h-12 w-auto" />
          </Link>

          {/* Center nav links */}
          <nav className="hidden md:flex items-center gap-1">
            <a
              href="/#how-it-works"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <Info className="h-3.5 w-3.5" />
              {i18n.nav.howItWorks}
            </a>
            <Link
              href="/counties"
              className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:text-primary hover:bg-primary/5 ${isActive("/counties") ? "text-primary bg-primary/5" : "text-muted-foreground"}`}
            >
              {i18n.nav.counties}
            </Link>
            <Link
              href="/resources"
              className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:text-primary hover:bg-primary/5 ${isActive("/resources") ? "text-primary bg-primary/5" : "text-muted-foreground"}`}
            >
              {i18n.nav.resources}
            </Link>
          </nav>

          {/* Right side CTAs */}
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground hover:text-primary">
              <Link href="/dashboard">{i18n.nav.dashboard}</Link>
            </Button>
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold shadow-sm">
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

      <footer className="border-t bg-muted/40 py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center">
              <img src={logoPath} alt={i18n.brand.name} className="h-10 w-auto opacity-70" />
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="/#how-it-works" className="hover:text-primary transition-colors">{i18n.nav.howItWorks}</a>
              <Link href="/counties" className="hover:text-primary transition-colors">{i18n.nav.counties}</Link>
              <Link href="/resources" className="hover:text-primary transition-colors">{i18n.nav.resources}</Link>
              <Link href="/dashboard" className="hover:text-primary transition-colors">{i18n.nav.dashboard}</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {i18n.brand.name}. Not a law firm. Not legal advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
