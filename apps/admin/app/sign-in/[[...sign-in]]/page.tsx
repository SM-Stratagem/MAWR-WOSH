import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e2236]">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#1e3a56] border border-[#2a4a66]",
          },
        }}
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}