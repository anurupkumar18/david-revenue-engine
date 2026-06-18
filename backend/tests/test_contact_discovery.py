from services.contact_discovery import discover_contacts
from services.test_recipients import SYNTHETIC_TEST_EMAILS


def test_discover_contacts_uses_synthetic_test_emails():
    contacts = discover_contacts({"best_fit_industries": ["Dental", "Healthcare"]})
    assert contacts
    for i, c in enumerate(contacts):
        assert c["email"] in SYNTHETIC_TEST_EMAILS
