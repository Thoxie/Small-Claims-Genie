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

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/cases/new" component={NewCase} />
        <Route path="/cases/:id" component={CaseWorkspace} />
        <Route path="/counties" component={Counties} />
        <Route path="/resources" component={Resources} />
        <Route path="/how-it-works" component={HowItWorks} />
        <Route path="/faq" component={FAQ} />
        <Route path="/types-of-cases" component={TypesOfCases} />
        <Route path="/terms" component={Terms} />
        <Route path="/tos" component={TermsOfService} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
