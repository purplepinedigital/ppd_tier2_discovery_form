// Admin credentials stored in localStorage after successful login
const ADMIN_AUTH_KEY = "admin_auth_token";

const ADMIN_EMAIL = "lovish.bishnoi@purplepine.digital";
const ADMIN_PASSWORD = "rGaneshaL123#";

export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(ADMIN_AUTH_KEY);
}

export function adminLogin(email: string, password: string): boolean {
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    // Create a simple token (in production, use proper JWT or session)
    const token = btoa(`${email}:${Date.now()}`);
    localStorage.setItem(ADMIN_AUTH_KEY, token);
    return true;
  }
  return false;
}

export function adminLogout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(ADMIN_AUTH_KEY);
  }
}

export function getAdminEmail(): string | null {
  const token = localStorage.getItem(ADMIN_AUTH_KEY);
  if (!token) return null;
  try {
    const decoded = atob(token);
    return decoded.split(":")[0];
  } catch {
    return null;
  }
}
