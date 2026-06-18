export interface ICPFields {
  company_name: string;
  website_url: string;
  core_offering: string;
  best_fit_industries: string[];
  company_size: string;
  geography: string;
  decision_makers: string;
  pain_points: string;
  value_proposition: string;
  buying_signals: string;
  disqualifiers: string;
}

export type ConfidenceLevel = "high" | "medium" | "low" | "";

export interface ICPContact {
  id: number;
  profile_id: number;
  company_name: string;
  industry: string | null;
  decision_maker_name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_search_url: string | null;
  website_url: string | null;
  verification_status: string;
  source_url: string | null;
  hook_angle: string | null;
  status: string;
}

export interface ICPProfile {
  id: number;
  company_name: string;
  fields: ICPFields;
  confidence: Record<string, ConfidenceLevel>;
  status: string;
  created_at: string;
  contacts: ICPContact[];
}

export const EMPTY_FIELDS: ICPFields = {
  company_name: "",
  website_url: "",
  core_offering: "",
  best_fit_industries: [],
  company_size: "25-200",
  geography: "United States / North America",
  decision_makers: "",
  pain_points: "",
  value_proposition: "",
  buying_signals: "",
  disqualifiers: "",
};

export const COMPANY_SIZE_OPTIONS = [
  "1-10",
  "11-25",
  "25-50",
  "50-100",
  "100-200",
  "200-500",
  "500+",
];

export const INDUSTRY_PRESETS = [
  "Dental",
  "Orthodontics",
  "Real Estate",
  "Healthcare",
  "Legal",
  "Insurance",
  "Construction",
  "HVAC",
  "Solar",
  "Home Improvement",
  "Restaurants",
  "Fitness",
  "Financial Services",
  "E-Commerce",
  "Property Management",
  "Vertical SaaS",
];

export const WIZARD_STEPS = [
  { id: "identity", title: "Company Identity", subtitle: "Who you are" },
  { id: "target", title: "The Target", subtitle: "Who buys" },
  { id: "hook", title: "The Hook", subtitle: "Pains & wins" },
] as const;
