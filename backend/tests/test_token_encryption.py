from services import token_encryption


def test_encrypt_decrypt_roundtrip():
    plain = "refresh_token_secret_value"
    enc = token_encryption.encrypt_secret(plain)
    assert enc != plain
    assert token_encryption.decrypt_secret(enc) == plain


def test_empty_string_passthrough():
    assert token_encryption.encrypt_secret("") == ""
    assert token_encryption.decrypt_secret("") == ""
