from fastapi import APIRouter

from services.website_analyzer import analyze_website
from schemas import ScrapeRequest

router = APIRouter(prefix="/api", tags=["scrape"])


@router.post("/scrape")
def scrape_website(req: ScrapeRequest):
    result = analyze_website(req.url)
    return result
