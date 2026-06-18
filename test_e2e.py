#!/usr/bin/env python3
"""Deterministic end-to-end verification for the campaign profile API."""
import json
import os
import sys
import tempfile
from pathlib import Path

# Use temp DB for test isolation
test_dir = Path(tempfile.mkdtemp(prefix="campaign-builder-test-"))
os.environ["ICP_STUDIO_DATA_DIR"] = str(test_dir)

sys.path.insert(0, str(Path(__file__).parent / "backend"))

from fastapi.testclient import TestClient
from main import app
from services import website_analyzer

client = TestClient(app)

payload_path = os.environ.get("CAMPAIGN_VERIFY_PAYLOAD_PATH") or os.environ.get("ICP_VERIFY_PAYLOAD_PATH")
payload = json.loads(Path(payload_path).read_text()) if payload_path else {}
expected_fields = payload.get("fields")
expected_confidence = payload.get("confidence", {})
expected_revenue_state = payload.get("revenueState")

print("1. Health check...")
r = client.get("/api/health")
assert r.status_code == 200, r.text
print("   OK")

print("2. Scrape getdavid.ai from deterministic fixture...")
network_calls = []


def _network_forbidden(url, *args, **kwargs):
    network_calls.append(url)
    raise AssertionError(f"Unexpected network fetch during deterministic scrape: {url}")


website_analyzer._fetch = _network_forbidden
r = client.post("/api/scrape", json={"url": "https://getdavid.ai/"})
assert r.status_code == 200, r.text
data = r.json()
assert network_calls == [], f"Scrape attempted network calls: {network_calls}"
assert data.get("fields", {}).get("company_name"), "No company name"
assert len(data.get("fields", {}).get("best_fit_industries", [])) >= 1, "No industries"
assert any("fixture:" in source for source in data.get("sources", [])), data.get("sources", [])
if expected_fields:
    assert data["fields"]["company_name"] == expected_fields["company_name"]
    assert data["fields"]["website_url"] == expected_fields["website_url"]
print(f"   Company: {data['fields']['company_name']}")
print(f"   Industries: {data['fields']['best_fit_industries'][:3]}")

print("3. Analyze offline URL via deterministic fallback...")
website_analyzer._fetch = lambda *args, **kwargs: None
r = client.post("/api/scrape", json={"url": "https://offline-demo.invalid/"})
assert r.status_code == 200, r.text
fallback = r.json()
assert fallback.get("error") is None, fallback
assert fallback["fields"]["company_name"] == "Offline Demo"
assert fallback["fields"]["website_url"] == "https://offline-demo.invalid/"
assert len(fallback["fields"]["best_fit_industries"]) >= 3
assert any("fallback:" in source for source in fallback.get("sources", [])), fallback.get("sources", [])
print(f"   Fallback company: {fallback['fields']['company_name']}")

print("4. Create accepted profile...")
fields = expected_fields or data["fields"]
fields["best_fit_industries"] = fields.get("best_fit_industries", ["Dental", "Real Estate", "Healthcare"])
r = client.post("/api/profiles", json={"fields": fields, "confidence": expected_confidence or data.get("confidence", {}), "status": "accepted"})
assert r.status_code == 200, r.text
profile = r.json()
profile_id = profile["id"]
assert profile["status"] == "accepted"
print(f"   Profile ID: {profile_id}")

print("5. Discover contacts...")
r = client.post(f"/api/profiles/{profile_id}/discover-contacts")
assert r.status_code == 200, r.text
disc = r.json()
assert disc["count"] >= 5, f"Expected >=5 contacts, got {disc['count']}"
print(f"   Found {disc['count']} contacts")

print("6. Export to outreach queue...")
r = client.post("/api/outreach/export", json={"profile_id": profile_id})
assert r.status_code == 200, r.text
export = r.json()
assert export["exported"] >= 5, f"Expected >=5 exported, got {export['exported']}"
print(f"   Exported {export['exported']} to queue")

print("7. Verify outreach queue...")
r = client.get(f"/api/outreach/queue/{profile_id}")
assert r.status_code == 200, r.text
queue = r.json()
assert len(queue) >= 5
assert all(len(item.get("connection_note", "")) <= 300 for item in queue), "Note exceeds 300 chars"
print(f"   Queue has {len(queue)} items, notes <= 300 chars")

print("8. List profiles...")
r = client.get("/api/profiles")
assert r.status_code == 200
assert len(r.json()) >= 1

print("9. Revenue state (empty on create)...")
r = client.get(f"/api/profiles/{profile_id}/revenue")
assert r.status_code == 200, r.text
rev = r.json()
assert rev["accounts"] == []
assert rev["loadedScenario"] is None
print("   OK")

print("10. Save revenue state...")
sample_state = expected_revenue_state or {
    "accounts": [
        {
            "id": "test-1",
            "name": "Test Co",
            "recommendedDavidOfferPath": "custom_agent",
            "revenueModel": {"estimatedRecurringMonthlyUsd": [500, 2000]},
        }
    ],
    "loadedScenario": "icp",
    "strategy": {"oneLiner": "Test strategy"},
    "campaign": None,
    "outreachByAccount": {},
    "lastRouted": None,
}
r = client.put(f"/api/profiles/{profile_id}/revenue", json=sample_state)
assert r.status_code == 200, r.text

r = client.get(f"/api/profiles/{profile_id}/revenue")
assert r.status_code == 200, r.text
saved = r.json()
assert saved["loadedScenario"] == "icp"
assert len(saved["accounts"]) == len(sample_state["accounts"])
assert saved["strategy"]["oneLiner"] == sample_state["strategy"]["oneLiner"]
assert saved["accounts"][0]["recommendedDavidOfferPath"], "Missing offer-path handoff"
assert saved["accounts"][0]["revenueModel"]["estimatedRecurringMonthlyUsd"][1] > 0
if sample_state.get("campaign"):
    assert saved["campaign"]["positioning"]["promise"] == "Campaign intelligence, not campaign sending."
    assert saved["campaign"]["metrics"]["repliesRouted"] >= 1
    assert saved["campaign"]["learningInsights"]["nextCampaignRecommendation"]
if sample_state.get("lastRouted"):
    assert saved["lastRouted"]["routed"]["intent"] == sample_state["lastRouted"]["routed"]["intent"]
    assert saved["lastRouted"]["routed"]["updatePipelineStage"] == "meeting_ready"
    assert saved["lastRouted"]["applied"] is True
print("   OK")

print("\nAll campaign E2E tests passed!")
print(f"Test DB: {test_dir / 'data.db'}")
