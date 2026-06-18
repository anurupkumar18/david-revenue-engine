#!/usr/bin/env python3
"""End-to-end test for ICP Studio API."""
import json
import os
import sys
import tempfile
from pathlib import Path

# Use temp DB for test isolation
test_dir = Path(tempfile.mkdtemp(prefix="icp-studio-test-"))
os.environ["ICP_STUDIO_DATA_DIR"] = str(test_dir)

sys.path.insert(0, str(Path(__file__).parent / "backend"))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("1. Health check...")
r = client.get("/api/health")
assert r.status_code == 200, r.text
print("   OK")

print("2. Scrape getdavid.ai...")
r = client.post("/api/scrape", json={"url": "https://getdavid.ai/"})
assert r.status_code == 200, r.text
data = r.json()
assert data.get("fields", {}).get("company_name"), "No company name"
assert len(data.get("fields", {}).get("best_fit_industries", [])) >= 1, "No industries"
print(f"   Company: {data['fields']['company_name']}")
print(f"   Industries: {data['fields']['best_fit_industries'][:3]}")

print("3. Create accepted profile...")
fields = data["fields"]
fields["best_fit_industries"] = fields.get("best_fit_industries", ["Dental", "Real Estate", "Healthcare"])
r = client.post("/api/profiles", json={"fields": fields, "confidence": data.get("confidence", {}), "status": "accepted"})
assert r.status_code == 200, r.text
profile = r.json()
profile_id = profile["id"]
print(f"   Profile ID: {profile_id}")

print("4. Discover contacts...")
r = client.post(f"/api/profiles/{profile_id}/discover-contacts")
assert r.status_code == 200, r.text
disc = r.json()
assert disc["count"] >= 5, f"Expected >=5 contacts, got {disc['count']}"
print(f"   Found {disc['count']} contacts")

print("5. Export to outreach queue...")
r = client.post("/api/outreach/export", json={"profile_id": profile_id})
assert r.status_code == 200, r.text
export = r.json()
assert export["exported"] >= 5, f"Expected >=5 exported, got {export['exported']}"
print(f"   Exported {export['exported']} to queue")

print("6. Verify outreach queue...")
r = client.get(f"/api/outreach/queue/{profile_id}")
assert r.status_code == 200, r.text
queue = r.json()
assert len(queue) >= 5
assert all(len(item.get("connection_note", "")) <= 300 for item in queue), "Note exceeds 300 chars"
print(f"   Queue has {len(queue)} items, notes <= 300 chars")

print("7. List profiles...")
r = client.get("/api/profiles")
assert r.status_code == 200
assert len(r.json()) >= 1

print("8. Revenue state (empty on create)...")
r = client.get(f"/api/profiles/{profile_id}/revenue")
assert r.status_code == 200, r.text
rev = r.json()
assert rev["accounts"] == []
assert rev["loadedScenario"] is None
print("   OK")

print("9. Save revenue state...")
sample_state = {
    "accounts": [{"id": "test-1", "name": "Test Co"}],
    "loadedScenario": "icp",
    "strategy": {"oneLiner": "Test strategy"},
    "outreachByAccount": {},
    "lastRouted": None,
}
r = client.put(f"/api/profiles/{profile_id}/revenue", json=sample_state)
assert r.status_code == 200, r.text

r = client.get(f"/api/profiles/{profile_id}/revenue")
assert r.status_code == 200, r.text
saved = r.json()
assert saved["loadedScenario"] == "icp"
assert len(saved["accounts"]) == 1
assert saved["strategy"]["oneLiner"] == "Test strategy"
print("   OK")

print("\nAll E2E tests passed!")
print(f"Test DB: {test_dir / 'data.db'}")
