# Projet Flipbook — résumé pour reprise de session

## Dépôt
`pierreg78-maker/flipbook` — site live : pierreg78-maker.github.io/test1_cl/
Fichiers : `index.html`, `style.css`, `script.js` (vanilla JS, sans dépendances build).

## Objectif
Un outil qui part d'un PDF et permet, au choix :
1. de le transformer en flipbook interactif (feuilletage animé) ;
2. d'annoter les pages avec des formes colorées et du texte, puis de télécharger un PDF propre avec les annotations fusionnées dedans ;
3. les deux à la fois : les annotations peuvent être embarquées dans le flipbook généré/téléchargé.

## Bibliothèques utilisées (CDN, pas de build)
- **PDF.js** — lecture du PDF, rendu de chaque page en canvas haute résolution (scale 2.5) puis en dataURL PNG.
- **StPageFlip** — moteur d'animation du flipbook (a remplacé turn.js/jQuery lors d'une réécriture précédente).
- **jsPDF** (cdnjs) — génère le PDF annoté téléchargeable à partir des canvas fusionnés.
- **Google Fonts** — 10 polices chargées pour l'outil texte.

## Flux général
1. **Choisir un PDF** (bouton bleu) → PDF.js rend toutes les pages en images ; state partagé `sharedImages[]` / `sharedDims[]` (+ `sePageEls[]` initialisé en parallèle, un tableau d'éléments vide par page).
2. **Générer le flipbook** (bouton violet, apparaît après chargement) → construit le livre interactif StPageFlip. Si des annotations existent, les pages concernées sont fusionnées ("bakées") avant construction.
3. **Ajouter des formes / texte** (bouton orange, apparaît après chargement) → ouvre un éditeur plein écran, page par page (statique, sans animation), avec :
   - navigation ← → entre pages,
   - onglet **Formes** : 6 formes (cercle, carré, triangle, hexagone, étoile, flèche), palette de 8 couleurs (blanc et noir en tête) + sélecteur couleur libre,
   - onglet **Texte** : champ de saisie, 10 polices, 4 tailles, même palette de couleurs,
   - éléments déplaçables au doigt/souris, sélection → barre flottante (agrandir/réduire/tourner/supprimer),
   - **case « Bordure et ombre »** (apparaît seulement pour une forme sélectionnée) : par défaut aucune forme n'a de contour ni d'ombre ; cochée, ajoute un contour blanc + ombre portée (effet autocollant),
   - double-tap/double-clic sur un texte → modale pour éditer son contenu.
4. **Télécharger le PDF** (dans l'éditeur) → fusionne formes+texte dans chaque page via canvas puis génère un vrai PDF avec jsPDF (aucun risque de fichier corrompu).
5. **Télécharger le flipbook** (bouton vert, dans la barre de navigation une fois le livre généré) → exporte un `flipbook.html` autonome (base64 inline), qui embarque lui aussi les annotations le cas échéant.

## Modèle de données des éléments (formes/texte)
Chaque page a un tableau d'éléments. Position/taille stockées en **fractions** de la taille d'affichage de la page (`xFrac`, `yFrac`, `sizeFrac`/`fsFrac`) — indépendant de la résolution, ce qui permet de reconvertir proprement en pixels réels du PDF au moment de la fusion ("bake"), quelle que soit la page affichée à l'écran.
- Forme : `{id, type:'shape', shape, clr, xFrac, yFrac, sc, rot, sizeFrac, border}`
- Texte : `{id, type:'text', text, clr, font, fsFrac, xFrac, yFrac, sc, rot}`

## Décisions déjà prises (à ne pas redemander)
- Flipbook et annotations sont **deux fonctionnalités distinctes mais qui partagent le même PDF chargé** (pas deux imports séparés).
- Les annotations sont embarquées dans le flipbook **seulement si l'utilisateur en a ajouté** (sinon comportement inchangé, pas de recalcul inutile).
- Texte actuellement **sur une seule ligne** (pas de retour à la ligne automatique).
- Modifier police/taille/couleur d'un texte déjà posé n'est **pas encore possible** (il faut le supprimer et le recréer) — amélioration prévue plus tard.

## Style de code à respecter (cohérence avec le reste des projets Pierre)
- Vanilla JS (`var`, pas de build, pas de dépendances npm), fichiers livrés en entier et prêts à copier sur GitHub.
- Design accessible : gros boutons, contraste élevé, rien de complexe pour un public senior/accompagnant.
- Toujours fournir les fichiers complets (pas de snippets) pour les modifications importantes.

## Pistes d'amélioration en attente ("100 autres améliorations")
- Retour à la ligne automatique pour les zones de texte.
- Édition rétroactive du style (police/taille/couleur) d'un texte déjà placé.
- Autres idées à définir avec Pierre au fil des sessions.
