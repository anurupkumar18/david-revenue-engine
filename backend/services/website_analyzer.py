import re
from pathlib import Path
from urllib.parse import quote, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

INDUSTRY_KEYWORDS = {
    "dental": "Dental",
    "orthodont": "Orthodontics",
    "real estate": "Real Estate",
    "property management": "Property Management",
    "healthcare": "Healthcare",
    "hospital": "Healthcare",
    "medical": "Healthcare",
    "legal": "Legal",
    "law firm": "Legal",
    "insurance": "Insurance",
    "construction": "Construction",
    "restaurant": "Restaurants",
    "fitness": "Fitness",
    "wellness": "Fitness",
    "financial": "Financial Services",
    "e-commerce": "E-Commerce",
    "ecommerce": "E-Commerce",
    "education": "Education",
    "edtech": "Education",
    "solar": "Solar",
    "hvac": "HVAC",
    "home improvement": "Home Improvement",
}

DEFAULT_DECISION_MAKERS = """Buyers: CEO, COO, VP Operations, CRO, VP Sales, Managing Partner, Practice Owner
End-Users: front desk staff, office managers, field sales reps, patient coordinators, transaction coordinators"""

FIXTURE_DIR = Path(__file__).resolve().parents[1] / "fixtures"


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _fetch(url: str, timeout: float = 15.0) -> str | None:
    try:
        with httpx.Client(follow_redirects=True, timeout=timeout) as client:
            resp = client.get(url, headers={"User-Agent": "Campaign-Builder/1.0"})
            if resp.status_code == 200:
                return resp.text
    except Exception:
        return None
    return None


def _normalize_url(url: str) -> str:
    if not url.startswith("http"):
        return f"https://{url}"
    return url


def _host(url: str) -> str:
    return urlparse(url).netloc.lower().split("@")[-1].split(":")[0].replace("www.", "")


def _fixture_for_url(url: str) -> tuple[str, str] | None:
    host = _host(url)
    if not host:
        return None

    fixture_path = FIXTURE_DIR / f"{host}.html"
    if not fixture_path.exists():
        return None

    return fixture_path.read_text(encoding="utf-8"), f"fixture:{fixture_path.name}"


def _domain_company_name(url: str) -> str:
    host = _host(url)
    if not host:
        return "Demo Company"
    label = host.split(".")[0]
    return label.replace("-", " ").replace("_", " ").title()


def _extract_text_blocks(soup: BeautifulSoup, limit: int = 8) -> list[str]:
    blocks = []
    for tag in soup.find_all(["h1", "h2", "h3", "p", "li"]):
        text = _clean(tag.get_text())
        if len(text) > 30:
            blocks.append(text)
        if len(blocks) >= limit:
            break
    return blocks


def _guess_company_name(soup: BeautifulSoup, url: str) -> str:
    title = _clean(soup.title.string if soup.title else "")
    if title:
        name = re.split(r"[|\-–—]", title)[0].strip()
        if name:
            return name
    domain = urlparse(url).netloc.replace("www.", "").split(".")[0]
    return domain.replace("-", " ").title()


def _find_industries(text: str) -> list[str]:
    found = []
    lower = text.lower()
    for keyword, label in INDUSTRY_KEYWORDS.items():
        if keyword in lower and label not in found:
            found.append(label)
    return found[:12]


def _fallback_analysis(url: str) -> dict:
    company_name = _domain_company_name(url)
    fields = {
        "company_name": company_name,
        "website_url": url,
        "core_offering": (
            f"{company_name} appears to be a service business that can use campaign intelligence "
            "to capture missed demand, automate follow-up, and turn operational leaks into recurring value."
        ),
        "best_fit_industries": ["Healthcare", "Real Estate", "Dental", "Home Improvement"],
        "company_size": "25-200",
        "geography": "United States / North America",
        "decision_makers": DEFAULT_DECISION_MAKERS,
        "pain_points": (
            "• Leads dying on voicemail and after-hours calls\n"
            "• Manual copy-paste between disconnected tools\n"
            "• Failed AI experiments that never ship to production"
        ),
        "value_proposition": (
            "• Measurable operational savings within weeks\n"
            "• Custom systems wired into existing tools\n"
            "• Flat-fee engagement with production deployment"
        ),
        "buying_signals": (
            "• Hiring front desk, coordinators, or ops admins at scale\n"
            "• Multi-location expansion without proportional back-office headcount\n"
            "• Paying for generic AI tools with low team adoption"
        ),
        "disqualifiers": (
            "• Pre-revenue or sub-10-person teams with no repeatable workflow\n"
            "• Buyers wanting only a cheap chatbot widget\n"
            "• No inbound phone, scheduling, or ops complexity"
        ),
    }

    confidence = {
        "company_name": "medium",
        "website_url": "high",
        "core_offering": "low",
        "best_fit_industries": "low",
        "company_size": "low",
        "geography": "low",
        "decision_makers": "medium",
        "pain_points": "medium",
        "value_proposition": "medium",
        "buying_signals": "medium",
        "disqualifiers": "medium",
    }

    return {
        "fields": fields,
        "confidence": confidence,
        "sources": [f"fallback:{_host(url) or 'unknown'}"],
        "error": None,
    }


def _find_subpages(base_url: str, soup: BeautifulSoup) -> list[str]:
    paths = ["/about", "/about-us", "/industries", "/services", "/pricing", "/contact"]
    urls = [base_url]
    for a in soup.find_all("a", href=True):
        href = a["href"].lower()
        for path in paths:
            if path in href:
                full = urljoin(base_url, a["href"])
                if full not in urls:
                    urls.append(full)
    return urls[:5]


def analyze_website(url: str) -> dict:
    url = _normalize_url(url)

    fixture = _fixture_for_url(url)
    html = fixture[0] if fixture else _fetch(url)
    if not html:
        return _fallback_analysis(url)

    soup = BeautifulSoup(html, "html.parser")
    all_text = ""
    sources = [fixture[1] if fixture else url]

    if not fixture:
        for sub_url in _find_subpages(url, soup)[1:]:
            sub_html = _fetch(sub_url)
            if sub_html:
                sources.append(sub_url)
                all_text += " " + BeautifulSoup(sub_html, "html.parser").get_text(" ")

    blocks = _extract_text_blocks(soup)
    all_text += " " + soup.get_text(" ")
    meta_desc = ""
    meta = soup.find("meta", attrs={"name": "description"})
    if meta and meta.get("content"):
        meta_desc = _clean(meta["content"])

    company_name = _guess_company_name(soup, url)
    hero = blocks[0] if blocks else meta_desc
    offering_parts = [hero]
    if meta_desc and meta_desc != hero:
        offering_parts.append(meta_desc)
    if len(blocks) > 1:
        offering_parts.append(blocks[1])
    core_offering = _clean(" ".join(offering_parts[:3]))[:600]

    industries = _find_industries(all_text)
    if not industries:
        industries = ["Healthcare", "Real Estate", "Dental"]

    pain_keywords = ["problem", "bleeding", "waste", "miss", "manual", "copy-paste", "voicemail", "hours"]
    pain_blocks = [b for b in blocks if any(k in b.lower() for k in pain_keywords)]
    pain_points = "\n".join(f"• {b[:200]}" for b in pain_blocks[:4])
    if not pain_points:
        pain_points = "• Leads dying on voicemail and after-hours calls\n• Manual copy-paste between disconnected tools\n• Failed AI experiments that never ship to production"

    value_keywords = ["saved", "margin", "roi", "weeks", "results", "hours", "%", "revenue"]
    value_blocks = [b for b in blocks if any(k in b.lower() for k in value_keywords)]
    value_proposition = "\n".join(f"• {b[:200]}" for b in value_blocks[:4])
    if not value_proposition:
        value_proposition = "• Measurable operational savings within weeks\n• Custom systems wired into existing tools\n• Flat-fee engagement with production deployment"

    buying_signals = (
        "• Hiring front desk, coordinators, or ops admins at scale\n"
        "• Multi-location expansion without proportional back-office headcount\n"
        "• Paying for generic AI tools with low team adoption"
    )

    disqualifiers = (
        "• Pre-revenue or sub-10-person teams with no repeatable workflow\n"
        "• Buyers wanting only a cheap chatbot widget\n"
        "• No inbound phone, scheduling, or ops complexity"
    )

    fields = {
        "company_name": company_name,
        "website_url": url,
        "core_offering": core_offering,
        "best_fit_industries": industries,
        "company_size": "25-200",
        "geography": "United States / North America",
        "decision_makers": DEFAULT_DECISION_MAKERS,
        "pain_points": pain_points,
        "value_proposition": value_proposition,
        "buying_signals": buying_signals,
        "disqualifiers": disqualifiers,
    }

    confidence = {
        "company_name": "high" if company_name else "low",
        "website_url": "high",
        "core_offering": "high" if len(core_offering) > 80 else "medium",
        "best_fit_industries": "high" if len(industries) >= 3 else "medium",
        "company_size": "low",
        "geography": "low",
        "decision_makers": "medium",
        "pain_points": "high" if pain_blocks else "medium",
        "value_proposition": "high" if value_blocks else "medium",
        "buying_signals": "medium",
        "disqualifiers": "medium",
    }

    return {"fields": fields, "confidence": confidence, "sources": sources, "error": None}
