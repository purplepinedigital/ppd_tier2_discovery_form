import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SignupProps {
  onSignup: (email: string, name: string, password: string) => Promise<void>;
  onSwitchToLogin: () => void;
  isLoading?: boolean;
}

export function Signup({ onSignup, onSwitchToLogin, isLoading }: SignupProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSignup(email, password);
  };

  return (
    <div className="flex w-full max-w-[1360px] items-center gap-5 lg:gap-12">
      <div className="hidden w-full max-w-[656px] flex-col gap-5 lg:flex">
        <h1
          className="text-4xl font-bold leading-tight md:text-[45px]"
          style={{ fontFamily: "Epilogue, sans-serif" }}
        >
          Don't Lose Your Progress
        </h1>
        <p
          className="text-2xl font-normal"
          style={{ fontFamily: "Literata, serif" }}
        >
          The Form ahead takes 45-60 minutes to complete.
        </p>
        <p
          className="max-w-[555px] text-base font-normal leading-relaxed"
          style={{ fontFamily: "Literata, serif" }}
        >
          Sign up now so you can: ✓ Save your progress automatically ✓ Take
          breaks and return anytime ✓ Complete the form at your convenience
        </p>
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2Ffd4153c1315b49e2bfd04849b8708971%2F2d058d27788c49d7a91835d82478b7b3"
          alt="Decorative illustration"
          className="w-full max-w-[507px]"
          style={{ transform: "rotate(30deg)", margin: "20px 0 0 -40px" }}
        />
      </div>

      <div className="w-full max-w-[652px] rounded-[10px] bg-[#FFEDC3] p-6 md:p-10">
        <div className="mb-8 space-y-4">
          <h2
            className="text-2xl font-bold md:text-[26px]"
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            Create Your Account
          </h2>
          <p
            className="text-base font-normal leading-relaxed"
            style={{ fontFamily: "Literata, serif" }}
          >
            Just provide your email and create a password. That's it! We only
            use this to save your form progress—nothing else.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="space-y-2.5">
            <label
              htmlFor="signup-email"
              className="block text-base font-bold"
              style={{ fontFamily: "Literata, serif" }}
            >
              Email Address
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border-0 border-b border-[#7C7C7C] bg-transparent pb-2.5 pt-1 text-base font-normal outline-none focus:border-[#37306B]"
              style={{ fontFamily: "Literata, serif" }}
            />
          </div>

          <div className="space-y-2.5">
            <label
              htmlFor="signup-password"
              className="block text-base font-bold"
              style={{ fontFamily: "Literata, serif" }}
            >
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border-0 border-b border-[#7C7C7C] bg-transparent pb-2.5 pt-1 text-base font-normal outline-none focus:border-[#37306B]"
              style={{ fontFamily: "Literata, serif" }}
            />
            <p
              className="text-base font-light"
              style={{ fontFamily: "Literata, serif" }}
            >
              Minimum 8 characters
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#37306B] px-10 py-4 text-base font-normal text-[#FFFAEE] hover:bg-[#2C2758] disabled:opacity-50"
            style={{ fontFamily: "Literata, serif" }}
          >
            {isLoading ? "Signing up..." : "Sign up and continue"}
            <svg
              className="h-5 w-5"
              viewBox="0 0 21 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M20.3536 4.03544C20.5488 3.84018 20.5488 3.52359 20.3536 3.32833L17.1716 0.146351C16.9763 -0.0489113 16.6597 -0.0489113 16.4645 0.146351C16.2692 0.341613 16.2692 0.658195 16.4645 0.853458L19.2929 3.68188L16.4645 6.51031C16.2692 6.70557 16.2692 7.02216 16.4645 7.21742C16.6597 7.41268 16.9763 7.41268 17.1716 7.21742L20.3536 4.03544ZM0 3.68188V4.18188H20V3.68188V3.18188H0V3.68188Z"
                fill="white"
              />
            </svg>
          </Button>

          <div className="flex flex-wrap items-start gap-2 text-base">
            <span
              className="font-bold"
              style={{ fontFamily: "Literata, serif" }}
            >
              Already signed up?
            </span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-normal underline hover:no-underline"
              style={{ fontFamily: "Literata, serif" }}
            >
              Log in here
            </button>
            <span
              className="font-normal"
              style={{ fontFamily: "Literata, serif" }}
            >
              to continue your Discovery Form.
            </span>
          </div>

          <p
            className="text-xs font-light leading-relaxed"
            style={{ fontFamily: "Literata, serif" }}
          >
            Your information is secure and will only be used to save your
            Discovery Form progress.
          </p>
        </form>
      </div>
    </div>
  );
}
