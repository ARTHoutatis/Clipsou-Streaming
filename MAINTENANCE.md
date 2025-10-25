# Mode Maintenance - Clipsou Streaming

## 🔧 Activation/Désactivation

### Pour activer le mode maintenance :
Le mode maintenance est **actuellement ACTIVÉ** par défaut.

### Pour désactiver le mode maintenance :
1. Ouvrir le fichier `maintenance-check.js`
2. Changer la ligne 6 :
   ```javascript
   const MAINTENANCE_ENABLED = false; // Passer de true à false
   ```
3. Sauvegarder le fichier

## 🔑 Accès Admin pendant la maintenance

Les administrateurs peuvent accéder au site même en mode maintenance s'ils :
- Sont connectés à l'interface admin (`/admin/`)
- Ont une session admin active (valide pendant 24 heures)

### Comment se connecter en tant qu'admin :
1. Aller sur `https://clipsoustreaming.com/admin/`
2. Se connecter avec le mot de passe admin
3. Retourner sur le site principal
4. ✅ Vous avez maintenant accès même en maintenance

## 📄 Fichiers concernés

### Pages protégées (redirigent vers maintenance) :
- `index.html` - Page d'accueil
- `fiche.html` - Fiches des films/séries
- `watch.html` - Lecteur vidéo
- `request.html` - Proposer un film

### Pages NON protégées (toujours accessibles) :
- `maintenance.html` - Page de maintenance
- `/admin/` - Interface d'administration

## 🎨 Personnalisation de la page de maintenance

Pour modifier le message ou le design :
1. Éditer `maintenance.html`
2. Modifier le texte dans les balises `<h1>` et `<p>`
3. Ajuster les styles CSS si nécessaire

## ⚙️ Fonctionnement technique

Le script `maintenance-check.js` :
1. Vérifie si `MAINTENANCE_ENABLED = true`
2. Vérifie si l'utilisateur est sur une page admin
3. Vérifie si l'utilisateur a une session admin active
4. Si non-admin : redirige vers `maintenance.html`
5. Si admin : permet l'accès normal

## 🚀 Déploiement

Après modification de `maintenance-check.js` :
1. Commit les changements sur Git
2. Push vers GitHub
3. Le déploiement automatique se fait via GitHub Pages ou Netlify
4. Les changements sont effectifs immédiatement
