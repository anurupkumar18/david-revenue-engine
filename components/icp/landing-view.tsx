"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { scrapeWebsite } from "@/lib/icp-api";
import { EMPTY_FIELDS } from "@/lib/types/icp";
import { saveWizardDraft } from "@/lib/icp-session";
import { Button } from "@/components/ui";
import { IcpFieldGroup, IcpInput, IcpPageHeader, IcpShell } from "@/components/icp/icp-shell";

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
    <IcpShell maxWidth="max-w-2xl">
      <IcpPageHeader
        eyebrow="01 · ICP Builder"
        title="Build your ideal customer profile"
        subtitle="Answer 10 questions about your business — or paste your website URL and we'll draft your targeting profile automatically."
      />

      <div className="panel p-5 reveal" style={{ animationDelay: "80ms" }}>
        <div className="eyebrow mb-2">Website URL</div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <IcpInput
            type="url"
            placeholder="https://getdavid.ai/"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScrape()}
          />
          <Button variant="solid" onClick={handleScrape} disabled={loading} className="shrink-0">
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            {loading ? "Analyzing…" : "Analyze"}
          </Button>
        </div>
        {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
      </div>

      <div className="mt-6 flex flex-wrap gap-2 reveal" style={{ animationDelay: "160ms" }}>
        <Button variant="outline" onClick={startManual}>
          Build manually instead
        </Button>
        <Link href="/dashboard">
          <Button variant="ghost">View saved profiles</Button>
        </Link>
      </div>
    </IcpShell>
  );
}
