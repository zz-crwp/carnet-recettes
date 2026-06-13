# Mon Carnet de Recettes 🍞

Application personnelle (PWA) de carnet de recettes — pains artisanaux & cuisine du monde.
Mono-utilisateur, hors-ligne d'abord, pensée pour l'iPhone (installable depuis Safari), avec
synchronisation via un **GitHub Gist** secret.

- **Stack** : Vite + TypeScript vanilla (aucun framework, ~70 Ko gzip).
- **Données locales** : IndexedDB (source de vérité, marche 100 % hors-ligne).
- **Sync** : GitHub Gist (`recipes.json` + `photos.json`), fusion granulaire sans écrasement.
- **~106 recettes** préchargées au premier lancement.

---

## 1. Déploiement sur GitHub Pages

1. Crée un dépôt GitHub et pousse ce dossier dessus (branche `main`).
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
3. À chaque `push` sur `main`, le workflow `.github/workflows/deploy.yml` compile et publie.
   L'URL est `https://<ton-pseudo>.github.io/<nom-du-repo>/`.

> La base est relative (`./`), l'app fonctionne donc quel que soit le sous-chemin.

### En local

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # génère dist/
npm run preview   # sert dist/ pour vérifier la PWA
```

---

## 2. Configurer la synchronisation (GitHub Gist)

La sync est **optionnelle** : sans elle, tout reste sur l'appareil. Pour retrouver tes recettes
sur plusieurs appareils :

### a) Créer le Gist

1. Va sur <https://gist.github.com>.
2. Nom de fichier : `recipes.json` — contenu : `{}` (un objet vide).
3. Choisis **« Create secret gist »**.
4. Dans l'URL du gist (`https://gist.github.com/<pseudo>/XXXXXXXX`), copie la partie
   `XXXXXXXX` : c'est l'**ID du Gist**.

### b) Créer le token

> ⚠️ Les tokens *fine-grained* ne gèrent **pas** les gists. Il faut un token **classique**.

1. <https://github.com/settings/tokens> → **Generate new token → classic**.
2. Coche **uniquement** la case **`gist`**.
3. Génère et copie le token (`ghp_…`). Il ne sera plus affiché ensuite.

### c) Renseigner dans l'app

Onglet **Plus → Réglages & synchronisation** : colle le token et l'ID du gist,
puis **Tester**, enfin **Synchroniser**.

- Le token reste sur l'appareil (localStorage), il n'est jamais envoyé ailleurs qu'à GitHub.
- Chaque sync crée une révision du gist → **historique et retour arrière gratuits** côté GitHub.
- La fusion se fait par `updatedAt`, avec tombstones : aucune suppression ni écrasement accidentel.

---

## 3. Installer sur iPhone

Dans Safari : **Partager → Sur l'écran d'accueil**. L'app s'ouvre en plein écran (standalone),
fonctionne hors-ligne, et garde l'écran allumé en *Mode cuisine*.

---

## Fonctionnalités

Recherche par ingrédient · ajustement de **n'importe quelle quantité** (tout se recale,
portions et autres ingrédients compris) · pourcentages du boulanger en direct ·
convertisseur levure fraîche↔sèche · minuteurs multiples persistants (pastille flottante,
survivent au passage en arrière-plan) · mode cuisine plein écran anti-veille · planning
hebdo avec totaux macros/jour · liste de courses groupée par rayon avec agrégation des
doublons · journal de cuisson · mode frigo · « Je cuisine quoi ? » · photos compressées ·
import JSON & TheMealDB (conversion impérial→métrique) · export/import · thème clair/auto/sombre.

---

## Structure

```
src/
  main.ts            point d'entrée, routes, onglets, SW
  router.ts          routeur hash + View Transitions
  styles.css         design system (clair/sombre)
  data/seed-recipes.json
  lib/   types, utils, db (IndexedDB), store, gist (sync),
         timers, recipes-logic (scaling/%/rayons), mealdb, ui
  views/ home, recipes, recipe, cook, edit, planner,
         courses, plus, journal, frigo, settings
```
