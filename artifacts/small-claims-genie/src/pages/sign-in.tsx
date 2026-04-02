import { SignIn } from "@clerk/clerk-react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#ddf6f3] to-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Small Claims Genie</h1>
          <p className="text-muted-foreground mt-2">Sign in to access your cases</p>
        </div>
        <SignIn
          routing="path"
          path={`${base}/sign-in`}
          signUpUrl={`${base}/sign-up`}
          fallbackRedirectUrl={`${base}/dashboard`}
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-lg border border-border rounded-2xl",
              headerTitle: "text-primary font-bold",
              formButtonPrimary: "bg-primary hover:bg-primary/90",
            },
          }}
        />
      </div>
    </div>
  );
}
