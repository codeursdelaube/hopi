import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description: "Les règles d'utilisation de Hopi, l'appli pour apprendre l'anglais de ton métier.",
};

export default function CguPage() {
  return (
    <LegalPage title="Conditions générales d'utilisation">
      <p>
        Les présentes conditions générales d&apos;utilisation (« CGU ») encadrent l&apos;accès et
        l&apos;utilisation de Hopi, application web d&apos;apprentissage de l&apos;anglais
        professionnel accessible à l&apos;adresse hopigame.vercel.app (« l&apos;Application »). En
        créant un compte ou en utilisant l&apos;Application, tu acceptes ces CGU.
      </p>

      <h2>1. Éditeur</h2>
      <p>
        L&apos;Application est éditée par {LEGAL.publisher}, {LEGAL.location}. Contact :{" "}
        {LEGAL.contactEmail}.
      </p>

      <h2>2. Objet du service</h2>
      <p>
        Hopi propose des leçons courtes et des exercices pour apprendre le vocabulaire anglais de
        plusieurs filières (informatique, droit, communication, comptabilité et gestion, économie),
        avec des éléments de jeu : points d&apos;expérience (XP), séries, niveaux, badges,
        classement, mot du jour, révisions et rappels.
      </p>

      <h2>3. Accès et compte</h2>
      <ul>
        <li>
          L&apos;Application est aujourd&apos;hui <strong>gratuite</strong>. Une offre payante («
          Premium ») pourra être proposée plus tard ; ses conditions seront alors présentées avant
          toute souscription, et rien ne sera facturé sans ton accord explicite.
        </li>
        <li>
          La création d&apos;un compte se fait avec un compte Google. Tu dois avoir au moins{" "}
          {LEGAL.minimumAge} ans, ou l&apos;accord d&apos;un parent ou tuteur.
        </li>
        <li>
          Tu es responsable de l&apos;accès à ton compte Google et des actions réalisées depuis ton
          compte Hopi.
        </li>
        <li>
          Tu peux supprimer ton compte à tout moment depuis{" "}
          <strong>Réglages → Supprimer mon compte</strong> ; toutes tes données d&apos;apprentissage
          sont alors effacées.
        </li>
      </ul>

      <h2>4. Règles d&apos;utilisation</h2>
      <p>En utilisant Hopi, tu t&apos;engages à ne pas :</p>
      <ul>
        <li>
          utiliser un nom affiché injurieux, discriminatoire, trompeur ou qui usurpe l&apos;identité
          d&apos;autrui ;
        </li>
        <li>
          tricher ou tenter de fausser les XP, les séries ou le classement (scripts, envoi de
          fausses réponses, exploitation d&apos;une faille) ;
        </li>
        <li>
          perturber le fonctionnement de l&apos;Application ou tenter d&apos;accéder aux données
          d&apos;autres utilisateurs ;
        </li>
        <li>copier ou revendre le contenu pédagogique de Hopi.</li>
      </ul>
      <p>
        En cas de non-respect, l&apos;éditeur peut modifier un nom affiché, remettre à zéro des
        points obtenus de façon abusive, ou suspendre le compte concerné.
      </p>

      <h2>5. Classement et visibilité</h2>
      <p>
        Le classement de la semaine affiche aux autres utilisateurs ton <strong>nom affiché</strong>
        , ta <strong>photo de profil</strong> et tes <strong>XP de la semaine</strong>. Ton adresse
        e-mail n&apos;est jamais affichée. Tu peux changer ton nom affiché dans les Réglages.
      </p>

      <h2>6. Contenu pédagogique</h2>
      <p>
        Les leçons, termes, explications, exercices et la mascotte Hopi sont protégés par le droit
        d&apos;auteur et appartiennent à l&apos;éditeur. Ils sont mis à ta disposition pour ton
        usage personnel d&apos;apprentissage. Le contenu est préparé avec soin, mais il peut
        contenir des erreurs ; il ne remplace pas un avis professionnel (juridique, comptable,
        financier…). Tu peux signaler une erreur à {LEGAL.contactEmail}.
      </p>

      <h2>7. Disponibilité</h2>
      <p>
        L&apos;éditeur s&apos;efforce de rendre l&apos;Application disponible en permanence, sans
        pouvoir le garantir (maintenance, panne d&apos;un prestataire, problème de réseau). Le
        contenu et les fonctionnalités peuvent évoluer, notamment grâce aux mises à jour proposées
        dans l&apos;Application.
      </p>

      <h2>8. Notifications</h2>
      <p>
        Les rappels (révisions, mot du jour) ne sont envoyés que si tu les as activés. Tu choisis
        leurs heures et tu peux les désactiver à tout moment dans les Réglages.
      </p>

      <h2>9. Responsabilité</h2>
      <p>
        L&apos;Application est fournie « en l&apos;état ». Dans les limites permises par la loi,
        l&apos;éditeur ne peut être tenu responsable des dommages indirects liés à son utilisation,
        ni de l&apos;usage que tu fais des connaissances acquises.
      </p>

      <h2>10. Données personnelles</h2>
      <p>
        Le traitement de tes données est décrit dans la{" "}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>11. Modification des CGU</h2>
      <p>
        Ces CGU peuvent être modifiées. En cas de changement important, tu en seras informé dans
        l&apos;Application. Continuer à utiliser Hopi après cette information vaut acceptation des
        nouvelles CGU.
      </p>

      <h2>12. Droit applicable</h2>
      <p>
        Les présentes CGU sont soumises au droit togolais. En cas de litige, une solution amiable
        sera recherchée en priorité ; à défaut, les tribunaux compétents de Lomé seront saisis, sous
        réserve des règles impératives protégeant le consommateur.
      </p>
    </LegalPage>
  );
}
