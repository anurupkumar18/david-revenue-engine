from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine, ensure_migrations
from routers import auth, email, outreach, profiles, scrape, sending
from services.scheduler import shutdown_scheduler, start_scheduler

Base.metadata.create_all(bind=engine)
ensure_migrations()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Scheduler runs only when SCHEDULER_ENABLED is set; no-op otherwise.
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(title="AI GTM Campaign Builder API", version="1.0.0", lifespan=lifespan)

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
app.include_router(auth.router)
app.include_router(sending.router)
app.include_router(email.router)
app.include_router(email.unsubscribe_router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "campaign-builder"}
