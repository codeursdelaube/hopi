import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Quelles données Hopi utilise, pourquoi, et comment exercer tes droits.",
};

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité">
      <p>
        Cette politique explique quelles données personnelles Hopi collecte, pourquoi, avec qui
        elles sont partagées et quels sont tes droits. Nous collectons le strict nécessaire au
        fonctionnement de l&apos;Application. <strong>Nous ne vendons pas tes données</strong> et il
        n&apos;y a <strong>aucune publicité</strong> dans Hopi.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        {LEGAL.publisher}, {LEGAL.location}. Contact : {LEGAL.contactEmail}.
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li>
          <strong>Compte</strong> (fourni par Google à la connexion) : nom, adresse e-mail, photo de
          profil, identifiant de compte.
        </li>
        <li>
          <strong>Profil et préférences</strong> : nom affiché, filière, niveau d&apos;anglais,
          objectif quotidien, réglages des sons, des rappels (types et heures) et décalage horaire
          du téléphone.
        </li>
        <li>
          <strong>Apprentissage</strong> : leçons terminées et scores, réponses servant à calculer
          le score, mots appris et calendrier de révision, XP, séries, badges.
        </li>
        <li>
          <strong>Notifications</strong> (si tu les actives) : l&apos;adresse technique
          d&apos;abonnement de ton navigateur, qui permet de t&apos;envoyer les rappels.
        </li>
        <li>
          <strong>Données techniques</strong> : journaux de connexion et d&apos;erreurs conservés
          par nos hébergeurs pour la sécurité et le bon fonctionnement du service.
        </li>
      </ul>
      <p>Nous ne collectons pas ta localisation, tes contacts, ni le contenu de ton téléphone.</p>

      <h2>3. Pourquoi nous utilisons ces données</h2>
      <ul>
        <li>te connecter et garder ta progression d&apos;un appareil à l&apos;autre ;</li>
        <li>adapter le parcours à ta filière et à ton niveau, programmer tes révisions ;</li>
        <li>calculer XP, séries, niveaux, badges et le classement de la semaine ;</li>
        <li>t&apos;envoyer les rappels que tu as choisis, aux heures que tu as choisies ;</li>
        <li>assurer la sécurité du service et corriger les problèmes.</li>
      </ul>
      <p>
        Ces traitements reposent sur l&apos;exécution du service que tu as demandé (ton compte et
        ton apprentissage) et, pour les notifications, sur ton consentement, que tu peux retirer à
        tout moment.
      </p>

      <h2>4. Qui peut voir tes données</h2>
      <ul>
        <li>
          <strong>Les autres utilisateurs</strong> voient seulement, dans le classement, ton nom
          affiché, ta photo de profil et tes XP de la semaine.
        </li>
        <li>
          <strong>Nos prestataires techniques</strong>, qui traitent les données pour notre compte :
          Supabase (base de données et connexion), Vercel (hébergement de l&apos;Application),
          Google (connexion avec ton compte Google) et les services de notification de ton
          navigateur (Google, Apple ou Mozilla) pour acheminer les rappels.
        </li>
      </ul>
      <p>
        Certains de ces prestataires peuvent stocker des données hors du Togo ; ils appliquent des
        mesures de sécurité adaptées (chiffrement, contrôle d&apos;accès). Les données de chaque
        utilisateur sont isolées : un utilisateur ne peut jamais accéder aux données d&apos;un
        autre.
      </p>

      <h2>5. Cookies et stockage sur l&apos;appareil</h2>
      <ul>
        <li>
          <strong>Cookies de session</strong> : indispensables pour rester connecté.
        </li>
        <li>
          <strong>Cookie « tz »</strong> : ton décalage horaire, pour que ta série et ton objectif
          du jour suivent ton heure locale.
        </li>
        <li>
          <strong>Stockage local</strong> : ton choix de thème (clair/sombre) et le fait
          d&apos;avoir déjà vu la proposition d&apos;installation.
        </li>
        <li>
          <strong>Cache hors ligne</strong> : les pages récemment ouvertes, pour fonctionner avec un
          réseau faible ; il est effacé à la déconnexion.
        </li>
      </ul>
      <p>Hopi n&apos;utilise aucun cookie publicitaire ni outil de pistage tiers.</p>

      <h2>6. Durée de conservation</h2>
      <p>
        Tes données sont conservées tant que ton compte existe. Quand tu supprimes ton compte,
        toutes tes données (profil, progression, révisions, XP, badges, abonnements aux
        notifications) sont effacées immédiatement de notre base ; les sauvegardes techniques de nos
        prestataires sont écrasées dans les semaines qui suivent.
      </p>

      <h2>7. Tes droits</h2>
      <p>
        Conformément à la loi togolaise n° 2019-014 du 29 octobre 2019 relative à la protection des
        données à caractère personnel (et, si tu résides dans l&apos;Union européenne, au RGPD), tu
        disposes des droits d&apos;accès, de rectification, d&apos;effacement, d&apos;opposition et
        de portabilité de tes données.
      </p>
      <ul>
        <li>
          <strong>Rectifier</strong> : nom affiché, filière, niveau et préférences dans les
          Réglages.
        </li>
        <li>
          <strong>Effacer</strong> : Réglages → <strong>Supprimer mon compte</strong>.
        </li>
        <li>
          <strong>Accès, copie et autres demandes</strong> : écris-nous à {LEGAL.contactEmail}. Nous
          répondons dans un délai d&apos;un mois.
        </li>
      </ul>
      <p>
        Si tu estimes que tes droits ne sont pas respectés, tu peux saisir l&apos;Instance de
        Protection des Données à caractère Personnel (IPDCP) du Togo.
      </p>

      <h2>8. Sécurité</h2>
      <p>
        Les échanges sont chiffrés (HTTPS), l&apos;accès aux données est contrôlé ligne par ligne
        dans la base, et les opérations sensibles (XP, progression) sont vérifiées côté serveur.
      </p>

      <h2>9. Mineurs</h2>
      <p>
        Hopi s&apos;adresse aux personnes d&apos;au moins {LEGAL.minimumAge} ans. En dessous de cet
        âge, l&apos;accord d&apos;un parent ou tuteur est nécessaire.
      </p>

      <h2>10. Modifications</h2>
      <p>
        Cette politique peut évoluer (par exemple avec l&apos;arrivée de l&apos;offre Premium). En
        cas de changement important, tu en seras informé dans l&apos;Application. Voir aussi les{" "}
        <Link href="/cgu">conditions générales d&apos;utilisation</Link>.
      </p>
    </LegalPage>
  );
}
