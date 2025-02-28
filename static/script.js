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
    const matchCount = document.getElementById('matchCount').value.trim(); // Récupération du nombre de parties
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

        // Préparer l'URL avec la plage de dates et le nombre de parties
        let url = `/get-matches?game_name=${gameName}&tag_line=${tagLine}&match_count=${matchCount}`;
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
    const template = document.getElementById("match-template");
    const matchCard = template.content.cloneNode(true).querySelector("div");
    matchCard.id = `match-${matchId}`;
    matchCard.classList.remove("hidden");

    fetchAPI(`/get-match-summary?match_id=${matchId}&puuid=${puuid}`)
        .then(matchDetails => {
            const playerSideClass =
                matchDetails.player_team.side === 'blue' ? 'text-blue-600' : 'text-red-600';
            const enemySideClass =
                matchDetails.enemy_team.side === 'blue' ? 'text-blue-600' : 'text-red-600';

            // 🎯 Mettre à jour les infos générales
            matchCard.querySelector(".match-date").textContent =
                new Date(matchDetails.match_info.date).toLocaleDateString('fr-FR');
            matchCard.querySelector(".match-duration").textContent =
                `${Math.floor(matchDetails.match_info.duration / 60)} min`;

            const isWin = matchDetails.match_info.winning_team === matchDetails.player_team.side;
            matchCard.querySelector(".match-result").textContent = isWin ? "Victoire" : "Défaite";
            matchCard.querySelector(".match-result").classList.add(isWin ? "text-green-600" : "text-red-600");

            // 🎯 Mettre à jour les équipes
            updateTeamDetails(matchCard.querySelector(".player-team"), matchDetails.player_team, playerSideClass, false);
            updateTeamDetails(matchCard.querySelector(".enemy-team"), matchDetails.enemy_team, enemySideClass, true);

            // 🎯 Activer le bouton "Show More"
            const showMoreButton = matchCard.querySelector(".show-more");
            showMoreButton.onclick = () => toggleMatchDetails(matchId, puuid, showMoreButton, matchCard.querySelector(".details-container"));

            matchList.appendChild(matchCard);
        })
        .catch(error => {
            matchCard.innerHTML = `<p class="text-red-600">Error fetching match details: ${error.message}</p>`;
            matchList.appendChild(matchCard);
        });
}

// 🔧 Fonction pour mettre à jour l'affichage d'une équipe (bans + picks)
// 🔧 Fonction pour mettre à jour l'affichage d'une équipe (bans + picks)
function updateTeamDetails(teamElement, teamData, sideClass, isEnemy = false) {
    teamElement.querySelector(".team-title").textContent =
        teamData.side === "blue" ? "Équipe Bleue" : "Équipe Rouge";
    teamElement.querySelector(".team-title").classList.add(sideClass);

    // 🎯 Mettre à jour les bans
    const banContainer = teamElement.querySelector(".ban-images");
    banContainer.innerHTML = teamData.bans.map(
        ban => `<img src="${ban.image}" alt="${ban.name}" class="w-10 h-10 rounded">`
    ).join("");

    // 🎯 Mettre à jour les picks
    const pickContainer = teamElement.querySelector(".pick-list");
    pickContainer.innerHTML = teamData.champions.map(champ => `
        <div class="flex items-center space-x-2 ${isEnemy ? 'justify-end' : ''}">
            ${isEnemy ? `
                <div class="text-right">
                    <a href="#" class="${sideClass} hover:underline" onclick="searchPlayer('${champ.pseudo.split('#')[0]}', '${champ.pseudo.split('#')[1]}')">
                        ${champ.pseudo}
                    </a>
                    <p class="text-gray-600">${champ.name}</p>
                </div>
                <img src="${champ.image}" alt="${champ.name}" class="w-10 h-10 rounded ml-2">
            ` : `
                <img src="${champ.image}" alt="${champ.name}" class="w-10 h-10 rounded">
                <div>
                    <a href="#" class="${sideClass} hover:underline" onclick="searchPlayer('${champ.pseudo.split('#')[0]}', '${champ.pseudo.split('#')[1]}')">
                        ${champ.pseudo}
                    </a>
                    <p class="text-gray-600">${champ.name}</p>
                </div>
            `}
        </div>
    `).join("");
}


// Fonction pour afficher les détails d'un match quand on clique sur "Show More"
function toggleMatchDetails(matchId, puuid, button, detailsDiv) {
    if (detailsDiv.classList.contains("hidden")) {
        fetchAPI(`/get-match-summary?match_id=${matchId}&puuid=${puuid}`)
            .then(matchDetails => {
                detailsDiv.innerHTML = `
                    <div class="flex flex-col space-y-4">
                        ${generateFullPlayerList(matchDetails.player_team, matchDetails.match_info.duration)}
                        ${generateFullPlayerList(matchDetails.enemy_team, matchDetails.match_info.duration)}
                    </div>
                `;
                detailsDiv.classList.remove("hidden");
                button.textContent = "Show Less";
            })
            .catch(error => {
                detailsDiv.textContent = `Error loading details: ${error.message}`;
            });
    } else {
        detailsDiv.classList.add("hidden");
        button.textContent = "Show More";
    }
}

// Fonction pour générer la liste détaillée des joueurs sous forme de tableau
function generateFullPlayerList(team, gameDuration) {
    // Calcul des totaux pour normaliser les pourcentages
    const totalDamage = team.champions.reduce((sum, p) => sum + p.damage, 0) || 1;
    const totalGold = team.champions.reduce((sum, p) => sum + p.gold, 0) || 1;

    return `
        <div class="p-4">
            <h4 class="text-lg font-bold mb-2 dark:text-gray-100">
                ${team.side === "blue" ? "Équipe Bleue" : "Équipe Rouge"}
            </h4>
            <table class="w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                <thead>
                   <tr class="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                        <th class="p-2 text-left">Champion</th>
                        <th class="p-2 text-center">KDA</th>
                        <th class="p-2 text-center">Dégâts</th>
                        <th class="p-2 text-center">Golds</th>
                        <th class="p-2 text-center">CS</th>
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

                        // Définition des classes de couleur selon l'échelle proposée
                        const damageColorClass = damagePercentage < 10 
                            ? 'text-red-500' 
                            : damagePercentage < 20 
                                ? 'text-orange-500' 
                                : 'text-green-500';
                        const goldColorClass = goldPercentage < 10 
                            ? 'text-red-500' 
                            : goldPercentage < 20 
                                ? 'text-orange-500' 
                                : 'text-green-500';

                        // Calcul de CS/min (arrondi à une décimale)
                        const csPerMinute = gameDuration ? (player.cs * 60 / gameDuration).toFixed(1) : "N/A";

                        return `
                        <tr class="border-b ${team.side === 'blue' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-red-100 dark:bg-red-900'}">
                            <td class="p-2 flex items-center relative">
                                <img src="${player.image}" alt="Champion" class="w-10 h-10 rounded">
                                <span class="ml-1 text-xs dark:text-gray-300">${player.level}</span>
                            </td>
                            <td class="p-2 text-center">
                                ${player.kda} <br>
                                <span class="text-xs text-gray-600 dark:text-gray-400">${kdaRatio}</span>
                            </td>
                            <td class="p-2 text-center">
                                ${player.damage} <br>
                                <span class="text-xs ${damageColorClass}">${damagePercentage}%</span>
                            </td>
                            <td class="p-2 text-center">
                                ${player.gold} <br>
                                <span class="text-xs ${goldColorClass}">${goldPercentage}%</span>
                            </td>
                            <td class="p-2 text-center">
                                ${player.cs} <br>
                                <span class="text-xs text-gray-600 dark:text-gray-400">${csPerMinute}</span>
                            </td>
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
