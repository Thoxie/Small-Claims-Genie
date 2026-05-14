import { useState } from "react";
import { setStoredKey, validateKey } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";

interface LoginProps {
  onAuthenticated: () => void;
}

export default function Login({ onAuthenticated }: LoginProps) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError("");

    const valid = await validateKey(key.trim());
    if (valid) {
      setStoredKey(key.trim());
      onAuthenticated();
    } else {
      setError("Invalid key — check your ADMIN_API_KEY secret.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-xl">Admin Dashboard</CardTitle>
          <CardDescription className="text-sm">
            Small Claims Genie — Owner Access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Input
                type="password"
                placeholder="Enter your ADMIN_API_KEY"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoFocus
                disabled={loading}
                className="font-mono text-sm"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !key.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-400">
            Set <code className="bg-gray-100 px-1 rounded">ADMIN_API_KEY</code> in Replit Secrets to enable access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
