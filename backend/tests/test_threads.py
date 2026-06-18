def _profile_payload():
    return {
        "fields": {
            "company_name": "Loop Demo",
            "website_url": "https://loop.demo",
            "product_description": "Automated back-and-forth email demo.",
        },
        "confidence": {"company_name": "high", "website_url": "high"},
        "status": "accepted",
    }


def _sequence_payload():
    return {
        "sends": [
            {
                "account_id": "loop_acc_1",
                "contact_email": "prospect@example.com",
                "grade": "A",
                "step1": {
                    "subject": "quick idea",
                    "body": "missed calls are costing you pipeline. worth a look?",
                    "validated": True,
                },
                "step2": {
                    "subject": "worth trying",
                    "body": "following up on the missed calls angle. send specifics?",
                    "validated": True,
                },
            }
        ]
    }


def test_simulated_back_and_forth_thread_flow(client):
    profile = client.post("/api/profiles", json=_profile_payload()).json()
    profile_id = profile["id"]

    start = client.post(f"/api/sequences/{profile_id}/start", json=_sequence_payload()).json()
    assert start["jobs_created"] == 2

    drain = client.post(f"/api/send-jobs/{profile_id}/run").json()
    assert drain["sent"] == 1

    threads = client.get(f"/api/threads/{profile_id}").json()["threads"]
    assert len(threads) == 1
    thread_id = threads[0]["thread_id"]

    first = client.post(
        "/api/email/simulate-inbound",
        json={
            "profile_id": profile_id,
            "account_id": "loop_acc_1",
            "contact_email": "prospect@example.com",
            "subject": "re: quick idea",
            "body": "Sure, happy to chat next week.",
            "grade": "A",
        },
    ).json()
    assert first["decision"]["auto_send"] is True
    assert first["draft"]["routed"]["intent"] == "positive_call"

    detail1 = client.get(f"/api/threads/detail/{thread_id}").json()
    sent1 = [m for m in detail1["messages"] if m["direction"] == "outbound" and m["status"] == "sent"]
    assert len(sent1) == 2
    latest_sent = sent1[-1]
    assert latest_sent["esp_message_id"]

    second = client.post(
        "/api/email/simulate-inbound",
        json={
            "profile_id": profile_id,
            "account_id": "loop_acc_1",
            "contact_email": "prospect@example.com",
            "in_reply_to": latest_sent["esp_message_id"],
            "subject": "re: next step",
            "body": "Can you send more info and pricing?",
            "grade": "A",
        },
    ).json()
    assert second["decision"]["auto_send"] is True
    assert second["draft"]["routed"]["intent"] == "asks_for_info"

    detail2 = client.get(f"/api/threads/detail/{thread_id}").json()
    assert detail2["message_count"] == 6
    sent2 = [m for m in detail2["messages"] if m["direction"] == "outbound" and m["status"] == "sent"]
    inbound2 = [m for m in detail2["messages"] if m["direction"] == "inbound"]
    assert len(sent2) == 3
    assert len(inbound2) == 2
    assert detail2["draft"]["status"] == "sent"
