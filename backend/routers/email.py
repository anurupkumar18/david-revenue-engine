from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from database import get_db
from services.compliance import add_suppression, verify_unsubscribe_token

router = APIRouter(prefix="/api/email", tags=["email"])


def _page(title: str, body: str) -> HTMLResponse:
    html = f"""<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  body {{ background:#0b0a09; color:#ece7dd; font-family:-apple-system,system-ui,sans-serif;
         display:flex; min-height:100vh; align-items:center; justify-content:center; margin:0; }}
  .card {{ max-width:420px; padding:40px; border:1px solid rgba(236,231,222,.12); border-radius:16px;
          background:#141110; text-align:center; }}
  h1 {{ font-size:20px; margin:0 0 12px; }}
  p {{ color:#a39d92; font-size:14px; line-height:1.5; margin:0; }}
</style></head>
<body><div class="card"><h1>{title}</h1><p>{body}</p></div></body></html>"""
    return HTMLResponse(html)


# Note: registered at /api/unsubscribe (not under the /api/email prefix) below.
unsubscribe_router = APIRouter(tags=["email"])


@unsubscribe_router.get("/api/unsubscribe")
def unsubscribe(token: str = "", db: Session = Depends(get_db)):
    parsed = verify_unsubscribe_token(token)
    if not parsed:
        return _page("Link not valid", "This unsubscribe link is invalid or expired. No changes were made.")
    email, profile_id = parsed
    add_suppression(db, email, profile_id, reason="unsubscribe")
    return _page("You're unsubscribed", f"{email} will not be contacted again. You can close this page.")
