/**
 * Configuration publique pour Clipsou Streaming
 * Ce fichier contient les URLs et configurations accessibles côté client
 */

window.ClipsouConfig = {
  // URL du Cloudflare Worker pour les soumissions publiques
  workerUrl: 'https://clipsou-publish.arthurcapon54.workers.dev',
  
  // URLs des fichiers JSON publics (sur GitHub Pages)
  publicRequestsUrl: '/data/requests.json',
  publicApprovedUrl: '/data/approved.json',
  publicTrashUrl: '/data/trash.json',
  publicUserRequestsUrl: '/data/user-requests.json',
  
  // Configuration Cloudinary pour les uploads d'images
  cloudinary: {
    cloudName: 'dlaisw4zm',
    uploadPreset: 'dlaisw4zm_unsigned'
  },
  
  // Paramètres de rate limiting
  rateLimits: {
    submissionCooldown: 24 * 60 * 60 * 1000 // 24 heures en millisecondes
  }
};
