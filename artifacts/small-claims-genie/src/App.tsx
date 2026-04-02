import { Component, type ErrorInfo, type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

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

function Router() {
  return (
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
  );
}

function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;
