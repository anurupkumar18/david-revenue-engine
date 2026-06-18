"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CircleDot, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { DemoConsole } from "@/components/demo-console";
import { useEngine } from "@/lib/store";

function FeatureCard({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-accent/30 bg-accent/10 text-accent">
          {icon}
        </div>
        <div>
          <h3 className="font-display text-[22px] font-semibold leading-tight text-ink">{title}</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-dim">{copy}</p>
        </div>
      </div>
    </div>
  );
}

export function OverviewHero() {
  const businessName = useEngine((s) => s.businessName);
  const profileId = useEngine((s) => s.profileId);

  const isWorkspace = Boolean(profileId);

  return (
    <section id="top" className="mx-auto max-w-[1400px] px-5 pb-8 pt-8 sm:px-8 sm:pt-10">
      <div className="reveal grid gap-10 lg:grid-cols-[1.03fr_0.97fr] lg:items-end">
        <div className="max-w-3xl">
          <div className="eyebrow mb-4">
            {isWorkspace ? `${businessName} · Campaign workspace` : "Campaign intelligence, not campaign sending"}
          </div>
          <h1 className="text-balance font-display text-[clamp(3.4rem,6.8vw,6.8rem)] font-medium leading-[0.92] tracking-[-0.04em] text-ink">
            {isWorkspace ? (
              <>
                Improve the next <em className="text-accent">{businessName}</em> campaign.
              </>
            ) : (
              <>
                Strategy first.
                <br />
                <span className="italic text-accent">Outcomes follow.</span>
              </>
            )}
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-[1.8] text-ink-dim sm:text-[17px]">
            {isWorkspace ? (
              <>
                Your accepted product profile powers strategy, ICP filters, signal-based outreach,
                reply routing, outcome tracking, and learning insights. No sending infrastructure
                required for the demo.
              </>
            ) : (
              <>
                We analyze leaks, score fit, and craft the strategy, sequence, and next best
                actions. You stay in control, with every step visible before anything goes out.
              </>
            )}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/wizard">
              <Button variant="solid" className="min-w-44">
                Build new campaign
                <ArrowRight size={15} />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="min-w-44">
                Open saved campaigns
              </Button>
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <FeatureCard
              icon={<CircleDot size={16} />}
              title="Strategy, not sending"
              copy="AI-driven campaign strategy, ICP filters, buying signals, and next best actions."
            />
            <FeatureCard
              icon={<ShieldCheck size={16} />}
              title="You stay in control"
              copy="Review, approve, and refine each step. Compliance stays visible in the interface."
            />
            <FeatureCard
              icon={<Sparkles size={16} />}
              title="Recurring value"
              copy="Track performance, learn what works, and improve the next campaign."
            />
          </div>

          {!isWorkspace && (
            <div className="mt-8">
              <DemoConsole />
            </div>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 rounded-[28px] border border-line bg-[radial-gradient(circle_at_50%_30%,rgba(209,45,59,0.1),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_40%)]" />
          <div className="relative overflow-hidden rounded-[28px] border border-line bg-surface/70 p-4 shadow-[0_28px_80px_-52px_rgba(0,0,0,0.95)]">
            <div className="absolute inset-x-8 top-7 h-px bg-gradient-to-r from-transparent via-accent/45 to-transparent" />
            <div className="absolute inset-y-10 left-6 hidden w-px bg-gradient-to-b from-transparent via-white/10 to-transparent lg:block" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] border border-white/6 bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.06),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_36%)]">
              <Image
                src="/david-head.png"
                alt=""
                fill
                priority
                className="object-cover object-center opacity-[0.98]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,8,7,0.02),rgba(9,8,7,0.42))]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(255,255,255,0.12),transparent_20%),radial-gradient(circle_at_78%_24%,rgba(255,255,255,0.08),transparent_16%)]" />
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <div className="eyebrow">David relief</div>
                <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-ink-dim">
                  Subtle marble texture and classical framing for the campaign intelligence canvas.
                </p>
              </div>
              <div className="hidden rounded-[12px] border border-line bg-surface-2/70 px-3 py-2 text-right sm:block">
                <div className="font-display text-[20px] font-semibold leading-none text-ink">
                  01
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
                  campaign chapters
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
