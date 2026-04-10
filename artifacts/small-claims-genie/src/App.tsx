import { Component, type ErrorInfo, type ReactNode, useEffect, useMemo, useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { HelpGenieWidget } from "@/components/help-genie-widget";
import NotFound from "@/pages/not-found";

// Pages
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import NewCase from "@/pages/cases/new";
import CaseWorkspace from "@/pages/cases/workspace";
import Counties from "@/pages/counties";
import Resources from "@/pages/resources";
import HowItWorks from "@/pages/how-it-works";
import FAQ from "@/pages/faq";
import TypesOfCases from "@/pages/types-of-cases";
import Terms from "@/pages/terms";
import TermsOfService from "@/pages/tos";
import SC100Generator from "@/pages/sc100-generator";
import Resume from "@/pages/resume";
import Pricing from "@/pages/pricing";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";

// In development (Vite dev server), use the dev Clerk key if available.
// In production builds, ALWAYS use the production key — never the dev key,
// because dev Clerk instances refuse to initialize at non-localhost domains.
const PUBLISHABLE_KEY = (
  import.meta.env.DEV
    ? (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY_DEV || import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
    : import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
) as string;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

// ── Error boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col p-8 text-center">
          <div className="flex flex-col items-center gap-6 mt-20">
            <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
            <p className="text-muted-foreground max-w-md">
              {this.state.error.message || "An unexpected error occurred. Please try again."}
            </p>
          </div>
          <div className="mt-auto pb-4 flex justify-center">
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = "/"; }}
              className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Auth token bridge ─────────────────────────────────────────────────────────
// Hooks Clerk's getToken into the API client's bearer-token mechanism so
// every API request automatically carries the current session token.
function AuthTokenBridge() {
  const { getToken } = useAuth();

  useMemo(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  useEffect(() => {
    return () => setAuthTokenGetter(null);
  }, []);

  return null;
}

// ── Loading screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#ddf6f3] to-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}

// ── Require auth wrapper ──────────────────────────────────────────────────────
// Wraps protected pages — redirects to sign-in if not authenticated.
// Public pages are NOT wrapped in this; they render freely for everyone.
function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [location] = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  // If Clerk hasn't loaded after 8 s, the key is likely misconfigured.
  // Show an actionable message instead of spinning forever.
  useEffect(() => {
    if (isLoaded) return;
    const id = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(id);
  }, [isLoaded]);

  if (!isLoaded) {
    if (timedOut) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-xl font-bold text-primary">Taking longer than expected…</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Authentication couldn't finish loading. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-sm"
          >
            Refresh
          </button>
        </div>
      );
    }
    return <LoadingScreen />;
  }

  if (!isSignedIn) {
    const returnTo = location !== "/sign-in" && location !== "/sign-up"
      ? `?redirect=${encodeURIComponent(location)}`
      : "";
    return <Redirect to={`/sign-in${returnTo}`} />;
  }

  return <>{children}</>;
}

// ── Main router ───────────────────────────────────────────────────────────────
function Router() {
  const [location] = useLocation();

  // Auth pages: render by path prefix so the Clerk component is never
  // unmounted mid-flow (avoids duplicate verification emails).
  if (location.startsWith("/sign-up")) return <SignUpPage />;
  if (location.startsWith("/sign-in")) return <SignInPage />;

  return (
    <>
      <AuthTokenBridge />
      <Switch>
        {/* ── /cases/new — must come before /cases/:id so "new" isn't treated as an ID ── */}
        <Route path="/cases/new">
          <Layout>
            <RequireAuth><NewCase /></RequireAuth>
          </Layout>
        </Route>

        {/* ── Case workspace — render-prop so the id is passed explicitly     ── */}
        {/* (children-syntax in Wouter doesn't reliably push params to context) */}
        <Route path="/cases/:id">
          {(params: { id?: string }) => (
            <RequireAuth><CaseWorkspace caseIdParam={params.id ?? ""} /></RequireAuth>
          )}
        </Route>

        {/* ── All other routes — standard Layout + nav ── */}
        <Route>
          <Layout>
            <Switch>
              {/* Public */}
              <Route path="/" component={Landing} />
              <Route path="/counties" component={Counties} />
              <Route path="/resources" component={Resources} />
              <Route path="/how-it-works" component={HowItWorks} />
              <Route path="/faq" component={FAQ} />
              <Route path="/types-of-cases" component={TypesOfCases} />
              <Route path="/pricing" component={Pricing} />
              <Route path="/terms" component={Terms} />
              <Route path="/tos" component={TermsOfService} />

              {/* Protected */}
              <Route path="/dashboard">
                <RequireAuth><Dashboard /></RequireAuth>
              </Route>
              <Route path="/resume">
                <RequireAuth><Resume /></RequireAuth>
              </Route>
              <Route path="/sc100">
                <RequireAuth><SC100Generator /></RequireAuth>
              </Route>

              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Route>
      </Switch>
    </>
  );
}

function App() {
  if (!PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold">Configuration Required</h1>
        <p className="text-muted-foreground max-w-md">
          The app is not yet configured for authentication. Please add your Clerk Publishable Key.
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <ErrorBoundary>
                <Router />
              </ErrorBoundary>
            </WouterRouter>
            <Toaster />
            <HelpGenieWidget />
          </TooltipProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
}

export default App;
