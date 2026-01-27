from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.routes import videos, scenes, images, search, external

settings = get_settings()

app = FastAPI(
    title="MediaTagging API",
    description="Video and image tagging and search API",
    version="0.1.0",
    debug=settings.debug,
    redirect_slashes=False
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(videos.router, prefix="/api/videos", tags=["videos"])
app.include_router(scenes.router, prefix="/api/scenes", tags=["scenes"])
app.include_router(images.router, prefix="/api/images", tags=["images"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(external.router, prefix="/api/external", tags=["external"])


@app.get("/")
async def root():
    return {"message": "MediaTagging API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
