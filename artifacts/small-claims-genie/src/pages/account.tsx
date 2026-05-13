export default function AccountPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Settings</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Under the California Consumer Privacy Act (CCPA), you have the right to request
        permanent deletion of all personal data we hold about you.
      </p>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-sm text-gray-700 leading-relaxed mb-3">
          To request deletion of your account and all associated data, please contact us by email.
          We will process your request within the timeframe required by applicable law.
        </p>
        <p className="text-sm font-medium text-[#0d6b5e]">
          Support@Smallclaimsgenie.com
        </p>
      </div>
    </div>
  );
}
