"""Inboxes for synthetic ICP / demo sends so live OAuth tests deliver to real mailboxes."""

SYNTHETIC_TEST_EMAILS = (
    "sanjay.bhatia01@gmail.com",
    "bhatia.sanjay01@gmail.com",
    "81anurup@gmail.com",
)


def pick_synthetic_test_email(index: int) -> str:
    return SYNTHETIC_TEST_EMAILS[abs(index) % len(SYNTHETIC_TEST_EMAILS)]
