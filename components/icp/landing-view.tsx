"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleDot, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { scrapeWebsite } from "@/lib/icp-api";
import { EMPTY_FIELDS } from "@/lib/types/icp";
import { saveWizardDraft } from "@/lib/icp-session";
import { Button } from "@/components/ui";
import { IcpInput } from "@/components/icp/icp-shell";

function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-base/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="leading-none">
          <span className="block font-display text-[22px] font-semibold tracking-[0.01em] text-ink">
            DAVID <span className="text-accent">AI</span>
          </span>
          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.28em] text-ink-faint">
            Campaign Intelligence
          </span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/dashboard"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-dim transition-colors hover:text-ink"
          >
            Campaigns
          </Link>
          <Link
            href="/briefs"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-dim transition-colors hover:text-ink"
          >
            Briefs
          </Link>
        </nav>
      </div>
    </header>
  );
}

function ProofStrip() {
  const items = [
    {
      icon: <CircleDot size={16} />,
      title: "Strategy over tactics",
      copy: "ICP filters, buying signals, account fit, and next actions before volume.",
    },
    {
      icon: <ShieldCheck size={16} />,
      title: "Control every step",
      copy: "Review, approve, and refine sequence copy, reply routing, and send decisions.",
    },
    {
      icon: <Sparkles size={16} />,
      title: "Compound results",
      copy: "Track performance, learn what worked, and improve the next campaign.",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.title} className="border-l border-line-strong pl-5">
          <div className="mb-4 grid h-10 w-10 place-items-center border border-accent/35 bg-accent/10 text-accent">
            {item.icon}
          </div>
          <h2 className="font-display text-[26px] font-semibold leading-none text-ink">{item.title}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-dim">{item.copy}</p>
        </div>
      ))}
    </div>
  );
}

export function LandingView() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleScrape = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await scrapeWebsite(url.trim());
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      saveWizardDraft({
        fields: { ...EMPTY_FIELDS, ...result.fields },
        confidence: (result.confidence || {}) as Record<string, "high" | "medium" | "low" | "">,
      });
      router.push("/wizard");
    } catch {
      setError("Failed to analyze website. Check the URL and try again.");
    }
    setLoading(false);
  };

  const startManual = () => {
    saveWizardDraft({ fields: EMPTY_FIELDS, confidence: {} });
    router.push("/wizard");
  };

  return (
    <div className="relative z-10 min-h-screen overflow-hidden text-white">
      <LandingHeader />

      <main>
        <section className="relative min-h-[760px] border-b border-line lg:min-h-[820px]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-y-0 right-0 w-full max-w-[980px] opacity-90">
              <Image
                src="/david-head.png"
                alt=""
                fill
                priority
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover object-[58%_24%]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,#090807_0%,rgba(9,8,7,0.88)_18%,rgba(9,8,7,0.5)_48%,rgba(9,8,7,0.22)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_28%,rgba(255,255,255,0.14),transparent_25%),linear-gradient(180deg,rgba(9,8,7,0),#090807_96%)]" />
            </div>
            <div className="absolute left-[46%] top-10 hidden h-[78%] w-px rotate-[24deg] bg-gradient-to-b from-transparent via-white/10 to-transparent lg:block" />
            <div className="absolute right-12 top-20 hidden h-[520px] w-[520px] rounded-full border border-white/[0.05] lg:block" />
            <div className="absolute right-24 top-28 hidden h-[420px] w-[420px] rounded-full border border-accent/[0.08] lg:block" />
          </div>

          <div className="relative mx-auto max-w-[1500px] px-5 pb-10 pt-5 sm:px-8 sm:pb-12 sm:pt-7">
            <div className="max-w-[820px]">
              <h1 className="reveal font-display text-[64px] font-medium leading-[0.92] text-white sm:text-[86px] lg:text-[104px]">
                Strategy first.
                <br />
                <em className="text-[#d12d3b]">Outcomes follow.</em>
              </h1>

              <div
                data-darkreader-ignore
                className="reveal mt-8 max-w-[900px] rounded-[18px] border border-white/28 bg-black/92 px-7 py-9 sm:px-8 sm:py-10"
              >
                <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <label
                    htmlFor="campaign-website-url"
                    className="font-body text-[15px] font-semibold tracking-[0.02em] text-white"
                  >
                    Website URL
                  </label>
                  <span className="font-body text-[13px] text-white/55">
                    Paste any site to start the campaign builder
                  </span>
                </div>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_190px] lg:items-center">
                  <IcpInput
                    data-darkreader-ignore
                    id="campaign-website-url"
                    type="url"
                    placeholder="https://example.com/"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                    aria-label="Website URL"
                    className="h-16 rounded-[14px] border border-white/38 bg-black px-5 font-body text-[18px] text-white shadow-none placeholder:text-white/48 focus:border-white"
                  />
                  <Button
                    data-darkreader-ignore
                    variant="solid"
                    onClick={handleScrape}
                    disabled={loading}
                    className="h-16 w-full rounded-[14px] border border-[#d12d3b]/70 bg-[#d12d3b]/22 font-body text-[15px] font-semibold text-white shadow-none hover:bg-[#d12d3b]/34 lg:w-[190px]"
                  >
                    {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                    {loading ? "Analyzing..." : "Build campaign"}
                    {!loading ? <ArrowRight size={15} /> : null}
                  </Button>
                </div>
                <div className="mt-7 flex flex-wrap items-center gap-4 border-t border-white/14 pt-6">
                  <Button
                    data-darkreader-ignore
                    variant="outline"
                    onClick={startManual}
                    className="rounded-[14px] border-white/35 bg-black font-body text-[14px] font-medium text-white hover:border-white hover:bg-black"
                  >
                    Build manually instead
                  </Button>
                  <Link href="/dashboard">
                    <Button
                      data-darkreader-ignore
                      variant="ghost"
                      className="font-body text-[14px] font-medium text-white/82 hover:bg-transparent hover:text-white"
                    >
                      View saved campaigns
                    </Button>
                  </Link>
                </div>
                {error && <p className="mt-4 font-body text-[13px] text-[#d12d3b]">{error}</p>}
              </div>

              <p className="reveal mt-7 max-w-[660px] font-display text-[25px] italic leading-[1.55] text-white/82">
                Turn a website or product description into campaign strategy, ICP filters,
                buying signals, sequence copy, reply routing, tracking, and the next campaign.
              </p>
            </div>
          </div>
        </section>

        <section className="section-band mx-auto max-w-[1500px] px-5 py-12 sm:px-8 sm:py-14">
          <ProofStrip />
        </section>

        <section className="section-band mx-auto grid max-w-[1500px] gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.42fr_0.58fr]">
          <div>
            <div className="eyebrow">01 · Campaign chapters</div>
            <h2 className="section-title mt-4">
              Start with strategy. <em>Not a send.</em>
            </h2>
            <p className="section-copy mt-5">
              The first output is a campaign brain: target logic, buying signals, fit scoring,
              guardrails, and learning loops before any outreach leaves the system.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {["Campaign strategy", "ICP filters", "Reply router"].map((title, index) => (
              <div key={title} className="panel p-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                  0{index + 1}
                </div>
                <h3 className="mt-8 font-display text-[28px] leading-tight text-ink">{title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-dim">
                  {index === 0
                    ? "Turn product input into a focused campaign angle and practical next actions."
                    : index === 1
                      ? "Shape fit criteria and signals so accounts are ranked for reasons."
                      : "Classify replies and decide what should happen next with guardrails visible."}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
