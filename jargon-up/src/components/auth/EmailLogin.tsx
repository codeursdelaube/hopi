"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { KeyRound, Mail } from "lucide-react";
import { sendEmailCode, verifyEmailCode } from "@/app/(auth)/login/actions";
import { fr } from "@/lib/i18n/fr";

const t = fr.auth.email;

/** Délai avant de pouvoir redemander un code (limite de Supabase : 1 par minute). */
const RESEND_SECONDS = 60;
/** Longueur du code envoyé par Supabase (par défaut). */
const CODE_LENGTH = 6;

/**
 * Connexion par e-mail : on reçoit un code à 6 chiffres (toute adresse, dont iCloud).
 * Sur iPhone, le clavier propose directement le code reçu dans Mail (autocomplete one-time-code).
 */
export function EmailLogin({ next }: { next: string }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Heure à partir de laquelle on peut redemander un code (exacte même si l'onglet a dormi).
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);
  const [pending, startTransition] = useTransition();
  /** Dernier code vérifié : pas deux vérifications d'affilée du même code. */
  const lastTried = useRef<string | null>(null);
  const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    if (resendAt === 0) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [resendAt]);

  function send() {
    setError(null);
    startTransition(async () => {
      const result = await sendEmailCode(email, next);
      if (result.ok) {
        setEmail(result.email);
        setCode("");
        setStep("code");
        const sentAt = Date.now();
        setNow(sentAt);
        setResendAt(sentAt + RESEND_SECONDS * 1000);
        lastTried.current = null;
      } else {
        setError(t.errors[result.reason]);
      }
    });
  }

  function verify(value = code) {
    if (lastTried.current === value) return;
    lastTried.current = value;
    setError(null);
    startTransition(async () => {
      // En cas de succès, l'action redirige et ne revient pas ici.
      const result = await verifyEmailCode(email, value, next);
      if (!result.ok) {
        // Échec : on pourra retenter (même code après une coupure réseau, ou un autre code).
        lastTried.current = null;
        setError(result.reason === "invalid" ? t.errors.code : t.errors.error);
      }
    });
  }

  if (step === "email") {
    return (
      <form
        className="flex w-full flex-col gap-2 text-left"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor="login-email" className="text-sm font-bold">
          {t.label}
        </label>
        <input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.placeholder}
          className="input w-full input-lg"
        />
        <p className="text-xs text-base-content/60">{t.hint}</p>
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || !email.trim()}
          className="btn w-full btn-pop font-display text-lg btn-lg btn-primary"
        >
          {pending ? (
            <span className="loading loading-md loading-spinner" aria-hidden />
          ) : (
            <Mail className="size-5" aria-hidden />
          )}
          {t.send}
        </button>
      </form>
    );
  }

  return (
    <form
      className="flex w-full flex-col gap-2 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        verify();
      }}
    >
      <p role="status" className="text-sm text-base-content/70">
        {t.sent(email)}
      </p>
      <label htmlFor="login-code" className="text-sm font-bold">
        {t.codeLabel}
      </label>
      <input
        id="login-code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={10}
        required
        autoFocus
        value={code}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
          setCode(digits);
          // Validation automatique dès que le code est complet (collé ou proposé par le clavier).
          if (digits.length === CODE_LENGTH) verify(digits);
        }}
        className="input w-full text-center font-mono text-2xl tracking-[0.5em] input-lg"
      />
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || code.length < CODE_LENGTH}
        className="btn w-full btn-pop font-display text-lg btn-lg btn-primary"
      >
        {pending ? (
          <span className="loading loading-md loading-spinner" aria-hidden />
        ) : (
          <KeyRound className="size-5" aria-hidden />
        )}
        {t.verify}
      </button>
      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          onClick={send}
          disabled={pending || cooldown > 0}
          className="btn btn-ghost btn-sm"
        >
          {cooldown > 0 ? t.resendIn(cooldown) : t.resend}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setError(null);
          }}
          disabled={pending}
          className="btn btn-ghost btn-sm"
        >
          {t.change}
        </button>
      </div>
    </form>
  );
}
