# Plan: OCR Semi-Automatique pour le Mode Professeur

## Objectif
Ajouter un OCR semi-automatique dans le mode professeur : quand le prof upload une photo d'un relevé de notes, le site extrait les noms/prénoms et notes via Tesseract.js, affiche les résultats dans un tableau de vérification obligatoire, puis peuple la table des élèves avec les données corrigées.

---

## Architecture Technique

### 1. Dépendance : Tesseract.js (CDN)
- **Pourquoi** : OCR 100% client-side via WebAssembly, supporte le français, pas de serveur nécessaire
- **URL** : `https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js`
- **Chargement** : Lazy-load uniquement quand l'utilisateur clique sur "Scanner le relevé" (pas au chargement de la page)
- **Langues** : `fra` (français) pour les noms + `eng` pour les chiffres
- **Workers** : 1 worker suffisant pour de l'usage ponctuel

### 2. Fichier principal : `ocr.js` (nouveau)
Module IIFE séparé comme `prof.js`, chargé après `prof.js` dans `index.html`.

---

## Flux Utilisateur (UX Flow)

```
1. Prof sélectionne classe, semestre, matière, coefficient, composition
2. Prof upload une photo du relevé (dropzone existante)
   └─ L'aperçu s'affiche (comme avant)
   └─ NOUVEAU: Un bouton "Scanner le relevé (OCR)" apparaît sous l'aperçu
3. Clique sur "Scanner le relevé"
   └─ Affichage d'un modal de progression (barre de progression Tesseract)
   └─ Prétraitement image (contraste, binarisation)
   └─ OCR en cours...
4. Résultat OCR : un tableau de VÉRIFICATION s'affiche
   └─ Chaque ligne = Nom | Prénom | D1 | D2 | [Compo] | Confiance
   └─ Les cellules sont ÉDITABLES (le prof corrige les erreurs OCR)
   └─ Les cellules avec confiance < seuil sont surlignées en jaune/orange
   └─ Boutons : "Appliquer au tableau" | "Annuler" | "Ré-Scanner"
5. Clique sur "Appliquer"
   └─ Les données peuplent la table `rows` existante
   └─ Les moyennes se calculent automatiquement
   └─ Le prof peut encore modifier dans la table principale
```

---

## Détails d'Implémentation

### Fichier : `index.html`

#### Ajout CDN Tesseract.js (lazy)
```html
<!-- Après prof.js, avant le script inline -->
<script src="ocr.js"></script>
```

#### Modification de la dropzone
- Ajouter un bouton "Scanner le relevé" qui apparaît après upload d'une image
- Le bouton est masqué pour les PDF (OCR sur PDF nécessiterait une conversion canvas complexe, on se concentre sur les images)

#### Modal de vérification OCR
Nouveau `<div id="prof-ocr-modal">` ajouté dans `#prof-screen` :
- Overlay semi-transparent
- Card centrée avec :
  - En-tête : "Vérifier les données extraites"
  - Tableau éditable avec les données OCR
  - Indicateur de confiance par cellule
  - Boutons d'action

### Fichier : `ocr.js`

#### Structure
```javascript
(function() {
  'use strict';
  
  // === Configuration ===
  const OCR_CONFIDENCE_THRESHOLD = 0.60;  // en dessous = surlignage warning
  const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  
  // === État ===
  let ocrWorker = null;
  let ocrResults = [];  // résultats de la dernière analyse
  
  // === Chargement lazy de Tesseract.js ===
  function loadTesseract() { ... }
  
  // === Prétraitement image ===
  function preprocessImage(imageSource) { ... }
  // - Crée un canvas
  // - Applique contraste +1.5x
  // - Binarisation (seuil adaptatif)
  // - Nettoyage du bruit (filtre médian léger)
  // - Retourne un Blob ou ImageData
  
  // === OCR ===
  async function runOCR(imageBlob) { ... }
  // - Charge Tesseract.js si pas encore chargé
  // - Lance worker avec langue 'fra+eng'
  // - Retourne les words avec bounding boxes et confidence
  
  // === Parsing intelligent du texte OCR ===
  function parseOCRText(ocrResult) { ... }
  // Stratégie :
  // 1. Trier les mots par position Y (lignes), puis X (colonnes)
  // 2. Détecter les lignes de données (y similaire)
  // 3. Pour chaque ligne, extraire : nom, prénom, notes
  // 4. Les notes sont les valeurs numériques (pattern: /^\d{1,2}[.,]?\d{0,2}$/)
  // 5. Le nom/prénom sont les textes non-numériques en début de ligne
  // 6. Retourne un tableau de {nom, prenom, d1, d2, compo, confidence}
  
  // === Parsing alternatif : texte brut ===
  function parseOCRTextFallback(rawText) { ... }
  // Si les bounding boxes ne suffisent pas, parser le texte brut
  // Lignes séparées par \n, colonnes par tab/multi-espaces
  
  // === UI Modal de vérification ===
  function showVerificationModal(results) { ... }
  function hideVerificationModal() { ... }
  function renderVerificationTable(results) { ... }
  // Tableau éditable avec :
  // - Input par cellule
  // - Classe CSS selon confiance (vert/orange/rouge)
  // - Bouton supprimer ligne
  // - Bouton ajouter ligne
  
  // === Application des résultats ===
  function applyOCRResults(verifiedRows) { ... }
  // Convertit les résultats vérifiés en format rows existant
  // Appelle la fonction d'ajout de rows de prof.js
  
  // === Intégration avec prof.js ===
  // Expose une fonction globale pour que prof.js puisse l'appeler
  window.startOCRScan = function(imageFile) { ... };
  
  // === Initialisation ===
  // Intercepte l'upload de fichier dans la dropzone
  // Ajoute le bouton "Scanner" quand c'est une image
})();
```

### Fichier : `styles.css`

#### Styles OCR
```css
/* Modal de vérification OCR */
.prof-ocr-modal { ... }
.prof-ocr-modal-card { ... }
.prof-ocr-progress { ... }         /* Barre de progression */
.prof-ocr-progress-bar { ... }     /* Barre animée */
.prof-ocr-table { ... }            /* Tableau de vérification */
.prof-ocr-cell-low { ... }         /* Confiance faible = fond orange */
.prof-ocr-cell-ok { ... }          /* Confiance OK = fond vert clair */
.prof-ocr-btn-scan { ... }         /* Bouton "Scanner le relevé" */
```

### Fichier : `sw.js`

#### Ajout au pré-cache
```javascript
// Pas de fichier à precacher pour Tesseract.js (CDN, chargé à la demande)
// Mais on cache le worker Tesseract après première utilisation
```

---

## Stratégie de Parsing OCR

### Défis spécifiques aux relevés de notes manuscrits au Sénégal
1. **Écriture manuscrite** : variable, parfois difficile à lire
2. **Format du tableau** : généralement colonnes Nom | Prénom | D1 | D2 | [Compo]
3. **Séparateurs** : traits de tableau, espaces, points-virgules
4. **Notes** : format français (virgule ou point), valeurs 0-20
5. **Noms** : noms sénégalais souvent longs (Diallo, Diop, Ndiaye, Fall, etc.)

### Algorithmes de détection

#### 1. Détection des lignes (groupement par Y)
```
Trier tous les mots par Y croissant
Grouper les mots avec Y ± threshold (10px) dans la même ligne
```

#### 2. Détection des colonnes (positions X)
```
Pour chaque ligne, trier les mots par X croissant
Identifier les colonnes par position X:
  - Col 1 (X < seuil1) : Nom
  - Col 2 (seuil1 < X < seuil2) : Prénom
  - Col 3+ (X > seuil2) : Notes
```

#### 3. Extraction des notes
```
Pour chaque "mot" dans la zone des notes:
  - Nettoyer : remplacer virgule par point, supprimer espaces
  - Valider : pattern /^(\d{1,2})\.?(\d{1,2})?$/
  - Si valide et valeur ≤ 20 : c'est une note
  - Sinon : ignorer ou considérer comme texte
```

#### 4. Extraction nom/prénom
```
Les deux premiers blocs de texte non-numériques dans chaque ligne
sont le nom et le prénom (dans cet ordre ou inverse)
```

#### 5. Gestion des erreurs courantes
- `O` → `0`, `l` → `1`, `S` → `5`, `B` → `8`
- `.` et `,` interchangeables dans les notes
- Noms tronqués → laisser au prof de compléter

---

## Traductions (FR + EN)

### Nouvelles clés i18n
```
fr:
  prof_ocr_scan_btn: "Scanner le relevé (OCR)"
  prof_ocr_scanning: "Analyse en cours..."
  prof_ocr_progress: "Extraction du texte... {pct}%"
  prof_ocr_verify_title: "Vérifier les données extraites"
  prof_ocr_verify_subtitle: "Corrigez les erreurs ci-dessous avant d'appliquer au tableau."
  prof_ocr_confidence: "Confiance"
  prof_ocr_apply: "Appliquer au tableau"
  prof_ocr_cancel: "Annuler"
  prof_ocr_rescan: "Ré-scanner"
  prof_ocr_add_row: "Ajouter une ligne"
  prof_ocr_remove_row: "Supprimer"
  prof_ocr_no_data: "Aucune donnée extraite. Essayez avec une photo plus nette."
  prof_ocr_error: "Erreur lors de l'analyse. Veuillez réessayer."
  prof_ocr_only_images: "Le scanner OCR fonctionne uniquement avec les photos (JPG, PNG…)."
  prof_ocr_loading_deps: "Chargement du module OCR..."

en:
  prof_ocr_scan_btn: "Scan the grade sheet (OCR)"
  prof_ocr_scanning: "Analyzing..."
  prof_ocr_progress: "Extracting text... {pct}%"
  prof_ocr_verify_title: "Verify extracted data"
  prof_ocr_verify_subtitle: "Fix any errors below before applying to the table."
  prof_ocr_confidence: "Confidence"
  prof_ocr_apply: "Apply to table"
  prof_ocr_cancel: "Cancel"
  prof_ocr_rescan: "Rescan"
  prof_ocr_add_row: "Add a row"
  prof_ocr_remove_row: "Remove"
  prof_ocr_no_data: "No data extracted. Try a clearer photo."
  prof_ocr_error: "Analysis failed. Please try again."
  prof_ocr_only_images: "OCR scanning only works with photos (JPG, PNG…)."
  prof_ocr_loading_deps: "Loading OCR module..."
```

---

## Fichiers Modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `index.html` | Modifier | Ajout `<script src="ocr.js">` + bouton scan + modal OCR |
| `ocr.js` | Créer | Module OCR complet (~400-500 lignes) |
| `prof.js` | Modifier | Exposer fonction pour peupler les rows depuis OCR |
| `script.js` | Modifier | Ajouter les traductions i18n FR + EN |
| `styles.css` | Modifier | Styles pour le modal OCR, bouton scan, barre progression |
| `sw.js` | Modifier | Incrémenter CACHE_NAME (pas de nouveau fichier à precacher) |

---

## Sécurité & Performance

- **Pas de données envoyées** : Tesseract.js tourne 100% dans le navigateur
- **Lazy loading** : Tesseract.js (~3MB WASM) n'est chargé que quand l'utilisateur clique sur "Scanner"
- **Cache CDN** : Le navigateur met en cache le script Tesseract.js
- **Worker** : Un seul worker Tesseract, créé à la demande et détruit après usage
- **Timeout** : Si OCR prend > 30s, afficher erreur et proposer réessai
- **Validation** : Toutes les notes sont validées (0-20, format .25/.50/.75) avant application

---

## Ordre de Mise en Œuvre

1. Créer `ocr.js` avec toute la logique OCR
2. Modifier `prof.js` pour exposer `window.populateProfRows(rows)`
3. Modifier `index.html` : ajouter script, bouton scan, modal OCR
4. Modifier `script.js` : ajouter traductions
5. Modifier `styles.css` : ajouter styles OCR
6. Modifier `sw.js` : incrémenter CACHE_NAME
7. Tests manuels avec photos de relevés
