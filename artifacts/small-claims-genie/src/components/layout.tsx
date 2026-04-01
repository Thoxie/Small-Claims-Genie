import { Link, useLocation } from "wouter";
import { i18n } from "@/lib/i18n";
import logoPath from "@assets/2small-claims-genie-logo.png_1775057452576.png";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors hover:text-primary ${
        location === href || (href !== '/' && location.startsWith(href))
          ? "text-primary"
          : "text-muted-foreground"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src={logoPath} alt={i18n.brand.name} className="h-12 w-auto" />
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {navLink("/#how-it-works", i18n.nav.howItWorks)}
            {navLink("/counties", i18n.nav.counties)}
            {navLink("/resources", i18n.nav.resources)}
          </nav>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="hidden sm:flex">
              <Link href="/dashboard">{i18n.nav.dashboard}</Link>
            </Button>
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold">
              <Link href="/cases/new">+ New Case</Link>
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
              <Link href="/counties" className="hover:text-primary transition-colors">{i18n.nav.counties}</Link>
              <Link href="/dashboard" className="hover:text-primary transition-colors">{i18n.nav.dashboard}</Link>
              <a href="/#how-it-works" className="hover:text-primary transition-colors">{i18n.nav.howItWorks}</a>
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
