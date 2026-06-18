"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { IcpInput } from "@/components/icp/icp-shell";

export function AuthModal({
  open,
  reason,
  onClose,
  login,
  signup,
}: {
  open: boolean;
  reason?: string;
  onClose: (signedIn: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await login(email, password);
      else await signup(email, password, name);
      onClose(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-base/80 p-5 backdrop-blur-sm">
      <div className="panel w-full max-w-md p-6">
        <h2 className="font-display text-xl font-bold text-ink">
          {mode === "login" ? "Sign in" : "Create account"}
        </h2>
        <p className="mt-1 text-[13px] text-ink-dim">
          {reason ||
            "Required to save campaigns, connect your mailbox, and send live emails."}
        </p>
        {mode === "signup" && (
          <label className="mt-4 block">
            <span className="eyebrow mb-1.5 block">Name</span>
            <IcpInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </label>
        )}
        <label className="mt-4 block">
          <span className="eyebrow mb-1.5 block">Email</span>
          <IcpInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </label>
        <label className="mt-4 block">
          <span className="eyebrow mb-1.5 block">Password</span>
          <IcpInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </label>
        {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="solid" disabled={busy} onClick={submit}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : null}
            {mode === "login" ? "Sign in" : "Sign up"}
          </Button>
          <Button variant="ghost" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Need an account?" : "Have an account?"}
          </Button>
          <Button variant="outline" onClick={() => onClose(false)}>Close</Button>
        </div>
      </div>
    </div>
  );
}
