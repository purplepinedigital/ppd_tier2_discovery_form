import { Button } from "@/components/ui/button";

interface VerifyEmailProps {
  email: string;
  onSwitchToLogin: () => void;
}

export function VerifyEmail({ email, onSwitchToLogin }: VerifyEmailProps) {
  const handleResendEmail = async () => {
    // In a real app, you might add a function to resend verification email
    // For now, we'll just show that the email was resent
    alert(
      "Verification email resent! Please check your inbox and spam folder.",
    );
  };

  return (
    <div className="flex w-full max-w-[653px] items-center justify-center">
      <div className="w-full rounded-[10px] bg-[#FFEDC3] p-6 md:p-10">
        <div className="mb-8 space-y-4">
          <div className="flex justify-center mb-4">
            <svg
              className="h-16 w-16 text-[#37306B]"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M3 8L10.89 13.26C11.5475 13.7231 12.4525 13.7231 13.11 13.26L21 8M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2
            className="text-2xl font-bold md:text-[26px] text-center"
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            Verify Your Email
          </h2>
          <p
            className="text-base font-normal leading-relaxed text-center"
            style={{ fontFamily: "Literata, serif" }}
          >
            We've sent a verification link to:
          </p>
          <p
            className="text-base font-bold text-center text-[#37306B]"
            style={{ fontFamily: "Literata, serif" }}
          >
            {email}
          </p>
        </div>

        <div className="space-y-6">
          <div
            className="rounded-[10px] bg-[#FFC741] p-4 text-sm leading-relaxed"
            style={{ fontFamily: "Literata, serif" }}
          >
            <p className="font-bold mb-2">What's next?</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Check your email inbox and spam folder</li>
              <li>Click the verification link</li>
              <li>Once verified, you can log in and continue your Discovery Form</li>
            </ol>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={handleResendEmail}
              className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-[#37306B] bg-transparent px-10 py-4 text-base font-normal text-[#37306B] hover:bg-[#37306B] hover:text-[#FFFAEE]"
              style={{ fontFamily: "Literata, serif" }}
            >
              Resend Verification Email
            </Button>

            <Button
              type="button"
              onClick={onSwitchToLogin}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#37306B] px-10 py-4 text-base font-normal text-[#FFFAEE] hover:bg-[#2C2758]"
              style={{ fontFamily: "Literata, serif" }}
            >
              Back to Login
            </Button>
          </div>

          <p
            className="text-xs font-light leading-relaxed text-center"
            style={{ fontFamily: "Literata, serif" }}
          >
            Didn't receive an email? Check your spam folder or try resending the
            verification link.
          </p>
        </div>
      </div>
    </div>
  );
}
