from services import esp_adapter


def test_simulated_send_when_no_key():
    assert esp_adapter.is_live() is False
    result = esp_adapter.send_email(to="prospect@example.com", subject="quick idea", body="hello")
    assert result["simulated"] is True
    assert result["status"] == "sent"
    assert result["id"].startswith("sim_")


def test_default_from_is_sandbox():
    assert "resend.dev" in esp_adapter.default_from()
