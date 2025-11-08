# 🌍 Configuration de la Traduction des Pages Légales

## ✅ Fichiers Modifiés

1. **privacy.html** - ✅ Terminé
2. **cgu.html** - ⏳ À faire
3. **mentions-legales.html** - ⏳ À faire

---

## 📋 Instructions pour cgu.html et mentions-legales.html

### **Étape 1 : Ajouter le Sélecteur de Langue**

Ajouter juste après `<body class="notranslate">` :

```html
<!-- Language Selector -->
<div style="position: fixed; top: 20px; right: 20px; z-index: 1000; display: flex; gap: 8px; background: rgba(11, 17, 23, 0.95); padding: 8px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
  <button id="lang-fr" class="lang-btn" style="padding: 6px 12px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); color: #3b82f6; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s;">FR</button>
  <button id="lang-en" class="lang-btn" style="padding: 6px 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.6); border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s;">EN</button>
</div>
```

---

### **Étape 2 : Modifier le Bouton Retour**

**Avant :**
```html
<a href="index.html" class="back-btn">
  <svg>...</svg>
  Retour à l'accueil
</a>
```

**Après :**
```html
<a href="index.html" class="back-btn">
  <svg>...</svg>
  <span data-i18n="legal.back">Retour à l'accueil</span>
</a>
```

---

### **Étape 3 : Ajouter les Attributs data-i18n aux Titres**

#### **Pour cgu.html :**
```html
<h1 data-i18n="legal.terms.title">Conditions Générales d'Utilisation</h1>
<p class="last-update" data-i18n="legal.updated">Dernière mise à jour : 2 novembre 2025</p>
```

#### **Pour mentions-legales.html :**
```html
<h1 data-i18n="legal.mentions.title">Mentions légales</h1>
<p class="last-update" data-i18n="legal.updated">Dernière mise à jour : 2 novembre 2025</p>
```

---

### **Étape 4 : Ajouter la Bannière de Notification**

Ajouter juste après le `<div class="...-header">` :

```html
<!-- Language Notice (hidden in FR, shown in EN) -->
<div id="lang-notice" style="display: none; background: rgba(59, 130, 246, 0.1); border: 2px solid rgba(59, 130, 246, 0.3); padding: 20px; margin-bottom: 32px; border-radius: 12px; text-align: center;">
  <p data-i18n="legal.content.notice" style="margin: 0; font-size: 1.05rem;">📢 Le contenu détaillé de cette page est actuellement disponible uniquement en français. Une traduction complète sera bientôt disponible.</p>
</div>
```

---

### **Étape 5 : Ajouter le Script**

Ajouter juste avant `</body>` :

```html
<script src="legal-lang-selector.js"></script>
```

---

## 📁 Fichiers Créés

### **1. i18n.js - Nouvelles clés (lignes 181-187 FR, 385-391 EN)**

**Français :**
```javascript
// Pages légales
'legal.back': 'Retour à l\'accueil',
'legal.updated': 'Dernière mise à jour : 2 novembre 2025',
'legal.privacy.title': 'Politique de confidentialité',
'legal.terms.title': 'Conditions générales d\'utilisation',
'legal.mentions.title': 'Mentions légales',
'legal.content.notice': '📢 Le contenu détaillé de cette page est actuellement disponible uniquement en français. Une traduction complète sera bientôt disponible.'
```

**Anglais :**
```javascript
// Legal pages
'legal.back': 'Back to home',
'legal.updated': 'Last updated: November 2, 2025',
'legal.privacy.title': 'Privacy Policy',
'legal.terms.title': 'Terms of Use',
'legal.mentions.title': 'Legal Notices',
'legal.content.notice': '📢 The detailed content of this page is currently available in French only. A full English translation will be available soon.'
```

---

### **2. legal-lang-selector.js - Script Réutilisable**

Ce fichier gère automatiquement :
- ✅ Le changement de langue (FR/EN)
- ✅ La mise à jour visuelle des boutons
- ✅ L'affichage/masquage de la bannière de notification
- ✅ La synchronisation avec `i18n.js`
- ✅ L'écoute de l'événement `languageChanged`

---

## 🧪 Tests à Effectuer

### **Test 1 : Chargement Initial**
1. Ouvrir `privacy.html`, `cgu.html` ou `mentions-legales.html`
2. Vérifier que le bouton FR est actif (bleu)
3. Vérifier que la bannière est **cachée**

### **Test 2 : Changement vers Anglais**
1. Cliquer sur le bouton EN
2. ✅ Le bouton EN devient bleu
3. ✅ Le titre principal se traduit
4. ✅ La date se traduit
5. ✅ Le bouton "Retour" se traduit
6. ✅ La bannière de notification **apparaît** en anglais

### **Test 3 : Retour en Français**
1. Cliquer sur le bouton FR
2. ✅ Le bouton FR devient bleu
3. ✅ Tous les éléments reviennent en français
4. ✅ La bannière **disparaît**

### **Test 4 : Persistance de la Langue**
1. Changer la langue sur une page légale
2. Naviguer vers une autre page légale
3. ✅ La langue choisie est conservée
4. Revenir à l'accueil (`index.html`)
5. ✅ La langue est conservée partout

---

## ⚠️ Note Importante

Le contenu détaillé des pages légales (Privacy Policy, Terms, Legal Notices) reste en **français uniquement** pour le moment. Seuls les éléments suivants sont traduits :

- ✅ Titre principal
- ✅ Date de mise à jour
- ✅ Bouton "Retour à l'accueil"
- ✅ Bannière de notification

Une traduction complète du contenu légal nécessiterait :
- Traduction professionnelle pour garantir la précision juridique
- ~2000-3000 mots par document
- Validation par un juriste bilingue

Pour l'instant, la bannière de notification informe les utilisateurs anglophones que le contenu complet est disponible uniquement en français.

---

## 📊 Résumé

| Fichier | Statut | Éléments Traduits |
|---------|--------|-------------------|
| privacy.html | ✅ Terminé | Titre, Date, Bouton, Bannière |
| cgu.html | ⏳ À faire | - |
| mentions-legales.html | ⏳ À faire | - |
| i18n.js | ✅ Mis à jour | +6 clés FR/EN |
| legal-lang-selector.js | ✅ Créé | Script réutilisable |

---

**Date de création :** 6 novembre 2025  
**Statut :** privacy.html terminé, 2 pages restantes  
**Prochaine étape :** Appliquer le template aux 2 autres pages
