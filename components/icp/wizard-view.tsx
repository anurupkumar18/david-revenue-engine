"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  COMPANY_SIZE_OPTIONS,
  EMPTY_FIELDS,
  WIZARD_STEPS,
  type ConfidenceLevel,
  type ICPFields,
} from "@/lib/types/icp";
import { loadWizardDraft, saveWizardDraft } from "@/lib/icp-session";
import { Button } from "@/components/ui";
import { FieldLabel } from "@/components/icp/form-fields";
import {
  IcpFieldGroup,
  IcpInput,
  IcpPageHeader,
  IcpSelect,
  IcpShell,
  IcpTextarea,
} from "@/components/icp/icp-shell";
import { ProgressRail } from "@/components/icp/progress-rail";
import { TagInput } from "@/components/icp/tag-input";

export function WizardView() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState<ICPFields>(EMPTY_FIELDS);
  const [confidence, setConfidence] = useState<Record<string, ConfidenceLevel>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = loadWizardDraft();
      if (draft) {
        setFields({ ...EMPTY_FIELDS, ...draft.fields });
        setConfidence(draft.confidence || {});
      }
      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const update = (key: keyof ICPFields, value: string | string[]) => {
    setFields((f) => ({ ...f, [key]: value }));
    setConfidence((c) => ({ ...c, [key]: "" }));
  };

  const persist = (nextFields = fields, nextConfidence = confidence) => {
    saveWizardDraft({ fields: nextFields, confidence: nextConfidence });
  };

  const next = () => {
    persist();
    if (step < 2) setStep(step + 1);
    else router.push("/review");
  };

  const back = () => {
    persist();
    if (step > 0) setStep(step - 1);
    else router.push("/");
  };

  if (!ready) return null;

  return (
    <IcpShell rail={<ProgressRail steps={[...WIZARD_STEPS]} current={step} />}>
      {step === 0 && (
        <>
          <IcpPageHeader
            eyebrow="Step 1 of 3"
            title="Product Input"
            subtitle="Tell us what the product does and where the campaign should start."
          />
          <IcpFieldGroup>
            <FieldLabel label="Company or product name" confidence={confidence.company_name} />
            <IcpInput value={fields.company_name} onChange={(e) => update("company_name", e.target.value)} placeholder="e.g., Acme Workflow OS" />
          </IcpFieldGroup>
          <IcpFieldGroup>
            <FieldLabel label="Website URL" confidence={confidence.website_url} />
            <IcpInput type="url" value={fields.website_url} onChange={(e) => update("website_url", e.target.value)} placeholder="https://example.com/" />
          </IcpFieldGroup>
          <IcpFieldGroup>
            <FieldLabel label="What does your product/service actually do?" confidence={confidence.core_offering} microcopy="Explain your main mechanism or what category you own." />
            <IcpTextarea value={fields.core_offering} onChange={(e) => update("core_offering", e.target.value)} rows={4} placeholder="We help revenue teams turn workflow signals into campaign strategy..." />
          </IcpFieldGroup>
        </>
      )}

      {step === 1 && (
        <>
          <IcpPageHeader eyebrow="Step 2 of 3" title="ICP Filters" subtitle="Who buys this, and what attributes should the campaign target or exclude?" />
          <IcpFieldGroup>
            <FieldLabel label="Best-Fit Industries" confidence={confidence.best_fit_industries} />
            <TagInput tags={fields.best_fit_industries} onChange={(t) => update("best_fit_industries", t)} />
          </IcpFieldGroup>
          <div className="grid gap-5 sm:grid-cols-2">
            <IcpFieldGroup>
              <FieldLabel label="Ideal Company Size" confidence={confidence.company_size} />
              <IcpSelect value={fields.company_size} onChange={(e) => update("company_size", e.target.value)}>
                {COMPANY_SIZE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o} employees</option>
                ))}
              </IcpSelect>
            </IcpFieldGroup>
            <IcpFieldGroup>
              <FieldLabel label="Geography" confidence={confidence.geography} />
              <IcpInput value={fields.geography} onChange={(e) => update("geography", e.target.value)} placeholder="United States / North America" />
            </IcpFieldGroup>
          </div>
          <IcpFieldGroup>
            <FieldLabel label="Who holds the budget, and who uses it daily?" confidence={confidence.decision_makers} />
            <IcpTextarea value={fields.decision_makers} onChange={(e) => update("decision_makers", e.target.value)} rows={4} placeholder="Buyers: CRO, VP of Sales…" />
          </IcpFieldGroup>
        </>
      )}

      {step === 2 && (
        <>
          <IcpPageHeader eyebrow="Step 3 of 3" title="Buying Signals" subtitle="Pains, wins, and timing triggers that shape outreach and reply routing." />
          <IcpFieldGroup>
            <FieldLabel label="Core Pain Points" confidence={confidence.pain_points} microcopy="This shapes the hooks for the campaign sequence." />
            <IcpTextarea value={fields.pain_points} onChange={(e) => update("pain_points", e.target.value)} rows={4} />
          </IcpFieldGroup>
          <IcpFieldGroup>
            <FieldLabel label="Value Proposition & Outcomes" confidence={confidence.value_proposition} />
            <IcpTextarea value={fields.value_proposition} onChange={(e) => update("value_proposition", e.target.value)} rows={4} />
          </IcpFieldGroup>
          <IcpFieldGroup>
            <FieldLabel label="Buying Signals" confidence={confidence.buying_signals} microcopy="Events or indicators that make them a perfect timing-based lead." />
            <IcpTextarea value={fields.buying_signals} onChange={(e) => update("buying_signals", e.target.value)} rows={3} />
          </IcpFieldGroup>
          <IcpFieldGroup>
            <FieldLabel label="Disqualifiers" confidence={confidence.disqualifiers} microcopy="Tell the campaign strategist who to exclude." />
            <IcpTextarea value={fields.disqualifiers} onChange={(e) => update("disqualifiers", e.target.value)} rows={3} />
          </IcpFieldGroup>
        </>
      )}

      <div className="mt-8 flex gap-2">
        <Button variant="outline" onClick={back}>Back</Button>
        <Button variant="solid" onClick={next}>
          {step < 2 ? "Continue" : "Review campaign"}
        </Button>
      </div>
    </IcpShell>
  );
}
