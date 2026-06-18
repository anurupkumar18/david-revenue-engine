from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine, ensure_migrations
from routers import outreach, profiles, scrape

Base.metadata.create_all(bind=engine)
ensure_migrations()

app = FastAPI(title="AI GTM Campaign Builder API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scrape.router)
app.include_router(profiles.router)
app.include_router(outreach.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "campaign-builder"}
