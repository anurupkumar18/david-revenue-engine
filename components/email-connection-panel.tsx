"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, Unplug } from "lucide-react";
import {
  connectGoogleUrl,
  connectMicrosoftUrl,
  disconnectEmail,
  getEmailConnection,
  testEmailConnection,
  type EmailConnectionInfo,
} from "@/lib/icp-api";
import { useAuth } from "@/components/auth/auth-provider";
import { Button, Eyebrow } from "@/components/ui";
import { IcpInput } from "@/components/icp/icp-shell";

export function EmailConnectionPanel({ compact = false }: { compact?: boolean }) {
  const { user, promptSignIn } = useAuth();
  const [info, setInfo] = useState<EmailConnectionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [testTo, setTestTo] = useState("sanjay.bhatia01@gmail.com");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmailConnection();
      setInfo(data);
    } catch {
      setInfo(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, user?.id]);

  function requireAuth(action: () => void) {
    if (info?.auth_enabled && !user) {
      void promptSignIn("Sign in to connect your Gmail or Microsoft 365 mailbox.").then((ok) => {
        if (ok) action();
      });
      return;
    }
    action();
  }

  async function handleTest() {
    setBusy(true);
    setNote("");
    try {
      const res = await testEmailConnection(testTo);
      setNote(
        res.simulated
          ? `Simulated test send logged (demo mode).`
          : `Test email sent to ${testTo}.`,
      );
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Test send failed");
    }
    setBusy(false);
  }

  async function handleDisconnect() {
    setBusy(true);
    await disconnectEmail();
    await refresh();
    setBusy(false);
  }

  if (loading) {
    return (
      <div className="panel grid place-items-center p-6">
        <Loader2 size={20} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className={compact ? "" : "panel p-5"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>Mailbox connection</Eyebrow>
          <p className="mt-1 text-[13px] text-ink-dim">
            Connect Gmail or Microsoft 365 to send from your address.
          </p>
        </div>
        <Mail size={16} className="shrink-0 text-ink-faint" />
      </div>

      {info?.connected ? (
        <div className="mt-4 rounded-[12px] border border-accent/30 bg-accent/5 px-4 py-3">
          <div className="font-mono text-[12px] text-accent">
            Connected · {info.provider} · {info.email_address}
          </div>
          {info.last_error && (
            <p className="mt-1 text-[12px] text-danger">{info.last_error}</p>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-[12px] border border-dashed border-line px-4 py-3 text-[13px] text-ink-dim">
          No mailbox connected. Live sends require OAuth connection when auth is enabled.
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="solid"
          disabled={!info?.oauth_configured.google}
          onClick={() => requireAuth(() => { window.location.href = connectGoogleUrl(); })}
        >
          Connect Gmail
        </Button>
        <Button
          variant="outline"
          disabled={!info?.oauth_configured.microsoft}
          onClick={() => requireAuth(() => { window.location.href = connectMicrosoftUrl(); })}
        >
          Connect Microsoft 365
        </Button>
        {info?.connected && (
          <Button variant="ghost" disabled={busy} onClick={handleDisconnect}>
            <Unplug size={14} /> Disconnect
          </Button>
        )}
      </div>

      {!info?.oauth_configured.google && !info?.oauth_configured.microsoft && (
        <p className="mt-3 font-mono text-[11px] text-amber">
          Set GOOGLE_CLIENT_ID/SECRET or MICROSOFT_CLIENT_ID/SECRET in backend env to enable OAuth.
        </p>
      )}

      {info?.connected && (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
          <label className="min-w-[220px] flex-1">
            <span className="eyebrow mb-1.5 block">Test recipient</span>
            <IcpInput value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          </label>
          <Button variant="outline" disabled={busy || !testTo} onClick={handleTest}>
            Send test email
          </Button>
        </div>
      )}

      {note && <p className="mt-3 text-[12px] text-ink-dim">{note}</p>}
    </div>
  );
}
