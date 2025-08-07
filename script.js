document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT REFERENCES ---
    const searchInput = document.getElementById('search-input');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const pokemonInfoDiv = document.getElementById('pokemon-info');
    const evolutionChainDiv = document.querySelector('#evolution-chain .evolution-display');
    const loadingDiv = document.getElementById('loading');
    const surpriseMeButton = document.getElementById('surprise-me-button');
    const themeToggleButton = document.getElementById('theme-toggle');
    const potdContent = document.querySelector('#pokemon-of-the-day .potd-content');
    const menuToggleButton = document.getElementById('menu-toggle');
    const closeMenuButton = document.getElementById('close-menu-button');
    const sideMenu = document.getElementById('side-menu');
    
    // Game Elements
    const wtpSprite = document.getElementById('wtp-sprite');
    const wtpGuessInput = document.getElementById('wtp-guess');
    const wtpSubmitButton = document.getElementById('wtp-submit');
    const wtpFeedback = document.getElementById('wtp-feedback');
    const matchingBoard = document.getElementById('matching-board');
    const matchingResetButton = document.getElementById('matching-reset');

    let allPokemonNames = [];
    let wtpCorrectName = '';
    let flippedCards = [];
    let matchedPairs = 0;
    let isBoardLocked = false;

    // --- INITIALIZATION ---
    async function initialize() {
        await fetchAllPokemonNames();
        await fetchPokemonOfTheDay();
        setupEventListeners();
        startWhosThatPokemon();
        startMatchingGame();
    }

    function setupEventListeners() {
        themeToggleButton.addEventListener('click', toggleTheme);
        surpriseMeButton.addEventListener('click', fetchRandomPokemon);
        menuToggleButton.addEventListener('click', toggleMenu);
        closeMenuButton.addEventListener('click', toggleMenu);
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('keypress', handleSearchEnter);
        wtpSubmitButton.addEventListener('click', handleWtpGuess);
        matchingResetButton.addEventListener('click', startMatchingGame);
        
        document.querySelectorAll('.menu-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const viewName = e.target.dataset.view;
                switchView(viewName);
                toggleMenu();
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) suggestionsContainer.innerHTML = '';
            if (!sideMenu.contains(e.target) && !menuToggleButton.contains(e.target) && sideMenu.classList.contains('open')) {
                toggleMenu();
            }
        });
    }

    // --- DATA FETCHING ---
    async function fetchAllPokemonNames() {
        try {
            const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
            const data = await response.json();
            allPokemonNames = data.results.map(p => p.name);
        } catch (error) { console.error("Failed to fetch Pokémon list:", error); }
    }

    async function fetchPokemonData(searchTerm) {
        loadingDiv.classList.remove('hidden');
        pokemonInfoDiv.innerHTML = '';
        evolutionChainDiv.innerHTML = '';
        suggestionsContainer.innerHTML = '';
        searchInput.value = '';

        try {
            const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${searchTerm}`);
            if (!pokemonResponse.ok) throw new Error('Pokémon not found');
            const pokemonData = await pokemonResponse.json();
            const speciesResponse = await fetch(pokemonData.species.url);
            const speciesData = await speciesResponse.json();
            const evolutionChainResponse = await fetch(speciesData.evolution_chain.url);
            const evolutionChainData = await evolutionChainResponse.json();
            const description = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en').flavor_text;
            
            displayPokemonInfo(pokemonData, description);
            displayEvolutionChain(evolutionChainData.chain);
        } catch (error) {
            pokemonInfoDiv.innerHTML = `<p>${error.message}</p>`;
        } finally {
            loadingDiv.classList.add('hidden');
        }
    }

    async function fetchRandomPokemon() {
        const randomId = Math.floor(Math.random() * 1025) + 1;
        await fetchPokemonData(randomId);
    }

    async function fetchPokemonOfTheDay() {
        const date = new Date();
        const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
        const pokemonId = (dayOfYear % 1025) + 1;
        try {
            const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
            const pokemonData = await pokemonResponse.json();
            const speciesResponse = await fetch(pokemonData.species.url);
            const speciesData = await speciesResponse.json();
            const description = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en').flavor_text;
            potdContent.innerHTML = `
                <img src="${pokemonData.sprites.front_default}" alt="${pokemonData.name}">
                <h3>${pokemonData.name}</h3>
                <p>${description.replace(/\n/g, ' ')}</p>
            `;
        } catch (error) { potdContent.innerHTML = `<p>Could not load Pokémon of the Day.</p>`; }
    }

    // --- UI & MENU ---
    function displayPokemonInfo(data, description) {
        const { name, id, types, abilities, sprites, stats } = data;

        const hp = stats.find(stat => stat.stat.name === 'hp').base_stat;
        const attack = stats.find(stat => stat.stat.name === 'attack').base_stat;
        const defense = stats.find(stat => stat.stat.name === 'defense').base_stat;

        pokemonInfoDiv.innerHTML = `
            <img src="${sprites.front_default}" alt="${name}">
            <h2>${name} (#${id})</h2>
            <p><strong>Type:</strong> ${types.map(t => t.type.name).join(', ')}</p>
            <p><strong>Abilities:</strong> ${abilities.map(a => a.ability.name).join(', ')}</p>
            <div class="stats-container">
                <p><strong>HP:</strong> ${hp}</p>
                <p><strong>Attack:</strong> ${attack}</p>
                <p><strong>Defense:</strong> ${defense}</p>
            </div>
            <p class="description">${description.replace(/\n/g, ' ')}</p>
        `;
    }

    async function displayEvolutionChain(chain) {
        evolutionChainDiv.innerHTML = '';
        let current = chain;
        while (current) {
            const pokemonData = await (await fetch(`https://pokeapi.co/api/v2/pokemon/${current.species.name}`)).json();
            evolutionChainDiv.innerHTML += `<img src="${pokemonData.sprites.front_default}" alt="${current.species.name}">`;
            if (current.evolves_to.length > 0) {
                evolutionChainDiv.innerHTML += `<span>&rarr;</span>`;
                current = current.evolves_to[0];
            } else { current = null; }
        }
    }

    function displaySuggestions(filteredNames) {
        suggestionsContainer.innerHTML = '';
        filteredNames.forEach(name => {
            const div = document.createElement('div');
            div.textContent = name;
            div.classList.add('suggestion-item');
            div.addEventListener('click', () => fetchPokemonData(name));
            suggestionsContainer.appendChild(div);
        });
    }

    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('light-mode');
    }

    function toggleMenu() {
        sideMenu.classList.toggle('open');
    }

    function switchView(viewName) {
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.remove('active-view');
        });
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active-view');
        }
    }

    // --- "WHO'S THAT POKEMON?" GAME ---
    async function startWhosThatPokemon() {
        wtpFeedback.textContent = '';
        wtpGuessInput.value = '';
        wtpSprite.classList.add('silhouette');
        const randomId = Math.floor(Math.random() * 1025) + 1;
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
        const data = await response.json();
        wtpCorrectName = data.name;
        wtpSprite.src = data.sprites.front_default;
    }

    function handleWtpGuess() {
        const guess = wtpGuessInput.value.toLowerCase().trim();
        if (guess === wtpCorrectName) {
            wtpFeedback.textContent = "Correct!";
            wtpSprite.classList.remove('silhouette');
            setTimeout(startWhosThatPokemon, 3000);
        } else {
            wtpFeedback.textContent = "Try again!";
        }
    }

    // --- MATCHING GAME ---
    async function startMatchingGame() {
        matchingBoard.innerHTML = 'Loading cards...';
        isBoardLocked = true;
        matchedPairs = 0;
        let cardIds = new Set();
        while (cardIds.size < 8) {
            cardIds.add(Math.floor(Math.random() * 1025) + 1);
        }
        let cardPairs = [...cardIds, ...cardIds].sort(() => Math.random() - 0.5);

        const cardPromises = cardPairs.map(id => fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(res => res.json()));
        const cardData = await Promise.all(cardPromises);

        matchingBoard.innerHTML = '';
        cardData.forEach(pokemon => {
            const cardContainer = document.createElement('div');
            cardContainer.classList.add('card-container');
            cardContainer.dataset.id = pokemon.id;

            cardContainer.innerHTML = `
                <div class="match-card">
                    <div class="card-face card-back"></div>
                    <div class="card-face card-front">
                        <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
                    </div>
                </div>
            `;
            cardContainer.addEventListener('click', handleCardFlip);
            matchingBoard.appendChild(cardContainer);
        });
        isBoardLocked = false;
    }

    function handleCardFlip(e) {
        if (isBoardLocked) return;
        const clickedCard = e.currentTarget.querySelector('.match-card');
        if (clickedCard.classList.contains('flipped') || flippedCards.length >= 2) return;

        clickedCard.classList.add('flipped');
        flippedCards.push(clickedCard);

        if (flippedCards.length === 2) {
            checkForMatch();
        }
    }

    function checkForMatch() {
        isBoardLocked = true;
        const [card1, card2] = flippedCards;
        const id1 = card1.parentElement.dataset.id;
        const id2 = card2.parentElement.dataset.id;

        if (id1 === id2) {
            matchedPairs++;
            flippedCards = [];
            isBoardLocked = false;
            if (matchedPairs === 8) {
                setTimeout(() => {
                    alert("You won!");
                    startMatchingGame();
                }, 500);
            }
        } else {
            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
                flippedCards = [];
                isBoardLocked = false;
            }, 1200);
        }
    }
    
    // --- EVENT HANDLERS ---
    function handleSearchInput() {
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm.length > 1) {
            const filteredNames = allPokemonNames.filter(name => name.startsWith(searchTerm)).slice(0, 5);
            displaySuggestions(filteredNames);
        } else {
            suggestionsContainer.innerHTML = '';
        }
    }

    function handleSearchEnter(event) {
        if (event.key === 'Enter') {
            const searchTerm = searchInput.value.toLowerCase();
            if (searchTerm) {
                fetchPokemonData(searchTerm);
            }
        }
    }

    // --- START THE APP ---
    initialize();
});
