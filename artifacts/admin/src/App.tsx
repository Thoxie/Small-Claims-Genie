import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import { getStoredKey, clearStoredKey } from "@/lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(getStoredKey()));

  const handleAuthenticated = useCallback(() => {
    setAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    clearStoredKey();
    queryClient.clear();
    setAuthenticated(false);
  }, []);

  if (!authenticated) {
    return <Login onAuthenticated={handleAuthenticated} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
