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
    const startDate = document.getElementById('startDate').value.trim();
    const endDate = document.getElementById('endDate').value.trim();
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

        // Conversion des dates en timestamp Unix (secondes)
        const startTimestamp = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : null;
        const endTimestamp = endDate ? Math.floor(new Date(endDate).getTime() / 1000) + 86399 : null;

        // Préparer l'URL avec la plage de dates si elle est renseignée
        let url = `/get-matches?game_name=${gameName}&tag_line=${tagLine}`;
        if (startTimestamp) url += `&start_time=${startTimestamp}`;
        if (endTimestamp) url += `&end_time=${endTimestamp}`;

        console.log("🔄 Paramètres envoyés :", url);

        // Récupération des matchs
        const matchesData = await fetchAPI(url);

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

// Fonction pour afficher une vue d'ensemble d'un match
function appendMatchOverview(matchList, matchId, puuid, searchedPseudo) {
    const matchCard = document.createElement('div');
    matchCard.className = 'bg-white shadow-md rounded-lg p-6 mb-4';

    fetchAPI(`/get-match-summary?match_id=${matchId}&puuid=${puuid}`)
        .then((matchDetails) => {
            const roles = ["top", "jungle", "middle", "bottom", "utility"];
            const playerSideClass =
                matchDetails.player_team.side === 'blue' ? 'text-blue-600' : 'text-red-600';
            const enemySideClass =
                matchDetails.enemy_team.side === 'blue' ? 'text-blue-600' : 'text-red-600';
            const playerBgClass =
                matchDetails.player_team.side === 'blue' ? 'bg-blue-100' : 'bg-red-100';
            const enemyBgClass =
                matchDetails.enemy_team.side === 'blue' ? 'bg-blue-100' : 'bg-red-100';
            
            const matchDate = new Date(matchDetails.match_info.date);
            const formattedDate = matchDate.toLocaleDateString('fr-FR'); 
            const durationMinutes = Math.floor(matchDetails.match_info.duration / 60); 
            const isWin = matchDetails.match_info.winning_team === matchDetails.player_team.side;
            const winText = isWin ? "Victoire" : "Défaite";
            const winClass = isWin ? "text-green-600" : "text-red-600"; 

            matchCard.innerHTML = `
                <div class="mb-4">
                    <p class="text-sm text-gray-600">${formattedDate}</p>
                    <p class="text-sm font-bold ${winClass}">${winText}</p>
                    <p class="text-sm text-gray-600">${durationMinutes} min</p>
                </div>
                <div class="flex justify-between items-start">
                    <!-- Equipe du joueur -->
                    <div class="w-1/2">
                        <h3 class="text-lg font-bold ${playerSideClass}">Player Team</h3>
                        <div class="mb-4">
                            <p class="text-sm font-semibold text-gray-700">Bans:</p>
                            <div class="flex space-x-2">
                                ${matchDetails.player_team.bans
                                    .map(
                                        (ban) =>
                                            `<img src="${ban.image}" alt="${ban.name}" class="w-10 h-10 rounded">`
                                    )
                                    .join('')}
                            </div>
                        </div>
                        <div>
                            <p class="text-sm font-semibold text-gray-700">Picks:</p>
                            <div class="flex flex-col space-y-2">
                                ${roles
                                    .map((role) =>
                                        matchDetails.player_team.champions
                                            .filter((champ) => champ.position === role)
                                            .map(
                                                (champ) => `
                                                <div class="flex items-center space-x-2 ${
                                                    champ.pseudo === searchedPseudo
                                                        ? playerBgClass + ' p-2 rounded'
                                                        : ''
                                                }">
                                                    <img src="${champ.image}" alt="${champ.name}" class="w-10 h-10 rounded">
                                                    <div>
                                                        <a href="#" class="${
                                                            playerSideClass
                                                        } hover:underline" onclick="searchPlayer('${
                                                    champ.pseudo.split('#')[0]
                                                }', '${champ.pseudo.split('#')[1]}')">
                                                            ${champ.pseudo}
                                                        </a>
                                                        <p class="text-gray-600">${champ.name}</p>
                                                    </div>
                                                </div>
                                            `
                                            )
                                            .join('')
                                    )
                                    .join('')}
                            </div>
                        </div>
                    </div>
                    <!-- Equipe adverse -->
                    <div class="w-1/2 text-right">
                        <h3 class="text-lg font-bold ${enemySideClass}">Enemy Team</h3>
                        <div class="mb-4">
                            <p class="text-sm font-semibold text-gray-700">Bans:</p>
                            <div class="flex justify-end space-x-2">
                                ${matchDetails.enemy_team.bans
                                    .map(
                                        (ban) =>
                                            `<img src="${ban.image}" alt="${ban.name}" class="w-10 h-10 rounded">`
                                    )
                                    .join('')}
                            </div>
                        </div>
                        <div>
                            <p class="text-sm font-semibold text-gray-700">Picks:</p>
                            <div class="flex flex-col space-y-2 items-end">
                                ${roles
                                    .map((role) =>
                                        matchDetails.enemy_team.champions
                                            .filter((champ) => champ.position === role)
                                            .map(
                                                (champ) => `
                                                <div class="flex items-center space-x-2 justify-end ${
                                                    champ.pseudo === searchedPseudo
                                                        ? enemyBgClass + ' p-2 rounded'
                                                        : ''
                                                }">
                                                    <div>
                                                        <a href="#" class="${
                                                            enemySideClass
                                                        } hover:underline" onclick="searchPlayer('${
                                                    champ.pseudo.split('#')[0]
                                                }', '${champ.pseudo.split('#')[1]}')">
                                                            ${champ.pseudo}
                                                        </a>
                                                        <p class="text-gray-600">${champ.name}</p>
                                                    </div>
                                                    <img src="${champ.image}" alt="${champ.name}" class="w-10 h-10 rounded">
                                                </div>
                                            `
                                            )
                                            .join('')
                                    )
                                    .join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            // Ajout d'un div pour les détails du match (initialement caché)
            const detailsDiv = document.createElement("div");
            detailsDiv.id = `details-${matchId}`;
            detailsDiv.className = "hidden mt-4 p-4 bg-gray-100 rounded-lg";
            matchCard.appendChild(detailsDiv);

            console.log(`✅ Ajout de #details-${matchId} dans le DOM`);
            const showMoreButton = document.createElement('button');
            showMoreButton.className = "bg-blue-500 text-white px-4 py-2 rounded mt-2 hover:bg-blue-600";
            showMoreButton.textContent = "Show More";
            showMoreButton.onclick = () => toggleMatchDetails(matchId, puuid, showMoreButton);
            matchCard.appendChild(showMoreButton);
            matchList.appendChild(matchCard);

        })
        .catch((error) => {
            matchCard.innerHTML = `<p class="text-red-600">Error fetching match details: ${error.message}</p>`;
            matchList.appendChild(matchCard);
        });
}

// Fonction pour ajouter le bouton "Show More" et afficher les détails du match
function addShowMoreButton(matchCard, matchId, puuid) {
    const showMoreButton = document.createElement('button');
    showMoreButton.className = "mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-700";
    showMoreButton.textContent = "Show More";
    showMoreButton.onclick = () => toggleMatchDetails(matchId, puuid, showMoreButton);
    
    const detailsDiv = document.createElement('div');
    detailsDiv.id = `details-${matchId}`;
    detailsDiv.classList.add("hidden", "mt-4");

    matchCard.appendChild(showMoreButton);
    matchCard.appendChild(detailsDiv);
}

// Fonction pour charger et afficher les détails du match
// Fonction pour charger et afficher les détails du match
function toggleMatchDetails(matchId, puuid, button) {
    let detailsDiv = document.getElementById(`details-${matchId}`);

    if (!detailsDiv) {
        console.error(`Element #details-${matchId} not found.`);
        return;
    }

    if (detailsDiv.classList.contains('hidden')) {
        fetchAPI(`/get-match-summary?match_id=${matchId}&puuid=${puuid}`)
            .then(matchDetails => {
                detailsDiv.innerHTML = `
                    <div class="grid grid-cols-2 gap-4">
                        ${generateFullPlayerList(matchDetails.player_team, "bg-blue-200")}
                        ${generateFullPlayerList(matchDetails.enemy_team, "bg-red-200")}
                    </div>
                `;
                detailsDiv.classList.remove('hidden');
                button.textContent = "Show Less";
            })
            .catch(error => {
                detailsDiv.textContent = `Error loading details: ${error.message}`;
            });
    } else {
        detailsDiv.classList.add('hidden');
        button.textContent = "Show More";
    }
}


// Fonction pour générer la liste détaillée des joueurs sous forme de tableau
function generateFullPlayerList(team, bgColor) {
    // Calcul des valeurs totales pour normaliser les pourcentages
    const totalDamage = team.champions.reduce((sum, p) => sum + p.damage, 0) || 1;
    const totalGold = team.champions.reduce((sum, p) => sum + p.gold, 0) || 1;

    return `
        <div class="p-4 ${bgColor} rounded-lg">
            <h4 class="text-lg font-bold mb-2">${team.side === "blue" ? "Équipe Bleue" : "Équipe Rouge"}</h4>
            <table class="w-full text-left bg-white shadow-md rounded-lg overflow-hidden">
                <thead>
                    <tr class="bg-gray-200 text-gray-700">
                        <th class="p-2">Champion</th>
                        <th class="p-2">KDA</th>
                        <th class="p-2">Dégâts</th>
                        <th class="p-2">Golds</th>
                        <th class="p-2">CS</th>
                    </tr>
                </thead>
                <tbody>
                    ${team.champions.map(player => {
                        const kills = parseFloat(player.kda.split('/')[0]);
                        const deaths = parseFloat(player.kda.split('/')[1]);
                        const assists = parseFloat(player.kda.split('/')[2]);
                        const kdaRatio = ((kills + assists) / Math.max(1, deaths)).toFixed(2);

                        // Calcul des pourcentages par rapport à l'équipe
                        const damagePercentage = Math.round((player.damage / totalDamage) * 100);
                        const goldPercentage = Math.round((player.gold / totalGold) * 100);

                        return `
                        <tr class="border-b ${team.side === 'blue' ? 'bg-blue-100' : 'bg-red-100'}">
                            <td class="p-2 flex items-center relative">
                                <img src="${player.image}" alt="Champion" class="w-10 h-10 rounded">
                                <span class="absolute bottom-0 right-0 bg-black text-xs rounded ml-1">
                                    ${player.level}
                                </span>
                            </td>
                            <td class="p-2">
                                ${player.kda} <br>
                                <span class="text-xs text-gray-600">
                                    ${kdaRatio}
                                </span>
                            </td>
                            <td class="p-2">
                                ${player.damage} <br>
                                <span class="text-xs text-gray-600">
                                    ${damagePercentage}%
                                </span>
                            </td>
                            <td class="p-2">
                                ${player.gold} <br>
                                <span class="text-xs text-gray-600">
                                    ${goldPercentage}%
                                </span>
                            </td>
                            <td class="p-2">${player.cs}</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
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
