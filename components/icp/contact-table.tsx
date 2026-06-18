import type { ICPContact } from "@/lib/types/icp";
import { cn } from "@/lib/utils";

const verificationCls: Record<string, string> = {
  verified_public: "border-accent/40 bg-accent/10 text-accent",
  corporate_only: "border-cyan/40 bg-cyan/10 text-cyan",
  needs_manual: "border-amber/40 bg-amber/10 text-amber",
  linkedin_search_only: "border-line bg-surface-2 text-ink-dim",
};

export function ContactTable({ contacts }: { contacts: ICPContact[] }) {
  if (!contacts.length) {
    return (
      <div className="panel grid place-items-center py-16 text-center">
        <p className="text-[14px] text-ink-dim">No contacts discovered yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 rounded-[14px] border border-amber/25 bg-amber/[0.06] px-4 py-3.5 text-[13px] leading-[1.75] text-ink-dim">
        Public sources only — verify contact details before outreach. Many rows may have corporate phone or LinkedIn search URL only.
      </div>
      <div className="panel overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface-2/60">
              <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Name</th>
              <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Company</th>
              <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Contact</th>
              <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Verification</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="hover-row border-b border-line last:border-0">
                <td className="px-5 py-4">
                  <div className="font-medium text-ink">{c.decision_maker_name}</div>
                  <div className="text-[11px] text-ink-faint">{c.title}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="text-ink-dim">{c.company_name}</div>
                  <div className="text-[11px] text-ink-faint">{c.industry}</div>
                </td>
                <td className="px-5 py-4 text-ink-dim">
                  {c.email && <div>{c.email}</div>}
                  {c.phone && <div>{c.phone}</div>}
                  {c.linkedin_search_url && (
                    <a
                      href={c.linkedin_search_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      LinkedIn search
                    </a>
                  )}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={cn(
                      "inline-block rounded-md border px-2 py-0.5 font-mono text-[10px]",
                      verificationCls[c.verification_status] ?? verificationCls.needs_manual,
                    )}
                  >
                    {c.verification_status.replace(/_/g, " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
