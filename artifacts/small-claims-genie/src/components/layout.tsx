import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { i18n } from "@/lib/i18n";
import logoPath from "@assets/2small-claims-genie-logo_1775074104796.png";
import { Button } from "@/components/ui/button";
import { Wand2, Menu, X, LogIn, Sparkles, ChevronDown } from "lucide-react";
import { UserButton, useAuth } from "@clerk/clerk-react";
import { SignUpModal } from "@/components/sign-up-modal";
import { ContactDialog } from "@/components/contact-dialog";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/types-of-cases", label: "Types of Cases" },
  { href: "/free-trial", label: "Free Trial" },
  { href: "/faq", label: "FAQ" },
  { href: "/resources", label: "Resources" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [ctaOpen, setCtaOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const { isSignedIn, isLoaded } = useAuth();

  // Close mobile menu whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
    setCtaOpen(false);
  }, [location]);

  // Close CTA dropdown on outside click
  useEffect(() => {
    if (!ctaOpen) return;
    const handler = (e: MouseEvent) => {
      if (ctaRef.current && !ctaRef.current.contains(e.target as Node)) {
        setCtaOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ctaOpen]);

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location === href || location.startsWith(href.split("#")[0] + "/");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white text-foreground">
      {/* ── Announcement bar ── */}
      <div className="w-full bg-amber-50 border-b border-amber-100 py-1.5 text-center">
        <p className="text-[13px] font-medium text-amber-800 tracking-wide">
          California Small Claims Now&nbsp;—&nbsp;49 States Coming Soon
        </p>
      </div>

      <header className="sticky top-0 z-40 w-full bg-white shadow-sm" style={{ borderBottom: "2px solid #ddf6f3" }}>

        {/* ── Main header row ── */}
        <div className="container mx-auto px-4 md:px-6 h-[70px] md:h-[106px] flex items-center justify-between">

          {/* Logo */}
          <Link href="/" aria-label="Small Claims Genie home page" className="flex items-center shrink-0 md:ml-8">
            <img
              src={logoPath}
              alt={i18n.brand.name}
              className="h-[54px] md:h-[92px] w-auto"
            />
          </Link>

          {/* Desktop center nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => {
              const isFreeTrial = link.href === "/free-trial";
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    isFreeTrial
                      ? `inline-flex items-center px-3 py-1.5 rounded-full text-sm font-black transition-colors border ${
                          isActive(link.href)
                            ? "bg-amber-200 border-amber-400 text-amber-800"
                            : "bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200 hover:border-amber-400"
                        }`
                      : `inline-flex items-center px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-primary hover:bg-primary/5 ${
                          isActive(link.href) ? "text-primary bg-primary/5" : "text-muted-foreground"
                        }`
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2 md:gap-3">

            {isLoaded && (
              isSignedIn ? (
                /* ── Signed-in: go straight to cases ── */
                <Button
                  asChild
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold shadow-sm rounded-full px-4 md:px-6 text-xs md:text-sm h-8 md:h-9"
                >
                  <Link href="/start" aria-label="My Cases">
                    <Wand2 className="mr-1 h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span>My Cases</span>
                  </Link>
                </Button>
              ) : (
                /* ── Logged-out: dropdown with two clear paths ── */
                <div ref={ctaRef} className="relative">
                  <Button
                    size="sm"
                    onClick={() => setCtaOpen(v => !v)}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold shadow-sm rounded-full px-4 md:px-6 text-xs md:text-sm h-8 md:h-9 flex items-center gap-1"
                    aria-expanded={ctaOpen}
                    aria-haspopup="true"
                  >
                    <Wand2 className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                    <span className="hidden sm:inline">Start or Resume Your Case</span>
                    <span className="sm:hidden">Start</span>
                    <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${ctaOpen ? "rotate-180" : ""}`} />
                  </Button>

                  {ctaOpen && (
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[230px]">
                      <button
                        onClick={() => { setCtaOpen(false); setSignUpOpen(true); }}
                        className="flex items-start gap-3 px-4 py-3.5 hover:bg-primary/5 transition-colors group w-full text-left"
                      >
                        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-[#20304f] group-hover:text-primary transition-colors">Start free</p>
                          <p className="text-[11px] text-[#8a96a8] leading-snug">No credit card required</p>
                        </div>
                      </button>
                      <div className="border-t border-gray-100" />
                      <Link
                        href="/sign-in?redirect=/start"
                        onClick={() => setCtaOpen(false)}
                        className="flex items-start gap-3 px-4 py-3.5 hover:bg-primary/5 transition-colors group"
                      >
                        <LogIn className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-[#20304f] group-hover:text-primary transition-colors">I have an account — sign in</p>
                          <p className="text-[11px] text-[#8a96a8] leading-snug">Resume where you left off</p>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
              )
            )}

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

            <div className="border-t border-gray-100 pt-2 pb-1 space-y-2">
              {isLoaded && (
                isSignedIn ? (
                  <Button
                    asChild
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold rounded-full"
                  >
                    <Link href="/start">
                      <Wand2 className="mr-2 h-4 w-4" />
                      My Cases
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => { setMenuOpen(false); setSignUpOpen(true); }}
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold rounded-full"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Start free — claim your spot
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-primary text-primary hover:bg-primary/5 font-bold rounded-full"
                    >
                      <Link href="/sign-in?redirect=/start">
                        <LogIn className="mr-2 h-4 w-4" />
                        I have an account — sign in
                      </Link>
                    </Button>
                  </>
                )
              )}
            </div>
          </div>
        )}
      </header>

      <SignUpModal open={signUpOpen} onClose={() => setSignUpOpen(false)} />

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t py-4" style={{ backgroundColor: "#ddf6f3" }}>
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row md:flex-wrap items-center gap-x-5 gap-y-2 justify-start">
            <Link
              href="/copyright"
              className="text-xs text-primary/50 hover:text-primary transition-colors"
            >
              © {new Date().getFullYear()} {i18n.brand.name}. All rights reserved.
            </Link>

            {/* Social media */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-primary/60">Follow us:</span>

              {/* Instagram */}
              <a
                href="https://instagram.com/Small.Claims.Genie"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on Instagram"
                className="flex items-center justify-center w-8 h-8 rounded-full transition-opacity hover:opacity-80"
                style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}
              >
                <svg viewBox="0 0 24 24" fill="white" width="15" height="15" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="https://tiktok.com/@smallclaimscourtgenie"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on TikTok"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-black transition-opacity hover:opacity-80"
              >
                <svg viewBox="0 0 24 24" fill="white" width="15" height="15" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.75a4.85 4.85 0 01-1.02-.06z"/>
                </svg>
              </a>

              {/* YouTube */}
              <a
                href="https://youtube.com/@smallclaimsgenieAI"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on YouTube"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FF0000] transition-opacity hover:opacity-80"
              >
                <svg viewBox="0 0 24 24" fill="white" width="15" height="15" aria-hidden="true">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>

            {/* Links */}
            <div className="flex items-center gap-3">
              <Link
                href="/terms"
                className="text-xs text-primary/50 hover:text-primary underline underline-offset-2 transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/payment-terms"
                className="text-xs text-primary/50 hover:text-primary underline underline-offset-2 transition-colors"
              >
                Payment Terms
              </Link>
              <ContactDialog />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
