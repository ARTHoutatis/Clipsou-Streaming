// Système de traduction i18n pour Clipsou Streaming
(function() {
  'use strict';

  // Dictionnaire de traductions
  const translations = {
    fr: {
      // Navigation
      'nav.menu': 'Menu',
      'nav.home': 'Accueil',
      'nav.search': 'Recherche',
      'nav.admin': 'Admin',
      'nav.close': 'Fermer le menu',

      // Footer
      'footer.info.title': 'Infos sur le site',
      'footer.info.desc': 'Clipsou Streaming a été fondé en 2025 par ARTH et Mr Roxxor.<br>Ce service est le résultat de plusieurs mois de labeur, venant d\'un studio de cinéma indépendant établi en 2019.<br>Aujourd\'hui, Clipsou bénéficie de sa propre plateforme de streaming et propose des mises à jour régulières !',
      'footer.partners.title': 'Nos partenaires',
      'footer.partners.desc': 'Découvrez les créateurs qui nous soutiennent !<br>Donnez-leur votre soutien en visitant leurs réseaux.',
      'footer.partners.button': 'Voir nos partenaires',
      'footer.useful.title': 'Liens utiles',
      'footer.add.film': 'Ajouter son film',
      'footer.shop': 'Clipsou Shop',
      'footer.support': 'Nous soutenir',
      'footer.rate': 'Noter le site',
      'footer.legal.title': 'Informations légales',
      'footer.privacy': 'Politique de confidentialité',
      'footer.mentions': 'Mentions légales',
      'footer.cgu': 'CGU',
      'footer.social.title': 'Réseaux sociaux',
      'footer.discord': 'Discord',
      'footer.youtube': 'YouTube',
      'footer.back.top': 'Revenir en haut',
      'footer.language': 'Langue',

      // Sections page d'accueil
      'home.continue': '▶️ Reprendre la lecture',
      'home.favorites': '❤️ Favoris',
      'home.top.rated': '⭐ Mieux notés',
      'home.discord.title': 'Des questions ? Un souci ? Rejoins-nous',
      'home.discord.desc': 'Rejoins notre serveur Discord pour poser tes questions, suivre les actus, signaler des bugs ou simplement discuter avec la communauté.<br>Tu as une requête ?<br>N\'hésite pas à nous la soumettre : une équipe de modérateurs sera là pour te répondre !',
      'home.discord.button': 'Notre Discord',

      // Carrousel
      'carousel.view': 'Voir la fiche',

      // Drawer menu
      'drawer.title': 'Menu',
      'drawer.shortcuts': 'Raccourcis',
      'drawer.favorites': '❤️ Favoris',
      'drawer.nouveautes': '✨ Nouveautés',
      'drawer.top.rated': '⭐ Mieux notés',
      'drawer.series': '📺 Séries',
      'drawer.comedie': '😂 Comédie',
      'drawer.familial': '👥 Familial',
      'drawer.aventure': '🗺️ Aventure',
      'drawer.action': '💥 Action',
      'drawer.horreur': '👻 Horreur',
      'drawer.footer': '🚀 Liens, infos & partenariats',

      // Boutons communs
      'button.close': 'Fermer',
      'button.watch': 'Regarder',
      'button.add.favorites': 'Mettre en favoris',
      'button.remove.favorites': 'Retirer des favoris',

      // Popup de notation
      'rating.title': 'Comment Avez-Vous Trouvé Ce Contenu ?',
      'rating.subtitle': 'La note que vous mettrez aura un impact sur la note générale du contenu.',
      'rating.submit': 'Soumettre',

      // Page de recherche
      'search.title': 'Recherche de films et séries',
      'search.placeholder': 'Recherchez un genre, un film ou une série...',
      'search.filters': 'Filtres',
      'search.filters.toggle': 'Afficher/masquer les filtres',

      // Page fiche - sections
      'fiche.similar': 'Contenu similaire',
      'fiche.episodes': 'Épisodes',
      'fiche.actors': 'Acteurs & Doubleurs',

      // Popup Ajouter son film
      'popup.submit.title': 'Vous voulez ajouter votre film sur notre site ?',
      'popup.submit.need': 'Il me faut juste ces infos :',
      'popup.submit.poster': 'Affiche (format 9/12)',
      'popup.submit.image': 'Image (format 16/9)',
      'popup.submit.logo': 'Logo de votre studio (fond transparent si possible)',
      'popup.submit.genres': '3 genres (exemple : Action, Comédie, Thriller)',
      'popup.submit.link': 'Lien YouTube de votre film',
      'popup.submit.actors': 'Acteurs / Doubleurs et rôles',
      'popup.submit.description': 'Courte description du film',
      'popup.submit.discord': 'Envoyez-moi tout ça par MP Discord : arth.d.i.s.c.o.r.d',
      'popup.submit.email': 'Ou par email :',
      'popup.submit.form': 'Accéder au formulaire officiel',

      // Popup Infos
      'popup.info.title': 'Infos',

      // Popup Partenariats
      'popup.partners.title': 'Partenariats',
      'popup.partners.nova.title': 'Bienvenue sur NOVA – Le Meilleur du Streaming Gratuit en VF & VOSTFR !',
      'popup.partners.nova.desc': 'Vous cherchez LE site ultime pour regarder films, séries et animés sans limite, gratuitement et en qualité HD, Full HD, voire 4K ? Ne cherchez plus : NOVA est votre nouvelle destination streaming incontournable !',
      'popup.partners.nova.site': 'Site Nova Stream',
      'popup.partners.nova.join': 'Rejoindre NOVA',
      'popup.partners.cinehelp.title': 'Bienvenue sur CineHelp – L\'univers du cinéma collaboratif !',
      'popup.partners.cinehelp.desc': 'Tu veux créer un film, échanger avec des passionnés ou trouver des partenaires de tournage ? CineHelp te permet de partager tes projets, apprendre l\'audiovisuel et rejoindre une communauté dynamique, débutants comme pros.',
      'popup.partners.cinehelp.join': 'Rejoindre CineHelp',
      'popup.partners.cineclub.title': 'Bienvenue sur Cinéclub – Le serveur des vrais passionnés de cinéma !',
      'popup.partners.cineclub.desc': 'Tu aimes le cinéma et veux échanger avec des cinéphiles qui connaissent leurs classiques (et leurs nanars) ? Rejoins Cinéclub pour débattre, partager tes critiques et participer à des événements réguliers : soirées films, jeux, concours, et plus encore !',
      'popup.partners.cineclub.join': 'Rejoindre Cinéclub',
      'popup.partners.cineclub.youtube': 'Chaîne YouTube CineMakers',
      
      // Lecteur vidéo
      'player.title': 'Lecture',
      'player.close': 'Fermer le lecteur',
      'player.skip': 'Passer l\'intro',
      'player.instructions': 'Appuyez sur Échap ou ✕ pour fermer.',
      
      // Boutons d'action
      'button.view.details': 'Voir la fiche',

      // Types de contenu
      'type.film': 'Film',
      'type.serie': 'Série',
      'type.trailer': 'Trailer',
      
      // Genres
      'genre.action': 'Action',
      'genre.comedie': 'Comédie',
      'genre.drame': 'Drame',
      'genre.horreur': 'Horreur',
      'genre.thriller': 'Thriller',
      'genre.aventure': 'Aventure',
      'genre.familial': 'Familial',
      'genre.fantastique': 'Fantastique',
      'genre.mystere': 'Mystère',
      'genre.psychologique': 'Psychologique',
      'genre.western': 'Western',
      'genre.super-heros': 'Super-héros',
      'genre.enfants': 'Enfants',
      'genre.ambience': 'Ambience',
      'genre.documentaire': 'Documentaire',
      
      // Rôles d'acteurs
      'role.acteur': 'Acteur',
      'role.doubleur': 'Doubleur',
      'role.realisateur': 'Réalisateur',
      'role.voix': 'Voix',
      
      // Episodes
      'episode.label': 'Épisode',
      'episode.season': 'Saison',
      
      // Titres de sections (index.html)
      'home.nouveautes.subtitle': 'Les derniers ajouts',
      'home.nouveautes.title': '✨ Nouveautés',
      'home.films.subtitle': 'Découvrez nos films',
      'home.films.title': '🎬 Films',
      'home.series.subtitle': 'Lot de séries amateures',
      'home.series.title': '📺 Séries amateures',
      'home.trailers.subtitle': 'Aperçu exclusif',
      'home.trailers.title': '🎞️ Bandes-annonces',
      'home.favorites.subtitle': 'Vous avez mis en favoris',
      'home.favorites.title': '❤️ Titres en favoris',
      'home.toprated.subtitle': 'On les adore et vous ?',
      'home.toprated.title': '⭐ Mieux notés',
      
      // Sections de genres personnalisées
      'genre.comedie.subtitle': 'Les films qui vont vous faire rire',
      'genre.comedie.title': '😂 Vous allez rire !!',
      'genre.action.subtitle': 'Des scènes qui décoiffent',
      'genre.action.title': '💥 Ça va bouger !',
      'genre.horreur.subtitle': 'Âmes sensibles s\'abstenir',
      'genre.horreur.title': 'Frissons garantis !',
      'genre.aventure.subtitle': 'Cap sur l\'évasion',
      'genre.aventure.title': 'Partez à l\'aventure !',
      'genre.familial.subtitle': 'À partager en famille',
      'genre.familial.title': 'Moments en famille !',
      
      // Pages légales
      'legal.back': 'Retour à l\'accueil',
      'legal.updated': 'Dernière mise à jour : 2 novembre 2025',
      'legal.privacy.title': 'Politique de confidentialité',
      'legal.terms.title': 'Conditions générales d\'utilisation',
      'legal.mentions.title': 'Mentions légales',
      'legal.content.notice': '📢 Le contenu détaillé de cette page est actuellement disponible uniquement en français. Une traduction complète sera bientôt disponible.'
    },
    en: {
      // Navigation
      'nav.menu': 'Menu',
      'nav.home': 'Home',
      'nav.search': 'Search',
      'nav.admin': 'Admin',
      'nav.close': 'Close menu',

      // Footer
      'footer.info.title': 'About the site',
      'footer.info.desc': 'Clipsou Streaming was founded in 2025 by ARTH and Mr Roxxor.<br>This service is the result of several months of hard work, coming from an independent film studio established in 2019.<br>Today, Clipsou has its own streaming platform and offers regular updates!',
      'footer.partners.title': 'Our partners',
      'footer.partners.desc': 'Discover the creators who support us!<br>Give them your support by visiting their networks.',
      'footer.partners.button': 'View our partners',
      'footer.useful.title': 'Useful links',
      'footer.add.film': 'Add your film',
      'footer.shop': 'Clipsou Shop',
      'footer.support': 'Support us',
      'footer.rate': 'Rate the site',
      'footer.legal.title': 'Legal information',
      'footer.privacy': 'Privacy policy',
      'footer.mentions': 'Legal notices',
      'footer.cgu': 'Terms of use',
      'footer.social.title': 'Social media',
      'footer.discord': 'Discord',
      'footer.youtube': 'YouTube',
      'footer.back.top': 'Back to top',
      'footer.language': 'Language',

      // Home sections
      'home.continue': '▶️ Continue watching',
      'home.favorites': '❤️ Favorites',
      'home.top.rated': '⭐ Top rated',
      'home.discord.title': 'Questions? An issue? Join us',
      'home.discord.desc': 'Join our Discord server to ask questions, follow news, report bugs or simply chat with the community.<br>Do you have a request?<br>Don\'t hesitate to submit it: a team of moderators will be there to answer you!',
      'home.discord.button': 'Our Discord',

      // Carousel
      'carousel.view': 'View details',

      // Drawer menu
      'drawer.title': 'Menu',
      'drawer.shortcuts': 'Shortcuts',
      'drawer.favorites': '❤️ Favorites',
      'drawer.nouveautes': '✨ New releases',
      'drawer.top.rated': '⭐ Top rated',
      'drawer.series': '📺 Series',
      'drawer.comedie': '😂 Comedy',
      'drawer.familial': '👥 Family',
      'drawer.aventure': '🗺️ Adventure',
      'drawer.action': '💥 Action',
      'drawer.horreur': '👻 Horror',
      'drawer.footer': '🚀 Links, info & partnerships',

      // Common buttons
      'button.close': 'Close',
      'button.watch': 'Watch',
      'button.add.favorites': 'Add to favorites',
      'button.remove.favorites': 'Remove from favorites',

      // Rating popup
      'rating.title': 'How Did You Find This Content?',
      'rating.subtitle': 'The rating you give will impact the overall rating of the content.',
      'rating.submit': 'Submit',

      // Search page
      'search.title': 'Search for films and series',
      'search.placeholder': 'Search for a genre, film or series...',
      'search.filters': 'Filters',
      'search.filters.toggle': 'Show/hide filters',

      // Fiche page - sections
      'fiche.similar': 'Similar content',
      'fiche.episodes': 'Episodes',
      'fiche.actors': 'Actors & Voice actors',

      // YouTube popup
      'popup.youtube.title': 'YouTube Channels',
      'popup.youtube.official': 'Clipsou Studio Streaming – official site channel',
      'popup.youtube.creator': 'Mr Roxxor – channel of the Clipsou creator and director',
      'popup.youtube.alex': 'Ferrisbu – channel of the ALEX director',
      'popup.youtube.dev': 'ARTHsz – channel of the Clipsou developer and animator',
      'popup.youtube.channel': 'Channel link',
      
      // Video player
      'player.title': 'Playing',
      'player.close': 'Close player',
      'player.skip': 'Skip intro',
      'player.instructions': 'Press Esc or ✕ to close.',
      
      // Add your film popup
      'popup.submit.title': 'Want to add your film to our site?',
      'popup.submit.need': 'I just need this info:',
      'popup.submit.poster': 'Poster (9/12 format)',
      'popup.submit.image': 'Image (16/9 format)',
      'popup.submit.logo': 'Your studio logo (transparent background if possible)',
      'popup.submit.genres': '3 genres (example: Action, Comedy, Thriller)',
      'popup.submit.link': 'YouTube link of your film',
      'popup.submit.actors': 'Actors / Voice actors and roles',
      'popup.submit.description': 'Short description of the film',
      'popup.submit.discord': 'Send me all this by Discord DM: arth.d.i.s.c.o.r.d',
      'popup.submit.email': 'Or by email:',
      'popup.submit.form': 'Access the official form',

      // Info popup
      'popup.info.title': 'Info',

      // Partnerships popup
      'popup.partners.title': 'Partnerships',
      'popup.partners.nova.title': 'Welcome to NOVA – The Best Free Streaming in French & Subtitled!',
      'popup.partners.nova.desc': 'Looking for THE ultimate site to watch movies, series and anime without limits, for free and in HD, Full HD or even 4K quality? Look no further: NOVA is your new essential streaming destination!',
      'popup.partners.nova.site': 'Nova Stream Site',
      'popup.partners.nova.join': 'Join NOVA',
      'popup.partners.cinehelp.title': 'Welcome to CineHelp – The collaborative cinema universe!',
      'popup.partners.cinehelp.desc': 'Want to create a film, chat with enthusiasts or find shooting partners? CineHelp allows you to share your projects, learn audiovisual skills and join a dynamic community, from beginners to pros.',
      'popup.partners.cinehelp.join': 'Join CineHelp',
      'popup.partners.cineclub.title': 'Welcome to Cinéclub – The server for true cinema enthusiasts!',
      'popup.partners.cineclub.desc': 'Love cinema and want to chat with cinephiles who know their classics (and their trashy movies)? Join Cinéclub to debate, share your reviews and participate in regular events: movie nights, games, contests, and more!',
      'popup.partners.cineclub.join': 'Join Cinéclub',
      'popup.partners.cineclub.youtube': 'CineMakers YouTube Channel',
      
      // YouTube popup
      'popup.youtube.title': 'YouTube Channels',
      'popup.youtube.official': 'Clipsou Studio Streaming – official site channel',
      'popup.youtube.creator': 'Mr Roxxor – channel of the Clipsou creator and director',
      'popup.youtube.alex': 'Ferrisbu – channel of the ALEX director',
      'popup.youtube.dev': 'ARTHsz – channel of the Clipsou developer and animator',
      'popup.youtube.channel': 'Channel link',
      
      // Video player
      'player.title': 'Playing',
      'player.close': 'Close player',
      'player.skip': 'Skip intro',
      'player.instructions': 'Press Esc or ✕ to close.',
      
      // Action buttons
      'button.view.details': 'View details',

      // Content types
      'type.film': 'Movie',
      'type.serie': 'Series',
      'type.trailer': 'Trailer',
      
      // Genres
      'genre.action': 'Action',
      'genre.comedie': 'Comedy',
      'genre.drame': 'Drama',
      'genre.horreur': 'Horror',
      'genre.thriller': 'Thriller',
      'genre.aventure': 'Adventure',
      'genre.familial': 'Family',
      'genre.fantastique': 'Fantasy',
      'genre.mystere': 'Mystery',
      'genre.psychologique': 'Psychological',
      'genre.western': 'Western',
      'genre.super-heros': 'Superhero',
      'genre.enfants': 'Kids',
      'genre.ambience': 'Ambience',
      'genre.documentaire': 'Documentary',
      
      // Actor roles
      'role.acteur': 'Actor',
      'role.doubleur': 'Voice actor',
      'role.realisateur': 'Director',
      'role.voix': 'Voice',
      
      // Episodes
      'episode.label': 'Episode',
      'episode.season': 'Season',
      
      // Section titles (index.html)
      'home.nouveautes.subtitle': 'Latest additions',
      'home.nouveautes.title': '✨ New releases',
      'home.films.subtitle': 'Discover our movies',
      'home.films.title': '🎬 Movies',
      'home.series.subtitle': 'Amateur series collection',
      'home.series.title': '📺 Amateur series',
      'home.trailers.subtitle': 'Exclusive preview',
      'home.trailers.title': '🎞️ Trailers',
      'home.favorites.subtitle': 'You have favorited',
      'home.favorites.title': '❤️ Favorite titles',
      'home.toprated.subtitle': 'We love them, what about you?',
      'home.toprated.title': '⭐ Top rated',
      
      // Custom genre sections
      'genre.comedie.subtitle': 'Movies that will make you laugh',
      'genre.comedie.title': '😂 You\'ll laugh!!',
      'genre.action.subtitle': 'Jaw-dropping scenes',
      'genre.action.title': '💥 Things are moving!',
      'genre.horreur.subtitle': 'Faint-hearted beware',
      'genre.horreur.title': 'Chills guaranteed!',
      'genre.aventure.subtitle': 'Set course for escape',
      'genre.aventure.title': 'Go on an adventure!',
      'genre.familial.subtitle': 'To share with family',
      'genre.familial.title': 'Family moments!',
      
      // Legal pages
      'legal.back': 'Back to home',
      'legal.updated': 'Last updated: November 2, 2025',
      'legal.privacy.title': 'Privacy Policy',
      'legal.terms.title': 'Terms of Use',
      'legal.mentions.title': 'Legal Notices',
      'legal.content.notice': '📢 The detailed content of this page is currently available in French only. A full English translation will be available soon.'
    }
  };

  // Fonction pour obtenir la langue actuelle
  function getCurrentLanguage() {
    return localStorage.getItem('site_language') || 'fr';
  }

  // Cache pour les traductions automatiques
  const translationCache = {};

  // Liste des serveurs LibreTranslate publics (gratuits, sans limite stricte)
  const libreTranslateServers = [
    'https://libretranslate.com/translate',
    'https://translate.argosopentech.com/translate',
    'https://translate.terraprint.co/translate'
  ];
  
  let currentServerIndex = 0;

  // Fonction pour traduire automatiquement du texte
  async function autoTranslate(text, targetLang) {
    if (!text || targetLang === 'fr') return text;
    
    // Vérifier le cache localStorage pour persistance
    const cacheKey = `translate_v2_${text.substring(0, 50).replace(/\s/g, '_')}_${targetLang}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (e) {
      // Si localStorage est plein, utiliser le cache en mémoire
    }
    
    // Vérifier le cache en mémoire
    if (translationCache[cacheKey]) {
      return translationCache[cacheKey];
    }

    // Essayer LibreTranslate (open source, gratuit, sans limite stricte)
    for (let i = 0; i < libreTranslateServers.length; i++) {
      try {
        const serverUrl = libreTranslateServers[currentServerIndex];
        
        const response = await fetch(serverUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            q: text,
            source: 'fr',
            target: targetLang,
            format: 'text'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.translatedText) {
            const translated = data.translatedText;
            // Sauvegarder dans le cache
            translationCache[cacheKey] = translated;
            try {
              localStorage.setItem(cacheKey, translated);
            } catch (e) {
              // Si localStorage est plein, continuer sans sauvegarder
            }
            return translated;
          }
        }
        
        // Si ce serveur échoue, essayer le suivant
        currentServerIndex = (currentServerIndex + 1) % libreTranslateServers.length;
        
      } catch (error) {
        console.warn(`LibreTranslate server ${currentServerIndex} failed, trying next...`);
        currentServerIndex = (currentServerIndex + 1) % libreTranslateServers.length;
      }
    }
    
    // Si tous les serveurs LibreTranslate échouent, essayer MyMemory en fallback
    try {
      const textToTranslate = text.length > 500 ? text.substring(0, 500) + '...' : text;
      const encodedText = encodeURIComponent(textToTranslate);
      const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=fr|${targetLang}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
        const translated = data.responseData.translatedText;
        translationCache[cacheKey] = translated;
        try {
          localStorage.setItem(cacheKey, translated);
        } catch (e) {}
        return translated;
      }
    } catch (error) {
      console.warn('Fallback translation (MyMemory) also failed:', error);
    }
    
    return text; // Fallback to original text
  }

  // Fonction pour définir la langue
  function setLanguage(lang) {
    if (!translations[lang]) {
      console.warn('Language not supported:', lang);
      return;
    }
    localStorage.setItem('site_language', lang);
    document.documentElement.lang = lang;
    applyTranslations(lang);
  }

  // Fonction pour appliquer les traductions
  function applyTranslations(lang) {
    const t = translations[lang];
    
    // Traduire tous les éléments avec data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        if (el.hasAttribute('data-i18n-html')) {
          el.innerHTML = t[key];
        } else {
          el.textContent = t[key];
        }
      }
    });

    // Traduire les placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (t[key]) {
        el.placeholder = t[key];
      }
    });

    // Traduire les aria-label
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      if (t[key]) {
        el.setAttribute('aria-label', t[key]);
      }
    });

    // Traduire les title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (t[key]) {
        el.title = t[key];
      }
    });

    // Mettre à jour le sélecteur de langue
    document.querySelectorAll('.language-selector button').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('active');
      }
    });

    // Traduire automatiquement les descriptions de fiche
    const ficheDescriptions = document.querySelectorAll('.fiche-right p');
    ficheDescriptions.forEach(async (p) => {
      const originalText = p.getAttribute('data-original-text');
      if (originalText && lang !== 'fr') {
        try {
          const translated = await autoTranslate(originalText, lang);
          if (translated) {
            p.textContent = translated;
          }
        } catch (err) {
          console.warn('Failed to auto-translate description:', err);
        }
      } else if (originalText && lang === 'fr') {
        p.textContent = originalText;
      }
    });

    // Traduire les descriptions du carousel
    const carouselDescriptions = document.querySelectorAll('.carousel-description');
    carouselDescriptions.forEach(async (p) => {
      const originalText = p.getAttribute('data-original-text');
      if (originalText && lang !== 'fr') {
        try {
          const translated = await autoTranslate(originalText, lang);
          if (translated) {
            p.textContent = translated;
          }
        } catch (err) {
          console.warn('Failed to auto-translate carousel description:', err);
        }
      } else if (originalText && lang === 'fr') {
        p.textContent = originalText;
      }
    });

    // Traduire les genres
    document.querySelectorAll('.genre-tag, .carousel-genre-tag').forEach(tag => {
      const original = tag.getAttribute('data-original-genre');
      if (original) {
        tag.textContent = translateGenre(original);
      }
    });

    // Traduire les rôles d'acteurs (asynchrone)
    document.querySelectorAll('.actor-role').forEach(async (role) => {
      const original = role.getAttribute('data-original-role');
      if (original) {
        const translated = await translateRole(original, lang);
        if (translated) {
          role.textContent = translated;
        }
      }
    });

    // Traduire les types sur les cartes (Film/Série/Trailer)
    updateCardTypes(lang);

    // Événement personnalisé pour notifier le changement de langue
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
  }

  // Fonction pour mettre à jour les types sur les cartes
  function updateCardTypes(lang) {
    document.querySelectorAll('.card-info[data-type]').forEach(cardInfo => {
      const type = cardInfo.getAttribute('data-type');
      if (!type) return;
      
      const typeLower = type.toLowerCase();
      let translatedType = type;
      
      if (lang === 'en') {
        if (typeLower === 'film') translatedType = 'Movie';
        else if (typeLower === 'série' || typeLower === 'serie') translatedType = 'Series';
        else if (typeLower === 'trailer') translatedType = 'Trailer';
      } else {
        if (typeLower === 'film') translatedType = 'Film';
        else if (typeLower === 'série' || typeLower === 'serie') translatedType = 'Série';
        else if (typeLower === 'trailer') translatedType = 'Trailer';
      }
      
      // Stocker le type traduit dans un attribut pour l'utiliser dans le CSS
      cardInfo.setAttribute('data-type-display', translatedType);
    });
  }

  // Fonction d'initialisation
  function init() {
    const currentLang = getCurrentLanguage();
    document.documentElement.lang = currentLang;
    
    // Appliquer les traductions immédiatement
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => applyTranslations(currentLang));
    } else {
      applyTranslations(currentLang);
    }

    // Écouter les clics sur les boutons de langue
    document.addEventListener('click', function(e) {
      const langBtn = e.target.closest('[data-lang]');
      if (langBtn) {
        const lang = langBtn.getAttribute('data-lang');
        setLanguage(lang);
      }
    });
  }

  // Fonction pour traduire un type de contenu
  function translateType(type) {
    if (!type) return '';
    const key = `type.${type.toLowerCase()}`;
    return translate(key);
  }

  // Fonction pour traduire un genre
  function translateGenre(genre) {
    if (!genre) return genre;
    const normalized = genre.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Enlever accents
      .replace(/\s+/g, '-'); // Espaces -> tirets
    const key = `genre.${normalized}`;
    const translated = translate(key);
    return translated !== key ? translated : genre; // Fallback au genre original
  }

  // Fonction pour traduire un rôle (auto-traduction)
  async function translateRole(role, targetLang) {
    if (!role) return role;
    
    // Si langue française, retourner tel quel
    const lang = targetLang || getCurrentLanguage();
    if (lang === 'fr') return role;
    
    // Essayer d'abord les clés prédéfinies
    const normalized = role.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const key = `role.${normalized}`;
    const translated = translate(key);
    if (translated !== key) return translated;
    
    // Sinon, auto-traduction
    try {
      const autoTranslated = await autoTranslate(role, lang);
      return autoTranslated || role;
    } catch (err) {
      return role;
    }
  }

  // Fonction générique de traduction
  function translate(key) {
    const lang = getCurrentLanguage();
    return translations[lang][key] || key;
  }

  // API publique
  window.i18n = {
    setLanguage: setLanguage,
    getCurrentLanguage: getCurrentLanguage,
    translate: translate,
    translateType: translateType,
    translateGenre: translateGenre,
    translateRole: translateRole,
    autoTranslate: autoTranslate,
    updateCardTypes: updateCardTypes
  };

  // Initialiser
  init();

})();
