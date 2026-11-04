/**
 * Génère la « Secret Key (for OAuth) » Apple à coller dans Supabase
 * (Authentication → Sign In / Providers → Apple). À refaire avant son expiration (6 mois).
 *
 * Usage :
 *   npm run apple:secret -- --team ABCDE12345 --key-id KEY1234567 \
 *     --services-id app.hopigame.web --p8 C:\chemin\AuthKey_KEY1234567.p8
 *
 * Le fichier .p8 est secret : ne jamais le mettre dans le dépôt (*.p8 est ignoré par git).
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { appleClientSecret } from "../src/lib/auth/apple-secret.ts";

const { values } = parseArgs({
  options: {
    team: { type: "string" },
    "key-id": { type: "string" },
    "services-id": { type: "string" },
    p8: { type: "string" },
    days: { type: "string" },
  },
});

if (!values.team || !values["key-id"] || !values["services-id"] || !values.p8) {
  console.error(
    "Paramètres manquants : --team, --key-id, --services-id et --p8 sont obligatoires.\n" +
      "Exemple : npm run apple:secret -- --team ABCDE12345 --key-id KEY1234567 " +
      "--services-id app.hopigame.web --p8 ./AuthKey_KEY1234567.p8",
  );
  process.exit(1);
}

const { secret, expiresAt } = appleClientSecret({
  teamId: values.team,
  keyId: values["key-id"],
  servicesId: values["services-id"],
  privateKeyPem: readFileSync(values.p8, "utf8"),
  days: values.days ? Number(values.days) : undefined,
});

const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(expiresAt);
console.log("\nSecret Key (for OAuth) à coller dans Supabase :\n");
console.log(secret);
console.log(`\nValable jusqu'au ${date}. Note un rappel pour le régénérer avant cette date.\n`);
