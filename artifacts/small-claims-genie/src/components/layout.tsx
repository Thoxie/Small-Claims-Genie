import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { i18n } from "@/lib/i18n";
import logoPath from "@assets/2small-claims-genie-logo_1775074104796.png";
import { Button } from "@/components/ui/button";
import { Wand2, Menu, X } from "lucide-react";
import { UserButton } from "@clerk/clerk-react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/types-of-cases", label: "Types of Cases" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/resources", label: "Resources" },
  { href: "/resume", label: "Resume a Case" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close mobile menu whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location === href || location.startsWith(href.split("#")[0] + "/");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white text-foreground">
      <header className="sticky top-0 z-40 w-full bg-white shadow-sm" style={{ borderBottom: "2px solid #ddf6f3" }}>

        {/* ── Main header row ── */}
        <div className="container mx-auto px-4 md:px-6 h-[70px] md:h-[106px] flex items-center justify-between">

          {/* Logo — nudged left on desktop to make room for extra nav item */}
          <Link href="/" className="flex items-center shrink-0 md:ml-8">
            <img
              src={logoPath}
              alt={i18n.brand.name}
              className="h-[54px] md:h-[92px] w-auto"
            />
          </Link>

          {/* Desktop center nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.filter(l => l.href !== "/resume").map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-primary hover:bg-primary/5 ${
                  isActive(link.href) ? "text-primary bg-primary/5" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2 md:gap-3">

            {/* Resume — desktop only */}
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden md:flex text-muted-foreground hover:text-primary font-semibold"
            >
              <Link href="/resume">{i18n.nav.dashboard}</Link>
            </Button>

            {/* Start Your Case — always visible, shorter label on small phones */}
            <Button
              asChild
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold shadow-sm rounded-full px-3 md:px-5 text-xs md:text-sm h-8 md:h-9"
            >
              <Link href="/cases/new">
                <Wand2 className="mr-1 h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Start Your Case</span>
                <span className="sm:hidden">Start</span>
              </Link>
            </Button>

            {/* Clerk user avatar */}
            <UserButton afterSignOutUrl="/sign-in" />

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown menu ── */}
        {menuOpen && (
          <div
            className="md:hidden bg-white px-4 py-3 space-y-1 shadow-md border-t"
            style={{ borderColor: "#ddf6f3" }}
          >
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive(link.href)
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 pb-1">
              <Button
                asChild
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold rounded-full"
              >
                <Link href="/cases/new">
                  <Wand2 className="mr-2 h-4 w-4" />
                  Start Your Case
                </Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t py-3" style={{ backgroundColor: "#ddf6f3" }}>
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-1">
            <p className="text-xs text-primary/50">
              © {new Date().getFullYear()} {i18n.brand.name}. Not a law firm. Legal advice only.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/terms"
                className="text-xs text-primary/50 hover:text-primary underline underline-offset-2 transition-colors"
              >
                Terms of Use
              </Link>
              <Link
                href="/tos"
                className="text-xs text-primary/50 hover:text-primary underline underline-offset-2 transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
