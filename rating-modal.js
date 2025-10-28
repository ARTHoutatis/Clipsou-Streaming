'use strict';

// Configuration - Utilise l'URL du Worker depuis config.js
const RATING_WORKER_URL = window.ClipsouConfig?.workerUrl || 'https://clipsou-publish.arthurcapon54.workers.dev';

// Variables globales pour la notation
let currentRating = 0;
let currentItemId = '';
let currentItemData = null;

// Fonction principale pour afficher la popup
window.showRatingModal = function(itemId) {
    currentItemId = itemId;
    const modal = document.getElementById('ratingModal');
    
    if (!modal) {
        console.error('Modal de notation non trouvée');
        return;
    }

    // Charger les données du contenu
    loadItemDataForRating(itemId);
    
    // Attendre un peu pour que la fiche soit bien chargée, puis afficher la modal
    setTimeout(() => {
        // Afficher la modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Charger l'image maintenant que tout est prêt
        displayItemDataInModal();
    }, 100);
    
    // Initialiser les événements si ce n'est pas déjà fait
    if (!modal.dataset.initialized) {
        initRatingModal();
        modal.dataset.initialized = 'true';
    }
    
    // Reset rating
    currentRating = 0;
    resetStars();
    document.getElementById('submitRatingBtn').disabled = true;
};

// Charger les données du contenu
function loadItemDataForRating(itemId) {
    try {
        // Essayer depuis localStorage d'abord
        const approvedItems = localStorage.getItem('clipsou_items_approved_v1');
        if (approvedItems) {
            const items = JSON.parse(approvedItems);
            currentItemData = items.find(item => item.id === itemId);
            console.log('Données trouvées dans localStorage:', currentItemData);
        }

        // Si pas trouvé, chercher dans le DOM
        if (!currentItemData) {
            const scriptTag = document.getElementById('data-approved');
            if (scriptTag) {
                const items = JSON.parse(scriptTag.textContent);
                currentItemData = items.find(item => item.id === itemId);
                console.log('Données trouvées dans le DOM:', currentItemData);
            }
        }

        if (!currentItemData) {
            console.warn('⚠ Données du contenu non trouvées pour:', itemId);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
    }
}

// Afficher les données dans la modal
function displayItemDataInModal() {
    const imageEl = document.getElementById('ratingContentImage');
    
    if (!imageEl) {
        console.error('❌ Élément image non trouvé');
        return;
    }
    
    console.log('=== DEBUG IMAGE POPUP ===');
    console.log('currentItemData:', currentItemData);
    
    // Adapter le texte en fonction du type de contenu
    if (currentItemData && currentItemData.type) {
        const subtitleEl = document.querySelector('#ratingModal .rating-subtitle');
        if (subtitleEl) {
            const type = currentItemData.type.toLowerCase();
            let typeText = 'du film';
            
            if (type === 'série' || type === 'serie') {
                typeText = 'de la série';
            } else if (type === 'trailer' || type === 'bande-annonce') {
                typeText = 'de la bande-annonce';
            } else if (type === 'documentaire') {
                typeText = 'du documentaire';
            } else if (type === 'court-métrage') {
                typeText = 'du court-métrage';
            } else if (type === 'animation') {
                typeText = 'de l\'animation';
            }
            
            subtitleEl.textContent = `La note que vous mettrez aura un impact sur la note générale ${typeText}`;
            console.log('✓ Texte adapté pour le type:', type);
        }
    }
    
    let imageSrc = null;
    
    // STRATÉGIE 1: Récupérer l'image depuis le DOM de la fiche (la plus fiable)
    const ficheImages = document.querySelectorAll('#fiche img, .fiche-media-wrap img, .fiche-left img');
    console.log('Images trouvées dans la fiche:', ficheImages.length);
    
    for (let img of ficheImages) {
        console.log('- Image fiche:', img.src, img.alt);
        if (img.src && img.src !== window.location.href && !img.src.includes('data:image')) {
            imageSrc = img.src;
            console.log('✓ Image sélectionnée depuis la fiche:', imageSrc);
            break;
        }
    }
    
    // STRATÉGIE 2: Utiliser les données si pas trouvé dans le DOM
    if (!imageSrc && currentItemData) {
        console.log('Recherche dans currentItemData...');
        console.log('- landscapeImage:', currentItemData.landscapeImage);
        console.log('- image:', currentItemData.image);
        console.log('- portraitImage:', currentItemData.portraitImage);
        
        imageSrc = currentItemData.landscapeImage || currentItemData.image || currentItemData.portraitImage || null;
        
        if (imageSrc) {
            console.log('✓ Image trouvée dans les données:', imageSrc);
        }
    }

    console.log('=== IMAGE FINALE:', imageSrc);

    // Appliquer l'image
    if (imageSrc && imageSrc !== '') {
        // Optimiser si Cloudinary
        if (imageSrc.includes('cloudinary.com') && typeof optimizeCloudinaryUrlSmall === 'function') {
            try {
                const optimized = optimizeCloudinaryUrlSmall(imageSrc);
                console.log('Image optimisée:', imageSrc, '->', optimized);
                imageSrc = optimized;
            } catch (e) {
                console.warn('Erreur optimisation:', e);
            }
        }
        
        console.log('🎯 Chargement de l\'image:', imageSrc);
        imageEl.src = imageSrc;
        imageEl.alt = (currentItemData && currentItemData.title) || 'Contenu';
        
        imageEl.onload = function() {
            console.log('✅ Image chargée avec succès!');
        };
        
        imageEl.onerror = function() {
            console.error('❌ ERREUR chargement image:', this.src);
        };
    } else {
        console.warn('⚠️ Aucune image disponible - garde le placeholder');
    }
    
    console.log('=========================');
}

// Initialiser la modal
function initRatingModal() {
    // Clic sur le fond de la modal pour fermer
    document.getElementById('ratingModal').addEventListener('click', (e) => {
        if (e.target.id === 'ratingModal') {
            closeRatingModal();
        }
    });
    
    // Initialiser les étoiles
    initStars();
    
    // Bouton soumettre
    document.getElementById('submitRatingBtn').addEventListener('click', submitRating);
    
    // Bouton favoris
    document.getElementById('addToFavoritesBtn').addEventListener('click', toggleFavorite);
    
    // Échap pour fermer
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('ratingModal');
            if (modal && modal.style.display === 'flex') {
                closeRatingModal();
            }
        }
    });
}

// Fermer la modal
function closeRatingModal() {
    const modal = document.getElementById('ratingModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    currentRating = 0;
    resetStars();
}

// Initialiser le système d'étoiles
function initStars() {
    const stars = document.querySelectorAll('#ratingModal .star');
    const submitBtn = document.getElementById('submitRatingBtn');

    stars.forEach((star, index) => {
        // Survol
        star.addEventListener('mouseenter', () => {
            highlightStars(index + 1);
        });

        // Clic
        star.addEventListener('click', () => {
            currentRating = index + 1;
            highlightStars(currentRating);
            submitBtn.disabled = false;
        });
    });

    // Reset au survol du container
    const starsContainer = document.querySelector('#ratingModal .rating-stars');
    starsContainer.addEventListener('mouseleave', () => {
        if (currentRating > 0) {
            highlightStars(currentRating);
        } else {
            resetStars();
        }
    });
}

// Mettre en surbrillance les étoiles
function highlightStars(count) {
    const stars = document.querySelectorAll('#ratingModal .star');
    stars.forEach((star, index) => {
        if (index < count) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// Réinitialiser les étoiles
function resetStars() {
    const stars = document.querySelectorAll('#ratingModal .star');
    stars.forEach(star => {
        star.classList.remove('active', 'hover');
    });
}

// Soumettre la notation
async function submitRating() {
    if (currentRating === 0 || !currentItemId) return;

    const submitBtn = document.getElementById('submitRatingBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours...';

    // Enregistrer dans localStorage IMMÉDIATEMENT pour éviter de redemander
    const userRatings = JSON.parse(localStorage.getItem('clipsou_user_ratings') || '{}');
    userRatings[currentItemId] = currentRating;
    localStorage.setItem('clipsou_user_ratings', JSON.stringify(userRatings));
    console.log('✓ Note sauvegardée localement pour:', currentItemId, '=', currentRating);

    try {
        const response = await fetch(RATING_WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'rate_item',
                itemId: currentItemId,
                rating: currentRating
            })
        });

        const result = await response.json();

        if (result.ok || response.ok) {
            showRatingMessage('Note envoyée avec succès !', 'success');
            console.log('✓ Note envoyée au serveur avec succès');
            
            setTimeout(() => {
                closeRatingModal();
                // Recharger la page pour mettre à jour la note
                window.location.reload();
            }, 1500);
        } else {
            throw new Error(result.error || 'Erreur lors de l\'envoi');
        }
    } catch (error) {
        console.error('Erreur lors de la soumission:', error);
        // Même en cas d'erreur, on garde la note locale pour ne pas redemander
        showRatingMessage('Note sauvegardée (erreur réseau)', 'success');
        
        setTimeout(() => {
            closeRatingModal();
        }, 2000);
    }
}

// Toggle favoris
function toggleFavorite() {
    if (!currentItemId) return;

    try {
        const favorites = JSON.parse(localStorage.getItem('clipsou_favorites') || '[]');
        const index = favorites.indexOf(currentItemId);
        const btn = document.getElementById('addToFavoritesBtn');

        if (index > -1) {
            // Retirer des favoris
            favorites.splice(index, 1);
            btn.classList.remove('favorited');
            showRatingMessage('Retiré des favoris', 'success');
        } else {
            // Ajouter aux favoris
            favorites.push(currentItemId);
            btn.classList.add('favorited');
            showRatingMessage('Ajouté aux favoris', 'success');
        }

        localStorage.setItem('clipsou_favorites', JSON.stringify(favorites));
        
        // Mettre à jour l'affichage si on est sur la fiche
        if (typeof updateFavoriteButton === 'function') {
            updateFavoriteButton();
        }
    } catch (error) {
        console.error('Erreur lors de la gestion des favoris:', error);
        showRatingMessage('Erreur lors de la mise à jour', 'error');
    }
}

// Afficher un message
function showRatingMessage(message, type = 'success') {
    const messageEl = document.getElementById('ratingStatusMessage');
    messageEl.textContent = message;
    messageEl.className = `rating-status-message ${type}`;
    messageEl.style.display = 'block';

    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}

// Vérifier le statut des favoris au chargement
document.addEventListener('DOMContentLoaded', () => {
    // La modal sera initialisée quand elle sera affichée
});
