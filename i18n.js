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
      'home.continue': 'Reprendre la lecture',
      'home.favorites': '❤️ Favoris',
      'home.top.rated': '⭐ Mieux notés',
      'home.discord.title.line1': 'Des questions ? Un souci ?',
      'home.discord.title.line2': 'Rejoins-nous',
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

      // Page de demande (request.html)
      'request.title': '📽️ Proposer un film',
      'request.logout': '🚪 Se déconnecter',
      'request.back': '← Retour à l\'accueil',
      
      // Stepper
      'request.step.terms': 'Conditions',
      'request.step.auth': 'Connexion',
      'request.step.guide': 'Guide',
      'request.step.form': 'Formulaire',
      
      // Pending request
      'request.pending.title': '📋 Demande en cours',
      'request.pending.message': 'Vous avez une demande en attente de validation par les administrateurs.',
      'request.pending.cancel': 'Annuler ma demande',
      'request.pending.new': 'Nouvelle demande',
      
      // Terms section
      'request.terms.title': '📜 Conditions d\'utilisation',
      'request.terms.intro': 'Avant de soumettre votre demande, veuillez lire attentivement et respecter les conditions suivantes :',
      'request.terms.complete': '✅ Remplissez tous les champs',
      'request.terms.complete.desc': 'Assurez-vous de compléter tous les champs requis du formulaire avec des informations exactes et complètes.',
      'request.terms.notroll': '🚫 Pas de trolling',
      'request.terms.notroll.desc': 'Les demandes fantaisistes, offensantes ou non sérieuses seront automatiquement rejetées et pourront entraîner un blocage.',
      'request.terms.filmsonly': '🎥 Films uniquement',
      'request.terms.filmsonly.desc': 'Cette plateforme est dédiée aux FILMS. Ne soumettez pas de vidéos courtes, sketches, vlogs ou autres contenus non-cinématographiques.',
      'request.terms.ratelimit': '⏱️ Une demande par jour',
      'request.terms.ratelimit.desc': 'Vous êtes limité à une seule demande par période de 24 heures. Vous pouvez annuler votre demande actuelle pour en soumettre une nouvelle.',
      'request.terms.accept': 'J\'ai lu et j\'accepte les conditions d\'utilisation ci-dessus',
      'request.terms.error': '⚠️ Vous devez accepter les conditions d\'utilisation pour soumettre votre demande.',
      'request.terms.button': 'J\'accepte →',
      
      // Auth section
      'request.auth.title': '🔐 Connexion requise',
      'request.auth.desc': 'Pour soumettre un film, vous devez vous connecter avec votre compte Google et vérifier que vous êtes propriétaire de votre chaîne YouTube.',
      'request.auth.google': 'Se connecter à Google',
      'request.auth.why': 'Pourquoi cette connexion ?',
      'request.auth.verify': '✅ Vérifier que vous êtes propriétaire de la chaîne YouTube',
      'request.auth.prevent': '✅ Éviter les soumissions frauduleuses',
      'request.auth.protect': '✅ Protéger les créateurs de contenu',
      'request.auth.associate': '✅ Associer vos demandes à votre compte',
      'request.auth.footer': 'En vous connectant, vous acceptez que nous accédions aux informations de votre chaîne YouTube pour vérifier votre propriété.',
      'request.auth.privacy': 'Consulter notre politique de confidentialité',
      'request.auth.prev': '← Retour',
      'request.auth.next': 'Suivant →',
      
      // Tutorial section
      'request.tutorial.title': '📚 Guide visuel des images',
      'request.tutorial.intro': 'Voici un exemple de carte de film pour vous aider à comprendre le positionnement des différentes images :',
      'request.tutorial.portrait': 'Affiche Portrait',
      'request.tutorial.portrait.format': 'Format 9:12 (vertical)',
      'request.tutorial.badge': 'Badge Studio',
      'request.tutorial.rating': 'Note du contenu',
      'request.tutorial.landscape': 'Image Fiche',
      'request.tutorial.landscape.format': 'Format 16:9 (paysage)',
      'request.tutorial.landscape.note': 'Cette image s\'affiche sur la page détaillée du contenu',
      'request.tutorial.tips': '💡 Conseils pour vos images',
      'request.tutorial.tip.portrait': 'Affiche Portrait (9:12) - Utilisée sur les cartes de la page d\'accueil. Taille recommandée : 540x720px minimum',
      'request.tutorial.tip.landscape': 'Image Fiche (16:9) - Affichée sur la page de détail du contenu. Taille recommandée : 1920x1080px',
      'request.tutorial.tip.badge': 'Badge Studio - Logo de votre chaîne/studio pour différencier les créateurs. Fond transparent recommandé (.png). Taille : 200x80px',
      'request.tutorial.tip.formats': 'Formats acceptés : JPG, PNG, WebP. Poids max : 10MB par image',
      'request.tutorial.prev': '← Précédent',
      'request.tutorial.next': 'Suivant →',
      
      // Form section
      'request.form.title': '🎬 Informations du contenu',
      'request.form.title.field': 'Titre',
      'request.form.type': 'Type',
      'request.form.type.film': 'Film',
      'request.form.type.series': 'Série',
      'request.form.type.trailer': 'Trailer',
      'request.form.genre': 'Genre',
      'request.form.description': 'Description',
      'request.form.description.placeholder': 'Décrivez le contenu...',
      'request.form.portrait': 'Affiche (format 9/12)',
      'request.form.landscape': 'Image fiche (paysage 16/9)',
      'request.form.badge': 'Badge studio (image)',
      'request.form.badge.info': '💡 Votre dernier badge studio est automatiquement réutilisé',
      'request.form.upload': 'Importer image',
      'request.form.clear': 'Effacer',
      'request.form.actors': 'Acteurs & Doubleurs',
      'request.form.actor.name': 'Nom de l\'acteur',
      'request.form.actor.role': 'Rôle',
      'request.form.actor.add': 'Ajouter',
      'request.form.watchurl': 'Lien de visionnage',
      'request.form.youtube': 'Lien YouTube',
      'request.form.episodes': 'Épisodes',
      'request.form.episode.title': 'Titre de l\'épisode',
      'request.form.episode.url': 'Lien YouTube de l\'épisode',
      'request.form.episode.add': 'Ajouter',
      'request.form.prev': '← Précédent',
      'request.form.submit': '📤 Envoyer la demande',
      'request.form.reset': '🔄 Réinitialiser',
      
      // Rate limit
      'request.limit.title': '⏳ Limite atteinte',
      'request.limit.message': 'Vous avez déjà soumis une demande aujourd\'hui. Vous pourrez soumettre une nouvelle demande demain.',
      
      // Success
      'request.success.title': '✅ Demande soumise avec succès !',
      'request.success.message': 'Votre demande a été envoyée aux administrateurs. Vous recevrez une réponse prochainement.',
      'request.success.cooldown': 'Vous pourrez soumettre une nouvelle demande dans 24 heures.',
      
      // History
      'request.history.title': '📜 Historique de mes demandes',
      
      // Video verification
      'video.verify.success': '✅ Vidéo vérifiée : "{title}"',
      'video.verify.not.owner': '❌ Cette vidéo appartient à "{channel}". Vous ne pouvez soumettre que vos propres vidéos YouTube.',
      'video.verify.not.found': '❌ Vidéo introuvable ou privée. Vérifiez que le lien est correct et que la vidéo est publique.',
      'video.verify.expired': '❌ Session expirée. Veuillez vous reconnecter.',
      'video.verify.forbidden': '❌ Accès refusé. Vérifiez les permissions YouTube.',
      'video.verify.error': '❌ Erreur lors de la vérification de la vidéo',
      'video.verify.invalid.url': '❌ URL YouTube invalide',
      'video.verify.auth.required': '❌ Vous devez être connecté pour vérifier la vidéo',
      'video.verify.auth.missing': '❌ Système d\'authentification non chargé',
      'video.verify.error.retry': '❌ Erreur lors de la vérification. Veuillez réessayer.',

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
      'home.continue': 'Continue watching',
      'home.favorites': '❤️ Favorites',
      'home.top.rated': '⭐ Top rated',
      'home.discord.title.line1': 'Questions? An issue?',
      'home.discord.title.line2': 'Join us',
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
      
      // Request page (request.html)
      'request.title': '📽️ Submit a film',
      'request.logout': '🚪 Logout',
      'request.back': '← Back to home',
      
      // Stepper
      'request.step.terms': 'Terms',
      'request.step.auth': 'Login',
      'request.step.guide': 'Guide',
      'request.step.form': 'Form',
      
      // Pending request
      'request.pending.title': '📋 Pending request',
      'request.pending.message': 'You have a request awaiting validation by administrators.',
      'request.pending.cancel': 'Cancel my request',
      'request.pending.new': 'New request',
      
      // Terms section
      'request.terms.title': '📜 Terms of use',
      'request.terms.intro': 'Before submitting your request, please read carefully and comply with the following conditions:',
      'request.terms.complete': '✅ Complete all fields',
      'request.terms.complete.desc': 'Make sure to fill out all required form fields with accurate and complete information.',
      'request.terms.notroll': '🚫 No trolling',
      'request.terms.notroll.desc': 'Fanciful, offensive or non-serious requests will be automatically rejected and may result in a ban.',
      'request.terms.filmsonly': '🎥 Films only',
      'request.terms.filmsonly.desc': 'This platform is dedicated to FILMS. Do not submit short videos, sketches, vlogs or other non-cinematic content.',
      'request.terms.ratelimit': '⏱️ One request per day',
      'request.terms.ratelimit.desc': 'You are limited to one request per 24-hour period. You can cancel your current request to submit a new one.',
      'request.terms.accept': 'I have read and accept the terms of use above',
      'request.terms.error': '⚠️ You must accept the terms of use to submit your request.',
      'request.terms.button': 'I accept →',
      
      // Auth section
      'request.auth.title': '🔐 Login required',
      'request.auth.desc': 'To submit a film, you must log in with your Google account and verify that you own your YouTube channel.',
      'request.auth.google': 'Sign in with Google',
      'request.auth.why': 'Why this login?',
      'request.auth.verify': '✅ Verify that you own the YouTube channel',
      'request.auth.prevent': '✅ Prevent fraudulent submissions',
      'request.auth.protect': '✅ Protect content creators',
      'request.auth.associate': '✅ Associate your requests with your account',
      'request.auth.footer': 'By logging in, you agree that we access your YouTube channel information to verify your ownership.',
      'request.auth.privacy': 'View our privacy policy',
      'request.auth.prev': '← Back',
      'request.auth.next': 'Next →',
      
      // Tutorial section
      'request.tutorial.title': '📚 Visual image guide',
      'request.tutorial.intro': 'Here is an example film card to help you understand the positioning of the different images:',
      'request.tutorial.portrait': 'Portrait Poster',
      'request.tutorial.portrait.format': '9:12 format (vertical)',
      'request.tutorial.badge': 'Studio Badge',
      'request.tutorial.rating': 'Content rating',
      'request.tutorial.landscape': 'Details Image',
      'request.tutorial.landscape.format': '16:9 format (landscape)',
      'request.tutorial.landscape.note': 'This image is displayed on the content details page',
      'request.tutorial.tips': '💡 Tips for your images',
      'request.tutorial.tip.portrait': 'Portrait Poster (9:12) - Used on homepage cards. Recommended size: 540x720px minimum',
      'request.tutorial.tip.landscape': 'Details Image (16:9) - Displayed on content detail page. Recommended size: 1920x1080px',
      'request.tutorial.tip.badge': 'Studio Badge - Your channel/studio logo to differentiate creators. Transparent background recommended (.png). Size: 200x80px',
      'request.tutorial.tip.formats': 'Accepted formats: JPG, PNG, WebP. Max size: 10MB per image',
      'request.tutorial.prev': '← Previous',
      'request.tutorial.next': 'Next →',
      
      // Form section
      'request.form.title': '🎬 Content information',
      'request.form.title.field': 'Title',
      'request.form.type': 'Type',
      'request.form.type.film': 'Movie',
      'request.form.type.series': 'Series',
      'request.form.type.trailer': 'Trailer',
      'request.form.genre': 'Genre',
      'request.form.description': 'Description',
      'request.form.description.placeholder': 'Describe the content...',
      'request.form.portrait': 'Poster (9/12 format)',
      'request.form.landscape': 'Details image (landscape 16/9)',
      'request.form.badge': 'Studio badge (image)',
      'request.form.badge.info': '💡 Your last studio badge is automatically reused',
      'request.form.upload': 'Upload image',
      'request.form.clear': 'Clear',
      'request.form.actors': 'Actors & Voice actors',
      'request.form.actor.name': 'Actor name',
      'request.form.actor.role': 'Role',
      'request.form.actor.add': 'Add',
      'request.form.watchurl': 'Watch link',
      'request.form.youtube': 'YouTube link',
      'request.form.episodes': 'Episodes',
      'request.form.episode.title': 'Episode title',
      'request.form.episode.url': 'Episode YouTube link',
      'request.form.episode.add': 'Add',
      'request.form.prev': '← Previous',
      'request.form.submit': '📤 Send request',
      'request.form.reset': '🔄 Reset',
      
      // Rate limit
      'request.limit.title': '⏳ Limit reached',
      'request.limit.message': 'You have already submitted a request today. You will be able to submit a new request tomorrow.',
      
      // Success
      'request.success.title': '✅ Request submitted successfully!',
      'request.success.message': 'Your request has been sent to administrators. You will receive a response soon.',
      'request.success.cooldown': 'You will be able to submit a new request in 24 hours.',
      
      // History
      'request.history.title': '📜 My request history',
      
      // Video verification
      'video.verify.success': '✅ Video verified: "{title}"',
      'video.verify.not.owner': '❌ This video belongs to "{channel}". You can only submit your own YouTube videos.',
      'video.verify.not.found': '❌ Video not found or private. Check that the link is correct and the video is public.',
      'video.verify.expired': '❌ Session expired. Please sign in again.',
      'video.verify.forbidden': '❌ Access denied. Check YouTube permissions.',
      'video.verify.error': '❌ Error verifying video',
      'video.verify.invalid.url': '❌ Invalid YouTube URL',
      'video.verify.auth.required': '❌ You must be signed in to verify the video',
      'video.verify.auth.missing': '❌ Authentication system not loaded',
      'video.verify.error.retry': '❌ Error during verification. Please try again.',

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
    
    // Dispatcher un événement pour indiquer que i18n est prêt
    document.dispatchEvent(new CustomEvent('i18nReady', { detail: { language: currentLang } }));
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
