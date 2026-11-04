/**
 * Interrupteur de la connexion par code e-mail.
 * Désactivée par défaut : sans SMTP personnalisé (ex. Brevo, voir docs/SETUP-SUPABASE.md §6),
 * Supabase n'envoie pas les codes aux utilisateurs. Pour l'activer : EMAIL_LOGIN_ENABLED=true
 * (Vercel → Environment Variables), puis redéployer.
 */
export function isEmailLoginEnabled(): boolean {
  return process.env.EMAIL_LOGIN_ENABLED === "true";
}
