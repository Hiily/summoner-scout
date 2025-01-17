import requests
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise ValueError("API_KEY is not set in environment variables")
DATA_DRAGON_BASE_URL = "http://ddragon.leagueoflegends.com/"
RIOT_API_BASE_URL = "https://europe.api.riotgames.com"

HEADERS = {"X-Riot-Token": API_KEY}

def fetch_data(url, params=None):
    """Effectue une requête HTTP et gère les erreurs de manière centralisée."""
    try:
        response = requests.get(url, headers=HEADERS, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise Exception(f"Erreur lors de la requête à {url}: {e}")

def get_puuid(game_name, tag_line):
    """Récupère le PUUID d'un joueur via son gameName et tagLine."""
    url = f"{RIOT_API_BASE_URL}/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
    data = fetch_data(url)
    return data.get("puuid")

def get_tournament_matches(puuid, count=10):
    """Récupère les IDs des matchs de tournoi d'un joueur via son PUUID."""
    url = f"{RIOT_API_BASE_URL}/lol/match/v5/matches/by-puuid/{puuid}/ids"
    params = {"queue": 700, "start": 0, "count": count}
    return fetch_data(url, params)

def get_match_details(match_id):
    """Récupère les détails complets d'un match."""
    url = f"{RIOT_API_BASE_URL}/lol/match/v5/matches/{match_id}"
    return fetch_data(url)

def get_champion_data():
    """Récupère les données des champions depuis Data Dragon."""
    version_url = f"{DATA_DRAGON_BASE_URL}api/versions.json"
    versions = fetch_data(version_url)
    latest_version = versions[0] 

    # Télécharger les données des champions
    champions_url = f"{DATA_DRAGON_BASE_URL}cdn/{latest_version}/data/en_US/champion.json"
    champions_data = fetch_data(champions_url)["data"]

    return {
        int(champion["key"]): {
            "name": champion["name"],
            "image": f"{DATA_DRAGON_BASE_URL}cdn/{latest_version}/img/champion/{champion['id']}.png",
        }
        for champion in champions_data.values()
    }

def extract_match_summary(match_details, puuid):
    """Extrait les bans, les champions joués et le side de chaque équipe."""
    info = match_details["info"]
    teams = info["teams"]
    participants = info["participants"]

    # Récupérer les données des champions
    champion_map = get_champion_data()

    # Identifier l'équipe du joueur
    player_team_id = next(p["teamId"] for p in participants if p["puuid"] == puuid)

    # Séparer les équipes
    player_team = next(t for t in teams if t["teamId"] == player_team_id)
    enemy_team = next(t for t in teams if t["teamId"] != player_team_id)

    # Liste des rôles connus et ordre de tri
    role_order = ["top", "jungle", "middle", "bottom", "utility"]

    # Déterminer le side de chaque équipe
    side_mapping = {100: "blue", 200: "red"}
    player_team_side = side_mapping.get(player_team["teamId"], "unknown")
    enemy_team_side = side_mapping.get(enemy_team["teamId"], "unknown")

    # Récupérer les bans et champions
    result = {
        "player_team": {
            "side": player_team_side,
            "bans": [
                {
                    "id": ban["championId"],
                    "name": champion_map[ban["championId"]]["name"],
                    "image": champion_map[ban["championId"]]["image"],
                }
                for ban in player_team["bans"]
            ],
            "champions": sorted(
                [
                    {
                        "name": p["championName"],
                        "image": champion_map[int(p["championId"])]["image"],
                        "pseudo": f"{p['riotIdGameName']}#{p['riotIdTagline']}",
                        "position": p.get("teamPosition", "unknown").lower(), 
                    }
                    for p in participants if p["teamId"] == player_team_id
                ],
                key=lambda x: role_order.index(x["position"]) if x["position"] in role_order else len(role_order)
            ),
        },
        "enemy_team": {
            "side": enemy_team_side,
            "bans": [
                {
                    "id": ban["championId"],
                    "name": champion_map[ban["championId"]]["name"],
                    "image": champion_map[ban["championId"]]["image"],
                }
                for ban in enemy_team["bans"]
            ],
            "champions": sorted(
                [
                    {
                        "name": p["championName"],
                        "image": champion_map[int(p["championId"])]["image"],
                        "pseudo": f"{p['riotIdGameName']}#{p['riotIdTagline']}",
                        "position": p.get("teamPosition", "unknown").lower(),
                    }
                    for p in participants if p["teamId"] != player_team_id
                ],
                key=lambda x: role_order.index(x["position"]) if x["position"] in role_order else len(role_order)
            ),
        },
    }

    return result


