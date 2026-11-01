/**
 * Génère les clés des notifications push (VAPID) et le secret de la tâche planifiée,
 * puis les ajoute à .env.local s'ils n'y sont pas déjà. N'affiche aucune valeur secrète.
 *
 * Usage : npm run setup:push
 * Ensuite : copier ces 3 variables dans Vercel (Settings → Environment Variables).
 */
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import webpush from "web-push";

const file = ".env.local";
const current = existsSync(file) ? readFileSync(file, "utf8") : "";
const has = (name) => new RegExp(`^${name}=.+`, "m").test(current);

const lines = [];
if (!has("NEXT_PUBLIC_VAPID_PUBLIC_KEY") || !has("VAPID_PRIVATE_KEY")) {
  const keys = webpush.generateVAPIDKeys();
  lines.push(
    `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`,
    `VAPID_PRIVATE_KEY=${keys.privateKey}`,
  );
}
if (!has("CRON_SECRET")) {
  lines.push(`CRON_SECRET=${randomBytes(24).toString("hex")}`);
}

if (lines.length === 0) {
  console.log("✔ Les variables des notifications existent déjà dans .env.local.");
} else {
  const prefix = current.endsWith("\n") || current === "" ? "" : "\n";
  appendFileSync(
    file,
    `${prefix}\n# Notifications push (npm run setup:push)\n${lines.join("\n")}\n`,
  );
  console.log(
    `✔ Ajouté à .env.local : ${lines.map((l) => l.split("=")[0]).join(", ")}.\n` +
      "  Copie-les aussi dans Vercel → Settings → Environment Variables, puis redéploie.",
  );
}
