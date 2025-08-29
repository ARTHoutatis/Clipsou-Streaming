// Base de données des films et séries
const moviesDatabase = [
    {
        id: 'film1',
        title: 'La vie au petit âge',
        type: 'film',
        rating: 3.5,
        genres: ['Comédie', 'Familial', 'Aventure'],
        image: '../../images/fiches/La.jpeg'
    },
    {
        id: 'film2',
        title: 'Dédoublement',
        type: 'film',
        rating: 4.5,
        genres: ['Thriller', 'Comédie', 'Action'],
        image: '../../images/fiches/Dé.jpg'
    },
    {
        id: 'film3',
        title: 'Jackson Goup',
        type: 'film',
        rating: 3,
        genres: ['Aventure', 'Fantastique', 'Comédie'],
        image: '../../images/fiches/Ja.jpg'
    },
    {
        id: 'film4',
        title: 'Karma',
        type: 'film',
        rating: 3,
        genres: ['Horreur', 'Mystère', 'Psychologique'],
        image: '../../images/fiches/Ka.jpeg'
    },
    {
        id: 'serie1',
        title: 'Alex',
        type: 'série',
        rating: 4,
        genres: ['Action', 'Comédie', 'Drame'],
        image: '../../images/fiches/Al.jpg'
    },
    {
        id: 'serie2',
        title: 'Lawless Legend',
        type: 'série',
        rating: 3.5,
        genres: ['Western', 'Comédie', 'Action'],
        image: '../../images/fiches/Law.jpg'
    },
    {
        id: 'film5',
        title: 'Trailer Batman',
        type: 'trailer',
        genres: ['Action', 'Drame', 'Super-héros'],
        image: '../../images/fiches/Ba.jpg'
    },
    {
        id: 'film6',
        title: 'Urbanos City',
        type: 'film',
        rating: 3,
        genres: ['Comédie', 'Familial', 'Enfants'],
        image: '../../images/fiches/Ur.jpg'
    },
    {
        id: 'film7',
        title: 'Backrooms Urbanos',
        type: 'film',
        rating: 3.5,
        genres: ['Horreur', 'Mystère', 'Action'],
        image: '../../images/fiches/Bac.jpg'
    }
];

// Helper: remove accents/diacritics for accent-insensitive matching
function normalizeStr(str) {
    return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Fonction de recherche (accent-insensitive)
function searchMovies(query, selectedGenres = []) {
    let results = moviesDatabase;
    
    // Filtrer par genres sélectionnés
    if (selectedGenres.length > 0) {
        const selected = selectedGenres.map(g => normalizeStr(g).toLowerCase());
        results = results.filter(item => {
            const itemGenres = (item.genres || []).map(g => normalizeStr(g).toLowerCase());
            return selected.some(g => itemGenres.includes(g));
        });
    }
    
    // Filtrer par terme de recherche
    if (query && query.length >= 1) {
        const searchTerm = normalizeStr(query).toLowerCase().trim();
        results = results.filter(item => {
            const title = normalizeStr(item.title).toLowerCase();
            const type = normalizeStr(item.type).toLowerCase();
            const genres = (item.genres || []).map(g => normalizeStr(g).toLowerCase());
            return (
                title.includes(searchTerm) ||
                genres.some(g => g.includes(searchTerm)) ||
                type.includes(searchTerm)
            );
        });
    }
    
    return results;
}

// Afficher les résultats
function displayResults(results) {
    const resultsContainer = document.getElementById('search-results');
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results"><p>Aucun résultat trouvé</p></div>';
        return;
    }
    
    const resultsHTML = results.map(item => {
        // Map explicit types to data-type for styling
        let typeAttr = 'film';
        if (item.type) {
            const t = item.type.toLowerCase();
            if (t.startsWith('s')) typeAttr = 'série';
            else if (t === 'trailer') typeAttr = 'trailer';
        }
        const ratingAttr = (typeof item.rating !== 'undefined' && item.rating !== null) ? ` data-rating="${item.rating}"` : '';
        return `
        <div class="card" data-type="${typeAttr}">
            <a href="../Index/index.html#${item.id}">
                <img src="${item.image}" alt="Affiche de ${item.title}" loading="lazy">
                <div class="card-info"${ratingAttr}></div>
            </a>
        </div>`;
    }).join('');
    
    resultsContainer.innerHTML = `<div class="search-grid">${resultsHTML}</div>`;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    
    if (searchInput) {
        // Placeholders pour desktop et mobile + switch auto selon taille d'écran
        const desktopPlaceholder = 'Recherchez un genre, un film ou une série...';
        const mobilePlaceholder = 'Recherchez un film/série...';
        const mq = window.matchMedia('(max-width: 768px)');

        function applyPlaceholder(e) {
            const isMobileNow = e.matches === true || (e.media && window.matchMedia(e.media).matches);
            searchInput.placeholder = isMobileNow ? mobilePlaceholder : desktopPlaceholder;
        }

        // Initialisation + écoute des changements (compatibilité navigateurs)
        applyPlaceholder(mq);
        if (typeof mq.addEventListener === 'function') {
            mq.addEventListener('change', applyPlaceholder);
        } else if (typeof mq.addListener === 'function') {
            mq.addListener(applyPlaceholder);
        }

        // Recherche en temps réel
        searchInput.addEventListener('input', function() {
            const query = this.value;
            const results = searchMovies(query);
            displayResults(results);
        });
        
        // Recherche avec Enter / bouton "Aller à" et masquer le clavier
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const results = searchMovies(this.value);
                displayResults(results);
                // Masquer le clavier sur mobile
                this.blur();
                if (document.activeElement) {
                    document.activeElement.blur();
                }
            }
        });
        
        // Afficher tous les films par défaut
        const allMovies = searchMovies('');
        displayResults(allMovies);
    }
});
