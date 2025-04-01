import requests
from dotenv import load_dotenv
import os
from datetime import datetime

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

def get_tournament_matches(puuid, count=20, start_timestamp=None, end_timestamp=None):
    """Récupère les IDs des matchs d'un joueur avec une plage de dates."""
    url = f"{RIOT_API_BASE_URL}/lol/match/v5/matches/by-puuid/{puuid}/ids"
    params = {"type": "tourney", "start": 0, "count": count}

    if start_timestamp:
        params["startTime"] = start_timestamp
    if end_timestamp:
        params["endTime"] = end_timestamp

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
    """Extrait les bans, les champions joués, les statistiques détaillées et le side de chaque équipe."""
    info = match_details["info"]
    teams = info["teams"]
    participants = info["participants"] 
    champion_map = get_champion_data()  

    # Identifier l'équipe du joueur
    player_team_id = next(p["teamId"] for p in participants if p["puuid"] == puuid)

    # Séparer les équipes
    player_team = next(t for t in teams if t["teamId"] == player_team_id)
    enemy_team = next(t for t in teams if t["teamId"] != player_team_id)

    # Déterminer l'équipe gagnante
    winning_team_id = next(t["teamId"] for t in teams if t["win"])
    winning_side = "blue" if winning_team_id == 100 else "red"

    # Récupérer la date et durée de la partie
    game_duration = info["gameDuration"]
    game_start_timestamp = info.get("gameStartTimestamp", 0)
    game_date = datetime.utcfromtimestamp(game_start_timestamp / 1000).strftime("%Y-%m-%d %H:%M:%S")

    # Rôles et ordre d'affichage
    role_order = ["top", "jungle", "middle", "bottom", "utility"]

    # Déterminer le side
    side_mapping = {100: "blue", 200: "red"}
    player_team_side = side_mapping.get(player_team["teamId"], "unknown")
    enemy_team_side = side_mapping.get(enemy_team["teamId"], "unknown")

    # Fonction stats joueur
    def get_player_stats(player):
        return {
            "name": player["championName"],
            "image": champion_map[int(player["championId"])]["image"],
            "pseudo": f"{player['riotIdGameName']}#{player['riotIdTagline']}",
            "position": player.get("teamPosition", "unknown").lower(),
            "gold": player["goldEarned"],
            "kda": f"{player['kills']}/{player['deaths']}/{player['assists']}",
            "level": player["champLevel"],
            "cs": player["totalMinionsKilled"] + player["neutralMinionsKilled"],
            "damage": player["totalDamageDealtToChampions"],
        }

    result = {
        "match_info": {
            "duration": game_duration,
            "date": game_date,
            "winning_team": winning_side
        },
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
                [get_player_stats(p) for p in participants if p["teamId"] == player_team_id],
                key=lambda x: role_order.index(x["position"]) if x["position"] in role_order else len(role_order),
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
                [get_player_stats(p) for p in participants if p["teamId"] != player_team_id],
                key=lambda x: role_order.index(x["position"]) if x["position"] in role_order else len(role_order),
            ),
        },
        # 🆕 Pseudo du joueur recherché tel qu’il apparaît dans CE match
        "searched_player": {
            "pseudo": next(
                f"{p['riotIdGameName']}#{p['riotIdTagline']}" 
                for p in participants 
                if p["puuid"] == puuid
            )
        }
    }

    return result

