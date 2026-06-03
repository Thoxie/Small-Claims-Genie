import { useState } from "react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const CONFIRM_PHRASE = "delete account";

export default function AccountPage() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = input.trim().toLowerCase() === CONFIRM_PHRASE;

  async function handleDelete() {
    if (!confirmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BASE}/api/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      await signOut();
      setLocation("/");
    } catch {
      setError("Something went wrong. Please try again or contact support.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Delete Account</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Permanently delete your account and all data associated with it.
      </p>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 mb-8">
        <p className="text-sm font-medium text-gray-800 mb-3">This will permanently delete:</p>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>All your cases and intake data</li>
          <li>All uploaded documents and evidence</li>
          <li>All demand letters and court forms</li>
          <li>All chat and AI conversation history</li>
          <li>Your account login — you can re-register with the same email</li>
        </ul>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-4">
        <p className="text-sm text-red-800 font-medium">
          This action cannot be undone.
        </p>

        <div className="space-y-1.5">
          <label className="text-sm text-gray-700">
            Type <span className="font-semibold">delete account</span> to confirm
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="delete account"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          onClick={handleDelete}
          disabled={!confirmed || loading}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors
            bg-red-600 hover:bg-red-700
            disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "Deleting…" : "Delete Account"}
        </button>
      </div>
    </div>
  );
}
