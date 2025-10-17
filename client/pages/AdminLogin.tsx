import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { adminLogin } from "@/lib/admin-auth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const success = adminLogin(email, password);
      if (success) {
        navigate("/admin/dashboard");
      } else {
        setError("Invalid email or password");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFAEE] p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1
            className="text-3xl font-bold text-center mb-2"
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            Admin Dashboard
          </h1>
          <p
            className="text-center text-gray-600 mb-8"
            style={{ fontFamily: "Literata, serif" }}
          >
            Sign in to view and export form responses
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-sm font-bold mb-2"
                style={{ fontFamily: "Literata, serif" }}
              >
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#37306B]"
                style={{ fontFamily: "Literata, serif" }}
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-bold mb-2"
                style={{ fontFamily: "Literata, serif" }}
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#37306B]"
                style={{ fontFamily: "Literata, serif" }}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#37306B] hover:bg-[#2C2758] text-[#FFFAEE] py-3 rounded-md font-bold disabled:opacity-50"
              style={{ fontFamily: "Literata, serif" }}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
