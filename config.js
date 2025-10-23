/**
 * Configuration publique pour Clipsou Streaming
 * Ce fichier contient les URLs et configurations accessibles côté client
 */

window.ClipsouConfig = {
  // URL du Cloudflare Worker pour les soumissions publiques
  workerUrl: 'https://clipsou-publish.arthurcapon54.workers.dev',
  
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
