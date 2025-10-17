import { useState } from "react";
import { Button } from "@/components/ui/button";

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSwitchToSignup: () => void;
  onSwitchToReset: () => void;
  isLoading?: boolean;
}

export function Login({
  onLogin,
  onSwitchToSignup,
  onSwitchToReset,
  isLoading,
}: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(email, password);
  };

  return (
    <div className="flex w-full max-w-[653px] items-center justify-center">
      <div className="w-full rounded-[10px] bg-[#FFEDC3] p-6 md:p-10">
        <div className="mb-8 space-y-4">
          <h2
            className="text-2xl font-bold md:text-[26px]"
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            Login To Continue
          </h2>
          <p
            className="text-base font-normal leading-relaxed"
            style={{ fontFamily: "Literata, serif" }}
          >
            Use your email to login. That's it! We only use this to save your
            form progress nothing else.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="space-y-2.5">
            <label
              htmlFor="login-email"
              className="block text-base font-bold"
              style={{ fontFamily: "Literata, serif" }}
            >
              Email Address
            </label>
            <input
              id="login-email"
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
              htmlFor="login-password"
              className="block text-base font-bold"
              style={{ fontFamily: "Literata, serif" }}
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border-0 border-b border-[#7C7C7C] bg-transparent pb-2.5 pt-1 text-base font-normal outline-none focus:border-[#37306B]"
              style={{ fontFamily: "Literata, serif" }}
            />
            <div className="flex items-center justify-between">
              <p
                className="text-base font-light"
                style={{ fontFamily: "Literata, serif" }}
              >
                Minimum 8 characters
              </p>
              <button
                type="button"
                onClick={onSwitchToReset}
                className="text-base font-light underline hover:no-underline"
                style={{ fontFamily: "Literata, serif" }}
              >
                Forgot Password? <span className="underline">Reset here</span>
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#37306B] px-10 py-4 text-base font-normal text-[#FFFAEE] hover:bg-[#2C2758] disabled:opacity-50"
            style={{ fontFamily: "Literata, serif" }}
          >
            {isLoading ? "Logging in..." : "Login to continue"}
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
              Not signed up yet?
            </span>
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="font-normal underline hover:no-underline"
              style={{ fontFamily: "Literata, serif" }}
            >
              Sign up here
            </button>
            <span
              className="font-normal"
              style={{ fontFamily: "Literata, serif" }}
            >
              to continue your Discovery Form.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
