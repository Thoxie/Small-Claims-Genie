import { SignIn } from "@clerk/clerk-react";
import logoPath from "@assets/2small-claims-genie-logo_1775074104796.png";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#ddf6f3] to-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logoPath} alt="Small Claims Genie" className="h-[184px] w-auto" />
          </div>
          <p className="text-xl font-bold text-primary mt-1">Win in Small Claims Court.</p>
          <p className="text-muted-foreground mt-1 text-sm">Don't lose because you're unprepared.</p>
          <p className="text-base font-semibold text-amber-600 mt-1">Get your money back!</p>
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
