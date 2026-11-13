import type { Metadata } from "next";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Méthode" };

const SIGNALS = [
  ["Tendance de fond", "2", "Position du cours par rapport à sa moyenne mobile 200 jours et pente de cette moyenne sur un mois."],
  ["Moyennes 50 / 200 jours", "1", "Configuration des deux moyennes ; un croisement récent (« doré » ou « de la mort ») pèse davantage."],
  ["Dynamique sur 12 mois", "1,5", "Performance entre il y a 12 mois et il y a 1 mois. L’effet momentum est l’un des facteurs les mieux documentés par la recherche."],
  ["Dynamique sur 3 mois", "1", "Performance récente."],
  ["RSI 14 jours", "1", "Repère les excès : au-delà de 70 l’actif est « suracheté », en dessous de 30 « survendu »."],
  ["MACD", "0,75", "Accélération ou essoufflement du mouvement en cours."],
  ["Saisonnalité", "0,75", "Comportement historique de l’actif pendant le mois en cours (nécessite au moins 6 années de recul)."],
  ["Consensus des analystes", "1,25", "Actions uniquement : potentiel vers l’objectif de cours moyen et recommandation moyenne."],
  ["Valorisation", "0,5", "Actions uniquement : PER actuel comparé au PER attendu (croissance des bénéfices anticipée)."],
  ["Peur / avidité", "0,5", "Crypto uniquement, lecture contrariante : l’euphorie précède souvent les corrections, la peur offre souvent de meilleurs points d’entrée."],
];

export default function MethodePage() {
  return (
    <div className="max-w-3xl">
      <PageTitle title="Méthode" subtitle="Comment Boussole calcule ses tendances, et ce qu’il faut (et ne faut pas) en attendre." />

      <div className="space-y-10 text-[1.02rem] leading-relaxed text-ink-2">
        <section>
          <h2 className="font-serif text-2xl font-semibold text-ink mb-3">Le principe</h2>
          <p>
            Personne ne peut prédire le cours d’un actif. Boussole ne fait donc pas de « prédiction » au sens strict : elle
            rassemble des <strong className="text-ink">faits mesurables</strong>, chacun affiché avec son explication, et les
            résume en un score de 0 à 100. Au-dessus de 55 la tendance est jugée plutôt haussière, en dessous de 45 plutôt
            baissière.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-semibold text-ink mb-3">Les signaux et leur poids</h2>
          <p className="mb-4">
            Chaque signal reçoit une note de −2 (très défavorable) à +2 (très favorable). Le score est la moyenne pondérée
            de ces notes, ramenée sur 100. Les seuils sont adaptés à la volatilité habituelle de chaque type d’actif (une
            crypto bouge en moyenne deux fois plus qu’une action, une devise beaucoup moins).
          </p>
          <div className="scroll-x">
            <table className="data-table text-sm">
              <thead>
                <tr>
                  <th>Signal</th>
                  <th>Poids</th>
                  <th className="!text-left">Ce qu’il mesure</th>
                </tr>
              </thead>
              <tbody>
                {SIGNALS.map(([n, w, d]) => (
                  <tr key={n}>
                    <td className="font-medium text-ink align-top">{n}</td>
                    <td className="align-top">{w}</td>
                    <td className="!text-left !whitespace-normal text-ink-2">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4">
            Dans les listes (actions, marchés, crypto), un <strong className="text-ink">score rapide</strong> est calculé à
            partir des seules données de cotation (moyennes 50 et 200 jours, variation sur 1 an, avis moyen des analystes ;
            variations 7 jours, 30 jours et 1 an pour les cryptos). Le score complet de la fiche peut donc légèrement
            différer.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-semibold text-ink mb-3">Les fourchettes de prix</h2>
          <p>
            Le graphique en éventail repose sur un modèle statistique standard (log-normal) : il utilise la volatilité réelle
            des deux dernières années pour estimer jusqu’où le prix peut raisonnablement aller. La dérive retenue est la
            moitié de la tendance historique, plafonnée, pour ne pas extrapoler un passé exceptionnel. La zone foncée
            contient le prix dans 1 cas sur 2, la zone claire dans 9 cas sur 10, <em>si</em> l’avenir ressemble au passé.
          </p>
          <p className="mt-3">
            À côté, la colonne « historique » est purement factuelle : sur tout l’historique mensuel disponible, quelle part
            des périodes de 1, 3, 6 ou 12 mois s’est terminée en hausse.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-semibold text-ink mb-3">Les limites</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Les performances passées ne préjugent pas des performances futures. Un krach, une annonce ou une décision politique ne sont dans aucun indicateur.</li>
            <li>Les cours peuvent être différés de 15 à 20 minutes selon les places boursières.</li>
            <li>Les données proviennent de services gratuits (Yahoo Finance, CoinGecko) et peuvent ponctuellement manquer ou être erronées.</li>
            <li>Boussole est un outil d’information, pas un conseiller en investissement. Ne placez jamais d’argent dont vous pourriez avoir besoin, et diversifiez.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-semibold text-ink mb-3">Sources</h2>
          <p>
            Cours, historiques, fondamentaux et avis d’analystes : Yahoo Finance. Cryptomonnaies : CoinGecko. Indice peur /
            avidité : alternative.me. Actualités : flux publics d’Investing.com, Le Figaro, La Tribune, Cryptoast, Journal du
            Coin, Cointelegraph, CoinDesk, CNBC, MarketWatch et Google Actualités. Calendrier des banques centrales : sites
            officiels de la Fed, de la BCE, de la Banque du Japon et de la Banque d’Angleterre.
          </p>
        </section>
      </div>
    </div>
  );
}
