import type { ConfidenceLevel, ICPFields } from "@/lib/types/icp";
import { ConfidenceBadge } from "@/components/icp/form-fields";

const SECTIONS = [
  {
    title: "Company Identity",
    fields: [
      { key: "company_name", label: "Company Name" },
      { key: "website_url", label: "Website URL" },
      { key: "core_offering", label: "Core Offering" },
    ],
  },
  {
    title: "The Target",
    fields: [
      { key: "best_fit_industries", label: "Best-Fit Industries" },
      { key: "company_size", label: "Company Size" },
      { key: "geography", label: "Geography" },
      { key: "decision_makers", label: "Decision-Makers & Users" },
    ],
  },
  {
    title: "The Hook",
    fields: [
      { key: "pain_points", label: "Core Pain Points" },
      { key: "value_proposition", label: "Value Proposition" },
      { key: "buying_signals", label: "Buying Signals" },
      { key: "disqualifiers", label: "Disqualifiers" },
    ],
  },
] as const;

function formatValue(key: string, value: unknown): string {
  if (key === "best_fit_industries" && Array.isArray(value)) return value.join(", ");
  return String(value || "—");
}

export function ProfileReviewCard({
  fields,
  confidence,
}: {
  fields: ICPFields;
  confidence: Record<string, ConfidenceLevel>;
}) {
  return (
    <div className="space-y-5">
      {SECTIONS.map((section) => (
        <div key={section.title} className="panel p-6">
          <h3 className="mb-5 font-display text-[26px] font-semibold text-ink">{section.title}</h3>
          <div className="space-y-4">
            {section.fields.map(({ key, label }) => (
              <div key={key}>
                <div className="mb-1.5 flex items-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                  <ConfidenceBadge level={confidence[key]} /> {label}
                </div>
                <div className="text-[14px] leading-[1.75] text-ink-dim">
                  {formatValue(key, fields[key as keyof ICPFields])}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
