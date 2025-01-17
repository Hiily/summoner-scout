// Chargement de l'URL de base depuis le fichier de configuration
const API_BASE_URL = CONFIG.API_BASE_URL;

// Fonction générique pour effectuer des appels API
async function fetchAPI(endpoint) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        return data;
    } catch (error) {
        console.error("API Fetch Error:", error);
        throw error;
    }
}

// Fonction pour gérer la soumission du formulaire
async function handleFormSubmit(event) {
    event.preventDefault();

    const gameName = document.getElementById('gameName').value;
    const tagLine = document.getElementById('tagLine').value;
    const searchedPseudo = `${gameName}#${tagLine}`;

    const resultDiv = document.getElementById('result');
    const matchList = document.getElementById('match-list');

    // Réinitialiser les résultats
    resultDiv.textContent = 'Searching...';
    matchList.innerHTML = '';

    try {
        // Récupération du PUUID
        const puuidData = await fetchAPI(`/get-puuid?game_name=${gameName}&tag_line=${tagLine}`);
        const puuid = puuidData.puuid;

        // Récupération des matchs
        const matchesData = await fetchAPI(`/get-matches?game_name=${gameName}&tag_line=${tagLine}`);

        if (matchesData.matches && matchesData.matches.length > 0) {
            resultDiv.textContent = `Found ${matchesData.matches.length} matches:`;

            // Ajouter une carte pour chaque match
            matchesData.matches.forEach(matchId => {
                appendMatchOverview(matchList, matchId, puuid, searchedPseudo);
            });
        } else {
            resultDiv.textContent = 'No matches found.';
        }
    } catch (error) {
        resultDiv.textContent = `Error fetching matches: ${error.message}`;
    }
}

// Fonction pour afficher une vue d'ensemble d'un match avec un bouton "Show More"
function appendMatchOverview(matchList, matchId, puuid, searchedPseudo) {
    const matchCard = document.createElement('div');
    matchCard.className = 'bg-white shadow-md rounded-lg p-4 mb-4';

    matchCard.innerHTML = `
        <div class="flex justify-between items-center">
            <span class="text-lg font-semibold text-gray-800">Match ID: ${matchId}</span>
            <button 
                class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" 
                onclick="toggleMatchDetails('${matchId}', '${puuid}', '${searchedPseudo}', this)">
                Show More
            </button>
        </div>
        <div id="details-${matchId}" class="mt-4 hidden"></div>
    `;

    matchList.appendChild(matchCard);
}

// Fonction pour afficher/masquer les détails d'un match
async function toggleMatchDetails(matchId, puuid, searchedPseudo, button) {
    const detailsDiv = document.getElementById(`details-${matchId}`);

    if (detailsDiv.classList.contains('hidden')) {
        // Charger les détails si nécessaire
        if (!detailsDiv.hasChildNodes()) {
            try {
                const matchDetails = await fetchAPI(`/get-match-summary?match_id=${matchId}&puuid=${puuid}`);
                appendMatchCard(detailsDiv, matchId, matchDetails, searchedPseudo);
            } catch (error) {
                detailsDiv.textContent = `Error loading match details: ${error.message}`;
            }
        }

        // Afficher les détails
        detailsDiv.classList.remove('hidden');
        button.textContent = 'Show Less';
    } else {
        // Masquer les détails
        detailsDiv.classList.add('hidden');
        button.textContent = 'Show More';
    }
}

// Fonction pour afficher les détails d'un match dans une carte
function appendMatchCard(container, matchId, details, searchedPseudo) {
    const card = document.createElement('div');
    card.className = 'bg-gray-100 shadow-inner rounded-lg p-6';

    const roles = ["top", "jungle", "middle", "bottom", "utility"];
    const playerSideClass = details.player_team.side === 'blue' ? 'text-blue-600' : 'text-red-600';
    const enemySideClass = details.enemy_team.side === 'blue' ? 'text-blue-600' : 'text-red-600';
    const playerLinkClass = details.player_team.side === 'blue' ? 'text-blue-500 hover:underline' : 'text-red-500 hover:underline';
    const enemyLinkClass = details.enemy_team.side === 'blue' ? 'text-blue-500 hover:underline' : 'text-red-500 hover:underline';
    const playerBgClass = details.player_team.side === 'blue' ? 'bg-blue-100' : 'bg-red-100';
    const enemyBgClass = details.enemy_team.side === 'blue' ? 'bg-blue-100' : 'bg-red-100';

    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="w-1/2">
                <h3 class="text-lg font-bold ${playerSideClass}">Player Team</h3>
                <div class="mb-4">
                    <p class="text-sm font-semibold text-gray-700">Bans:</p>
                    <div class="flex space-x-2">
                        ${details.player_team.bans.map(ban => `
                            <img src="${ban.image}" alt="${ban.name}" class="w-10 h-10 rounded">
                        `).join('')}
                    </div>
                </div>
                <div>
                    <p class="text-sm font-semibold text-gray-700">Picks:</p>
                    <div class="flex flex-col space-y-2">
                        ${roles.map(role => details.player_team.champions
                            .filter(champ => champ.position === role)
                            .map(champ => `
                                <div class="flex items-center space-x-2 ${champ.pseudo === searchedPseudo ? playerBgClass + ' p-2 rounded' : ''}">
                                    <img src="${champ.image}" alt="${champ.name}" class="w-10 h-10 rounded">
                                    <div>
                                        <a href="#" class="${playerLinkClass}" onclick="searchPlayer('${champ.pseudo.split('#')[0]}', '${champ.pseudo.split('#')[1]}')">
                                            ${champ.pseudo}
                                        </a>
                                        <p class="text-gray-600">${champ.name}</p>
                                    </div>
                                </div>
                            `).join('')).join('')}
                    </div>
                </div>
            </div>
            <div class="w-1/2 text-right">
                <h3 class="text-lg font-bold ${enemySideClass}">Enemy Team</h3>
                <div class="mb-4">
                    <p class="text-sm font-semibold text-gray-700">Bans:</p>
                    <div class="flex justify-end space-x-2">
                        ${details.enemy_team.bans.map(ban => `
                            <img src="${ban.image}" alt="${ban.name}" class="w-10 h-10 rounded">
                        `).join('')}
                    </div>
                </div>
                <div>
                    <p class="text-sm font-semibold text-gray-700">Picks:</p>
                    <div class="flex flex-col space-y-2 items-end">
                        ${roles.map(role => details.enemy_team.champions
                            .filter(champ => champ.position === role)
                            .map(champ => `
                                <div class="flex items-center space-x-2 justify-end ${champ.pseudo === searchedPseudo ? enemyBgClass + ' p-2 rounded' : ''}">
                                    <div>
                                        <a href="#" class="${enemyLinkClass}" onclick="searchPlayer('${champ.pseudo.split('#')[0]}', '${champ.pseudo.split('#')[1]}')">
                                            ${champ.pseudo}
                                        </a>
                                        <p class="text-gray-600">${champ.name}</p>
                                    </div>
                                    <img src="${champ.image}" alt="${champ.name}" class="w-10 h-10 rounded">
                                </div>
                            `).join('')).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    container.appendChild(card);
}

// Fonction pour lancer une recherche automatique à partir d'un clic sur un joueur
function searchPlayer(gameName, tagLine) {
    document.getElementById('gameName').value = gameName;
    document.getElementById('tagLine').value = tagLine;
    document.getElementById('match-form').dispatchEvent(new Event('submit'));
}

// Fonction pour afficher une erreur pour un match
function appendError(matchList, matchId) {
    const errorCard = document.createElement('div');
    errorCard.className = 'bg-red-100 text-red-600 p-4 rounded shadow-md mb-4';
    errorCard.textContent = `Error fetching details for match ${matchId}`;
    matchList.appendChild(errorCard);
}

// Ajout de l'écouteur sur le formulaire
document.getElementById('match-form').addEventListener('submit', handleFormSubmit);
