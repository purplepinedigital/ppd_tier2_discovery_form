// Store admin impersonation session
interface ImpersonationSession {
  adminUserId: string;
  impersonatedUserId: string;
  impersonatedEmail: string;
  timestamp: number;
}

export function setImpersonationSession(
  adminUserId: string,
  impersonatedUserId: string,
  impersonatedEmail: string,
): void {
  const session: ImpersonationSession = {
    adminUserId,
    impersonatedUserId,
    impersonatedEmail,
    timestamp: Date.now(),
  };
  localStorage.setItem("__admin_impersonate__", JSON.stringify(session));
}

export function getImpersonationSession(): ImpersonationSession | null {
  const stored = localStorage.getItem("__admin_impersonate__");
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearImpersonationSession(): void {
  localStorage.removeItem("__admin_impersonate__");
}

export function isImpersonating(): boolean {
  return getImpersonationSession() !== null;
}

export function getImpersonatedUserId(): string | null {
  const session = getImpersonationSession();
  return session ? session.impersonatedUserId : null;
}
