# Boussole

Tableau de bord des marchés : bourses d'Europe, des États-Unis et d'Asie-Pacifique, actions, cryptomonnaies, devises et matières premières, avec des tendances calculées et expliquées.

Le site est **entièrement gratuit** : aucune clé d'API n'est obligatoire et il n'y a pas de compte utilisateur (les favoris sont enregistrés dans le navigateur).

## Pages

| Page | Contenu |
|---|---|
| `/` | Vue d'ensemble : résumé du jour rédigé automatiquement, indices par région, crypto, plus fortes variations, tendances marquées, devises, matières premières, actualités, agenda |
| `/marches` | Tous les indices (Europe, États-Unis, Asie-Pacifique), devises, matières premières, taux et VIX |
| `/actions` | Filtre de 125 grandes valeurs (région, secteur, tri sur chaque colonne) |
| `/crypto` | Top 100 des cryptomonnaies en euros, part du bitcoin, indice peur / avidité |
| `/actif/[symbole]` | Fiche détaillée : graphique interactif, score de tendance expliqué, fourchettes de prix probables, saisonnalité, analystes, actualités |
| `/crypto/[id]` | Fiche détaillée d'une crypto (mêmes analyses) |
| `/actualites` | Fil d'actualités de médias français et internationaux |
| `/calendrier` | Réunions des banques centrales et publications de résultats |
| `/favoris` | Vos actifs suivis |
| `/methode` | Explication du calcul des tendances et de leurs limites |

## Sources de données (sans clé)

- **Yahoo Finance** (bibliothèque `yahoo-finance2`) : cours, historiques, fondamentaux, avis d'analystes, dates de résultats
- **CoinGecko** : cryptomonnaies (une clé « Demo » gratuite est facultative, voir `.env.example`)
- **alternative.me** : indice peur / avidité
- **Flux RSS** : Investing.com, Le Figaro Bourse, La Tribune, Cryptoast, Journal du Coin, Cointelegraph, CoinDesk, CNBC, MarketWatch, Google Actualités
- **Calendrier des banques centrales** : saisi à la main dans `src/lib/calendar.ts` d'après les sites officiels (à compléter chaque année)

## Développement

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # vérification avant déploiement
```

## Déploiement sur Vercel

1. Pousser le dossier sur un dépôt GitHub (ou GitLab / Bitbucket).
2. Sur vercel.com : **Add New → Project**, importer le dépôt. Vercel détecte Next.js tout seul, aucun réglage n'est nécessaire.
3. (Facultatif) Dans **Settings → Environment Variables**, ajouter `COINGECKO_API_KEY`.
4. Déployer.

Avec la CLI à la place de GitHub : `npx vercel` depuis ce dossier (lier au compte, créer ou choisir le projet), puis `npx vercel --prod`.

## Structure

```
src/
  app/            pages et routes d'API (/api/chart, /api/search, /api/quotes, /api/coins)
  components/     interface (graphiques, tableaux, recherche, thème…)
  lib/
    yahoo.ts      accès Yahoo Finance + cache
    coingecko.ts  accès CoinGecko + indice peur / avidité
    news.ts       agrégation des flux RSS
    analysis.ts   moteur de tendance (score, projection, saisonnalité)
    indicators.ts moyennes mobiles, RSI, MACD, volatilité…
    summary.ts    résumé du jour rédigé automatiquement
    universe.ts   liste des indices, actions, devises et matières premières suivis
    calendar.ts   dates des banques centrales
```

Pour suivre d'autres actions, ajoutez-les dans `STOCKS` (`src/lib/universe.ts`) avec leur symbole Yahoo Finance. Toute autre valeur reste accessible par la recherche.

## Avertissement

Les informations affichées ne constituent pas un conseil en investissement. Les cours peuvent être différés.
