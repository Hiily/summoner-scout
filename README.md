# summoner-scout

Summoner Scout is a web application designed to retrieve and display details about a player's recent matches in **League of Legends**. The application utilizes the Riot Games API to fetch match details, player information, and champion data.

## Features

- Search for a League of Legends player by game name and tag line.
- Display an overview of recent matches.
- Expand individual matches to view detailed information:
  - Bans and picks for both teams.
  - Color-coded information based on team sides (blue or red).
  - Highlight the searched player in matches.
- Dynamically load and display data without refreshing the page.

## Installation

### Prerequisites

Ensure you have the following installed on your system:

- [Python 3.8+](https://www.python.org/downloads/)
- [Node.js](https://nodejs.org/en/) (optional, for managing static files and Tailwind CSS)
- A valid Riot Games API Key (get one from the [Riot Developer Portal](https://developer.riotgames.com/)).

### Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-repo/summoner-scout.git
   cd summoner-scout
   ```

2. **Install Python dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**

   Create a `.env` file in the project root and add your Riot Games API key:

   ```env
   RIOT_API_KEY=your-api-key-here
   ```

4. **Initialize static files (optional):**

   If you need to modify or regenerate Tailwind CSS:

   ```bash
   npm install
   npx tailwindcss -i ./static/input.css -o ./static/style.css --watch
   ```

### Run the Application

1. **Start the server:**

   ```bash
   uvicorn main:app --reload
   ```

2. **Access the application:**

   Open your web browser and go to [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Project Structure

```
summoner-scout/
├── main.py                 # FastAPI server
├── services/
│   └── riot_api.py         # Riot Games API integration
├── templates/
│   └── index.html          # Main HTML template
├── static/
│   ├── style.css           # Tailwind CSS
│   ├── script.js           # Client-side JavaScript
│   └── config.js           # API base URL configuration
├── .env                    # Environment variables (API key)
├── requirements.txt        # Python dependencies
└── README.md               # Project documentation
```

## Usage

1. **Search for a player:** Enter the player's game name and tag line in the form and click "Search."
2. **View match details:** Click "Show More" on a match to expand and view detailed information.
3. **Search another player:** Click on a player's name in the match details to initiate a new search.

