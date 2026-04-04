import { SignUp } from "@clerk/clerk-react";
import { Layout } from "@/components/layout";
import { useRef, useEffect } from "react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignUpPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let blocked = false;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isSubmit = target.closest("button[type='submit'], .cl-formButtonPrimary");
      if (!isSubmit) return;
      if (blocked) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      blocked = true;
      setTimeout(() => { blocked = false; }, 6000);
    };

    container.addEventListener("click", handleClick, true);
    return () => container.removeEventListener("click", handleClick, true);
  }, []);

  return (
    <Layout>
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#ddf6f3] to-white py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="text-xl font-bold text-primary">Win in Small Claims Court.</p>
            <p className="text-muted-foreground mt-1 text-sm">Don't lose because you're unprepared.</p>
            <p className="text-base font-semibold text-amber-600 mt-1">Get your money back!</p>
          </div>
          <div ref={containerRef}>
            <SignUp
              routing="path"
              path={`${base}/sign-up`}
              signInUrl={`${base}/sign-in`}
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
      </div>
    </Layout>
  );
}
