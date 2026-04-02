import { Component, type ErrorInfo, type ReactNode, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
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
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

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
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
          <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
          <p className="text-muted-foreground max-w-md">
            {this.state.error.message || "An unexpected error occurred. Please try again."}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = "/"; }}
            className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Return to Home
          </button>
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

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  return null;
}

// ── Public pages (no auth required) ──────────────────────────────────────────
function PublicRoutes() {
  return (
    <Switch>
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      {/* SSO callback path used internally by Clerk */}
      <Route path="/sign-in/sso-callback" component={SignInPage} />
    </Switch>
  );
}

// ── Protected app (requires sign-in) ─────────────────────────────────────────
// Waits for Clerk to fully load before deciding to redirect — prevents
// the auth state flash that was bouncing users mid sign-up flow.
function ProtectedRouter() {
  const { isLoaded, isSignedIn } = useAuth();
  const [location] = useLocation();

  // While Clerk is still initialising, render nothing so we don't flash
  // a redirect before the session is known.
  if (!isLoaded) return null;

  if (!isSignedIn) {
    // Preserve the intended destination so we can redirect back after login
    const returnTo = location !== "/sign-in" && location !== "/sign-up"
      ? `?redirect=${encodeURIComponent(location)}`
      : "";
    return <Redirect to={`/sign-in${returnTo}`} />;
  }

  return (
    <>
      <AuthTokenBridge />
      <Layout>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/resume" component={Resume} />
          <Route path="/cases/new" component={NewCase} />
          <Route path="/cases/:id" component={CaseWorkspace} />
          <Route path="/counties" component={Counties} />
          <Route path="/resources" component={Resources} />
          <Route path="/how-it-works" component={HowItWorks} />
          <Route path="/faq" component={FAQ} />
          <Route path="/types-of-cases" component={TypesOfCases} />
          <Route path="/terms" component={Terms} />
          <Route path="/tos" component={TermsOfService} />
          <Route path="/sc100" component={SC100Generator} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </>
  );
}

function Router() {
  return (
    <Switch>
      {/* Auth pages: explicit base path + wildcard sub-paths for Clerk
          multi-step flows (e.g. /sign-up/verify-email-address) */}
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-in/*" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/sign-up/*" component={SignUpPage} />
      {/* Everything else requires auth */}
      <Route>
        <ProtectedRouter />
      </Route>
    </Switch>
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
          </TooltipProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
}

export default App;
