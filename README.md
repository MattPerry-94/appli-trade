# Boussole

Tableau de bord des marchés : bourses d'Europe, des États-Unis et d'Asie-Pacifique, actions, cryptomonnaies, devises et matières premières, avec des tendances calculées et expliquées.

Le site est **entièrement gratuit** : aucune clé d'API n'est obligatoire et il n'y a pas de compte utilisateur (favoris, portefeuille et alertes sont enregistrés dans le navigateur, avec sauvegarde possible dans un fichier). Il s'installe aussi comme une application sur téléphone.

## Pages

| Page | Contenu |
|---|---|
| `/` | Vue d'ensemble : résumé du jour rédigé automatiquement, indices par région, crypto, plus fortes variations, tendances marquées, devises, matières premières, actualités, agenda |
| `/marches` | Tous les indices (Europe, États-Unis, Asie-Pacifique), devises, matières premières, taux, VIX et indicateurs économiques de la zone euro (BCE) |
| `/actions` | Filtre de 125 grandes valeurs (région, secteur, rendement du dividende, tri sur chaque colonne) |
| `/actions/carte` | Carte des secteurs : taille = capitalisation, couleur = variation du jour ou sur 1 an |
| `/etf` | 28 ETF courants : éligibilité PEA, frais, performance sur 5 ans, risque |
| `/crypto` | Top 100 des cryptomonnaies en euros, part du bitcoin, indice peur / avidité |
| `/actif/[symbole]` | Fiche détaillée : graphique interactif, score de tendance expliqué, fiabilité passée du score, fourchettes de prix probables, saisonnalité, dividendes, analystes, actualités, alerte de prix |
| `/crypto/[id]` | Fiche détaillée d'une crypto (mêmes analyses) |
| `/comparer` | Jusqu'à 5 actifs sur une base 100 (performance, volatilité, pire baisse) |
| `/portefeuille` | Positions, valeur en euros, plus-values, répartition par classe, zone et devise |
| `/actualites` | Fil d'actualités de médias français et internationaux |
| `/calendrier` | Réunions des banques centrales, publications de résultats, dividendes à venir |
| `/favoris` | Vos actifs suivis et vos alertes de prix |
| `/methode` | Explication du calcul des tendances, test de fiabilité sur 10 ans et limites |

## Sources de données (sans clé)

- **Yahoo Finance** (bibliothèque `yahoo-finance2`) : cours, historiques, fondamentaux, avis d'analystes, dates de résultats
- **CoinGecko** : cryptomonnaies (une clé « Demo » gratuite est facultative, voir `.env.example`)
- **Banque centrale européenne** (portail de données) : inflation, taux, chômage, croissance
- **alternative.me** : indice peur / avidité
- **Flux RSS** : Investing.com, Le Figaro Bourse, La Tribune, Cryptoast, Journal du Coin, Cointelegraph, CoinDesk, CNBC, MarketWatch, Google Actualités
- **Calendrier des banques centrales** : saisi à la main dans `src/lib/calendar.ts` d'après les sites officiels (à compléter chaque année)

## Développement

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # tests automatiques (calculs, portefeuille, formats…)
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
    backtest.ts   test rétrospectif du score
    dividends.ts  synthèse des dividendes
    portfolio.ts  calculs du portefeuille
    ecb.ts        indicateurs économiques de la BCE
    treemap.ts    disposition de la carte des secteurs
    indicators.ts moyennes mobiles, RSI, MACD, volatilité…
    summary.ts    résumé du jour rédigé automatiquement
    universe.ts   liste des indices, actions, ETF, devises et matières premières suivis
    calendar.ts   dates des banques centrales
```

Pour suivre d'autres actions ou ETF, ajoutez-les dans `STOCKS` ou `ETFS` (`src/lib/universe.ts`) avec leur symbole Yahoo Finance. Toute autre valeur reste accessible par la recherche.

## Entretien

- **Calendrier des banques centrales** : à compléter chaque année dans `src/lib/calendar.ts` (un avertissement s'affiche sur la page Calendrier 90 jours avant la dernière date saisie).
- **Séries de la BCE** : si une série n'est plus mise à jour (changement de code, comme le passage de « ICP » à « HICP » en 2026), la page Marchés l'indique en rouge ; corriger la clé dans `src/lib/ecb.ts`.
- **Alertes de prix** : vérifiées toutes les 2 minutes tant qu'un onglet est ouvert (pas de serveur ni de compte).

## Avertissement

Les informations affichées ne constituent pas un conseil en investissement. Les cours peuvent être différés.
