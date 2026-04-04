import { SignIn } from "@clerk/clerk-react";
import { Layout } from "@/components/layout";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <Layout>
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#ddf6f3] to-white py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="text-xl font-bold text-primary">Win in Small Claims Court.</p>
            <p className="text-muted-foreground mt-1 text-sm">Don't lose because you're unprepared.</p>
            <p className="text-base font-semibold text-amber-600 mt-1">Get your money back!</p>
          </div>
          <SignIn
            routing="virtual"
            signUpUrl={`${base}/sign-up`}
            fallbackRedirectUrl={`${base}/`}
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
    </Layout>
  );
}
