from services import compliance


def test_suppression_blocks_per_profile(db):
    assert compliance.is_suppressed(db, "x@y.com", 1) is False
    compliance.add_suppression(db, "x@y.com", 1, "unsubscribe")
    assert compliance.is_suppressed(db, "x@y.com", 1) is True
    # Not suppressed for a different customer (per-profile suppression).
    assert compliance.is_suppressed(db, "x@y.com", 2) is False


def test_global_suppression_applies_everywhere(db):
    compliance.add_suppression(db, "g@y.com", None, "unsubscribe")
    assert compliance.is_suppressed(db, "g@y.com", 1) is True
    assert compliance.is_suppressed(db, "g@y.com", 999) is True


def test_add_suppression_is_idempotent(db):
    a = compliance.add_suppression(db, "dup@y.com", 1)
    b = compliance.add_suppression(db, "dup@y.com", 1)
    assert a.id == b.id


def test_unsubscribe_token_roundtrip():
    token = compliance.unsubscribe_token("Foo@Bar.com", 5)
    assert compliance.verify_unsubscribe_token(token) == ("foo@bar.com", 5)
    assert compliance.verify_unsubscribe_token("bogus") is None


def test_footer_includes_address_and_unsubscribe():
    footer = compliance.compliance_footer("http://x/api/unsubscribe?token=t")
    assert "Unsubscribe:" in footer
    assert compliance.postal_address() in footer
