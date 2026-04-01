import { Link, useLocation } from "wouter";
import { i18n } from "@/lib/i18n";
import { Scale } from "lucide-react";
import logoPath from "@assets/2small-claims-genie-logo.png_1775057452576.png";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src={logoPath} alt={i18n.brand.name} className="h-8 w-auto" />
            <span className="font-bold text-lg hidden sm:inline-block text-primary">
              {i18n.brand.name}
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link 
              href="/counties" 
              className={`text-sm font-medium transition-colors hover:text-primary ${location === '/counties' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {i18n.nav.counties}
            </Link>
            <Link 
              href="/dashboard" 
              className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith('/dashboard') || location.startsWith('/cases') ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {i18n.nav.dashboard}
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <footer className="border-t bg-muted/40 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {i18n.brand.name}. Not a law firm.</p>
        </div>
      </footer>
    </div>
  );
}
