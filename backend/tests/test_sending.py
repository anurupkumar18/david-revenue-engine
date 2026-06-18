from datetime import datetime, timedelta

import pytest

from models import DailySendCount, ICPProfile, Message, SendJob
from services import compliance, sends


@pytest.fixture
def profile(db):
    p = ICPProfile(company_name="Acme", status="accepted")
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _start_payload(email="owner@biz.com", grade="A"):
    return {
        "sends": [
            {
                "account_id": "acc_1",
                "contact_email": email,
                "grade": grade,
                "step1": {"subject": "quick idea", "body": "missed calls cost you pipeline. worth a look?"},
                "step2": {"subject": "worth testing", "body": "following up on the missed calls angle. send specifics?"},
            }
        ]
    }


def test_start_sequence_creates_two_jobs(client, profile):
    resp = client.post(f"/api/sequences/{profile.id}/start", json=_start_payload())
    assert resp.status_code == 200
    body = resp.json()
    assert body["jobs_created"] == 2
    assert body["auto"] == 2 and body["needs_review"] == 0

    jobs = client.get(f"/api/send-jobs/{profile.id}").json()
    steps = sorted(j["step"] for j in jobs["jobs"])
    assert steps == ["1", "2"]
    # Step 2 is scheduled later than step 1.
    by_step = {j["step"]: j for j in jobs["jobs"]}
    assert by_step["2"]["scheduled_at"] > by_step["1"]["scheduled_at"]


def test_grade_d_routes_to_review(client, profile):
    resp = client.post(f"/api/sequences/{profile.id}/start", json=_start_payload(grade="D"))
    body = resp.json()
    assert body["auto"] == 0 and body["needs_review"] == 2


def test_suppressed_recipient_routes_to_review_then_skips_on_drain(client, profile, db):
    compliance.add_suppression(db, "owner@biz.com", profile.id, "unsubscribe")
    resp = client.post(f"/api/sequences/{profile.id}/start", json=_start_payload())
    assert resp.json()["needs_review"] == 2  # suppressed => not auto

    # Even if forced, a suppressed recipient is skipped at drain time.
    for job in db.query(SendJob).all():
        job.status = "pending"
    db.commit()
    summary = sends.drain_send_queue(db=db)
    assert summary["skipped"] >= 1 and summary["sent"] == 0


def test_drain_sends_due_pending_jobs(client, profile, db):
    client.post(f"/api/sequences/{profile.id}/start", json=_start_payload())
    # Only step 1 is due now; step 2 is 3 days out.
    summary = sends.drain_send_queue(now=datetime.utcnow(), db=db)
    assert summary["sent"] == 1
    sent = db.query(Message).filter(Message.status == "sent").all()
    assert len(sent) == 1 and sent[0].esp_message_id.startswith("sim_")

    # Draining again later (after step 2 is due) sends the second step.
    later = datetime.utcnow() + timedelta(days=4)
    summary2 = sends.drain_send_queue(now=later, db=db)
    assert summary2["sent"] == 1


def test_needs_review_jobs_are_not_sent(client, profile, db):
    client.post(f"/api/sequences/{profile.id}/start", json=_start_payload(grade="D"))
    summary = sends.drain_send_queue(db=db)
    assert summary["sent"] == 0  # needs_review jobs are not drained


def test_daily_cap_blocks_sends(client, profile, db, monkeypatch):
    monkeypatch.setenv("DAILY_SEND_CAP", "0")
    client.post(f"/api/sequences/{profile.id}/start", json=_start_payload())
    summary = sends.drain_send_queue(db=db)
    assert summary["sent"] == 0 and summary["held"] >= 1


def test_unsubscribe_endpoint_suppresses(client, profile, db):
    token = compliance.unsubscribe_token("optout@biz.com", profile.id)
    resp = client.get(f"/api/unsubscribe?token={token}")
    assert resp.status_code == 200 and "unsubscribed" in resp.text.lower()
    assert compliance.is_suppressed(db, "optout@biz.com", profile.id)

    bad = client.get("/api/unsubscribe?token=garbage")
    assert bad.status_code == 200 and "not valid" in bad.text.lower()
