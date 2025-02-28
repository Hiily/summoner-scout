from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from datetime import datetime
from fastapi import Query
from services.riot_api import (
    get_puuid,
    get_tournament_matches,
    get_match_details,
    extract_match_summary,
)
import logging
from functools import wraps

# Configuration globale
API_BASE_URL = "https://summoner-scout.onrender.com"
TEMPLATES_DIR = "templates"
STATIC_DIR = "static"

# Initialisation de l'application
app = FastAPI()

# Templates Jinja2
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# Montage des fichiers statiques
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://summoner-scout.onrender.com"],  # À limiter en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Gestionnaire d'erreurs global
def handle_errors(func):
    @wraps(func)  # Conserve les métadonnées de la fonction d'origine
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Erreur : {e}")
            raise HTTPException(status_code=500, detail=str(e))
    return wrapper

# Routes
@app.get("/")
@handle_errors
async def read_root(request: Request):
    """Rend la page d'accueil."""
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "api_base_url": API_BASE_URL},
    )


@app.get("/get-puuid")
@handle_errors
async def fetch_puuid(game_name: str, tag_line: str):
    """Route pour récupérer le PUUID."""
    puuid = get_puuid(game_name, tag_line)
    return {"puuid": puuid}

@app.get("/get-matches")
@handle_errors
async def fetch_matches(
    game_name: str, 
    tag_line: str, 
    start_time: int = Query(None), 
    end_time: int = Query(None),
    match_count: int = Query(20)
):
    """Récupère les matchs d'un joueur avec une option de filtrage par date."""
    puuid = get_puuid(game_name, tag_line)
    matches = get_tournament_matches(puuid, count=match_count, start_timestamp=start_time, end_timestamp=end_time)
    return {"matches": matches}



@app.get("/get-match-details")
@handle_errors
async def fetch_match_details(match_id: str):
    """Route pour récupérer les détails d'un match."""
    match_details = get_match_details(match_id)
    return {"details": match_details}


@app.get("/get-match-summary")
@handle_errors
async def fetch_match_summary(match_id: str, puuid: str):
    """Route pour récupérer un résumé des bans et des champions joués."""
    match_details = get_match_details(match_id)
    summary = extract_match_summary(match_details, puuid)
    return summary
