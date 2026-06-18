"use client";

import { LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui";

export function AuthHeader() {
  const { user, loading, logout, promptSignIn } = useAuth();

  if (loading) return null;

  if (user && !user.auth_enabled) {
    return (
      <span className="font-mono text-[10px] text-ink-faint">demo workspace</span>
    );
  }

  if (user && user.auth_enabled && !user.is_demo) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden font-mono text-[10px] text-ink-dim sm:inline">{user.email}</span>
        <Button variant="ghost" className="!px-2 !py-1 text-[11px]" onClick={() => logout()}>
          <LogOut size={13} /> Sign out
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      className="!px-2.5 !py-1 text-[11px]"
      onClick={() => promptSignIn("Sign in to save campaigns and connect Gmail.")}
    >
      <LogIn size={13} /> Sign in
    </Button>
  );
}
