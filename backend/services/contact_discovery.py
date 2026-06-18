import csv
from pathlib import Path
from urllib.parse import quote

# Seed contacts from public OSINT research (verified_public / corporate_only)
SEED_CONTACTS = [
    {
        "company_name": "Bridge Dental Group",
        "industry": "Dental",
        "decision_maker_name": "Dr. Peter Theurer",
        "title": "Co-Founder & CEO",
        "email": "info@bridgedentalgroup.com",
        "phone": "385-449-0706",
        "website_url": "https://bridgedentalgroup.com",
        "verification_status": "verified_public",
        "source_url": "https://bridgedentalgroup.com/about-bridge/",
        "hook_angle": "Multi-location DSO scaling fast; voice agents for appointment booking",
    },
    {
        "company_name": "Bridge Dental Group",
        "industry": "Dental",
        "decision_maker_name": "Rich Nash",
        "title": "Chief Growth Officer",
        "email": "info@bridgedentalgroup.com",
        "phone": "385-449-0706",
        "website_url": "https://bridgedentalgroup.com",
        "verification_status": "verified_public",
        "source_url": "https://linkedin.com/company/bridge-dental-group",
        "hook_angle": "Ops automation as they add practices",
    },
    {
        "company_name": "Heartland Dental",
        "industry": "Dental",
        "decision_maker_name": "Patrick Bauer",
        "title": "President & CEO",
        "email": "media@heartland.com",
        "phone": "(217) 540-5100",
        "website_url": "https://heartland.com",
        "verification_status": "verified_public",
        "source_url": "https://heartland.com/contact/",
        "hook_angle": "Largest DSO; custom AI OS for ops layer",
    },
    {
        "company_name": "Presidio Real Estate Group",
        "industry": "Real Estate",
        "decision_maker_name": "Jennifer Yeo",
        "title": "Owner / CEO / Principal Broker",
        "email": "utahrebroker@gmail.com",
        "phone": "801-251-6683",
        "website_url": "https://presidioteam.com",
        "verification_status": "verified_public",
        "source_url": "https://www.presidioteam.com/About",
        "hook_angle": "Lead response + transaction coordination; 12+ offices",
    },
    {
        "company_name": "Berkshire Hathaway HomeServices Utah Properties",
        "industry": "Real Estate",
        "decision_maker_name": "Stephen C. Roney",
        "title": "Chairman / CEO / Owner",
        "email": "",
        "phone": "435-649-7171",
        "website_url": "https://www.bhhsutah.com",
        "verification_status": "corporate_only",
        "source_url": "https://www.bhhsutah.com/temp-offices/",
        "hook_angle": "30 offices; lead agents + CRM integration",
    },
    {
        "company_name": "Wasatch Property Management",
        "industry": "Property Management",
        "decision_maker_name": "Dell Loy Hansen",
        "title": "Founder & CEO",
        "email": "",
        "phone": "435-755-2000",
        "website_url": "https://www.wasatchgroup.com",
        "verification_status": "corporate_only",
        "source_url": "https://www.bbb.org/us/ut/logan/profile/real-estate-rentals/wasatch-property-management-inc-1166-13000966",
        "hook_angle": "Property mgmt ops; maintenance + tenant intake automation",
    },
    {
        "company_name": "Revere Health",
        "industry": "Healthcare",
        "decision_maker_name": "Jacque Durfey",
        "title": "CEO",
        "email": "patientservices@reverehealth.com",
        "phone": "801-429-8000",
        "website_url": "https://reverehealth.com",
        "verification_status": "verified_public",
        "source_url": "https://reverehealth.com/departments/provo-administration/",
        "hook_angle": "100+ clinics; patient scheduling + ops automation",
    },
    {
        "company_name": "Intermountain Health",
        "industry": "Healthcare",
        "decision_maker_name": "Nannette Berensen",
        "title": "COO",
        "email": "",
        "phone": "801-442-2000",
        "website_url": "https://intermountainhealthcare.org",
        "verification_status": "corporate_only",
        "source_url": "https://intermountainhealthcare.org/about/contact",
        "hook_angle": "Multi-hospital ops; inbound call volume",
    },
]

INDUSTRY_ALIASES = {
    "dental": ["Dental", "Orthodontics"],
    "orthodontics": ["Orthodontics", "Dental"],
    "real estate": ["Real Estate", "Property Management"],
    "property management": ["Property Management", "Real Estate"],
    "healthcare": ["Healthcare"],
    "legal": ["Legal"],
    "insurance": ["Insurance"],
    "construction": ["Construction", "Home Improvement"],
    "hvac": ["HVAC", "Home Improvement"],
    "solar": ["Solar", "Home Improvement"],
    "home improvement": ["Home Improvement", "Construction"],
    "restaurants": ["Restaurants"],
    "fitness": ["Fitness"],
    "financial services": ["Financial Services"],
    "e-commerce": ["E-Commerce"],
    "vertical saas": ["Vertical SaaS"],
}


def _linkedin_search_url(name: str, company: str) -> str:
    q = quote(f"{name} {company}")
    return f"https://www.linkedin.com/search/results/people/?keywords={q}"


def _match_industries(target_industries: list[str]) -> list[str]:
    matched = set()
    for ind in target_industries:
        key = ind.lower().strip()
        if key in INDUSTRY_ALIASES:
            matched.update(INDUSTRY_ALIASES[key])
        else:
            matched.add(ind)
    return list(matched)


def discover_contacts(profile_fields: dict, max_per_industry: int = 5) -> list[dict]:
    target = profile_fields.get("best_fit_industries", [])
    if isinstance(target, str):
        target = [t.strip() for t in target.split(",") if t.strip()]

    matched_inds = _match_industries(target[:3])
    results = []

    for seed in SEED_CONTACTS:
        if seed["industry"] in matched_inds:
            contact = dict(seed)
            if not contact.get("linkedin_search_url"):
                contact["linkedin_search_url"] = _linkedin_search_url(
                    contact["decision_maker_name"], contact["company_name"]
                )
            if not contact.get("email") and not contact.get("phone"):
                contact["verification_status"] = "linkedin_search_only"
            results.append(contact)

    # Also try loading from CSV if present
    csv_path = Path(__file__).resolve().parents[3] / "david-ai-icp-prospects-top3-industries.csv"
    if csv_path.exists():
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                ind = row.get("industry", "").split("/")[0].strip()
                if any(m.lower() in ind.lower() or ind.lower() in m.lower() for m in matched_inds):
                    name = row.get("decision_maker_name", "")
                    company = row.get("company_name", "")
                    if not name or not company:
                        continue
                    # avoid duplicates
                    if any(r["company_name"] == company and r["decision_maker_name"] == name for r in results):
                        continue
                    results.append({
                        "company_name": company,
                        "industry": ind,
                        "decision_maker_name": name,
                        "title": row.get("title", ""),
                        "email": row.get("email", ""),
                        "phone": row.get("phone", ""),
                        "website_url": row.get("source_url", ""),
                        "verification_status": row.get("contact_verification", "needs_manual").lower().replace(
                            "verified_public_company", "verified_public"
                        ).replace("verified_public_executive", "verified_public").replace(
                            "verified_public_corporate", "corporate_only"
                        ).replace("verified_public_press_release", "verified_public"),
                        "source_url": row.get("source_url", ""),
                        "hook_angle": row.get("david_ai_hook_angle", ""),
                        "linkedin_search_url": _linkedin_search_url(name, company),
                    })

    # Cap per industry
    by_ind: dict[str, list] = {}
    for c in results:
        by_ind.setdefault(c["industry"], []).append(c)
    capped = []
    for ind, contacts in by_ind.items():
        capped.extend(contacts[:max_per_industry])

    return capped[:20]


def generate_connection_note(profile_fields: dict, contact: dict, max_chars: int = 300) -> str:
    first = (contact.get("decision_maker_name") or "there").split()[0].replace("Dr.", "").strip()
    company = contact.get("company_name", "your company")
    hook = contact.get("hook_angle", "")
    offering = (profile_fields.get("core_offering") or "")[:80]
    value = (profile_fields.get("value_proposition") or "").split("\n")[0].replace("• ", "")[:60]

    if hook:
        note = f"Hi {first} — {hook} at {company} caught my eye. {offering}. {value}. Open to connect?"
    else:
        note = f"Hi {first} — saw {company} scaling ops. We help multi-location teams automate inbound + back-office with custom AI. Worth connecting?"

    if len(note) > max_chars:
        note = note[: max_chars - 3].rsplit(" ", 1)[0] + "..."
    return note
