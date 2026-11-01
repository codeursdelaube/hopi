"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteAccount } from "@/app/(app)/settings/account-actions";
import { fr } from "@/lib/i18n/fr";

const t = fr.account;

/** Suppression du compte, avec une confirmation explicite (action irréversible). */
export function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setFailed(false);
    startTransition(async () => {
      // En cas de succès, l'action redirige vers l'accueil et ne revient pas ici.
      const result = await deleteAccount();
      if (!result.ok) setFailed(true);
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn w-full btn-ghost text-error"
      >
        <Trash2 className="size-5" aria-hidden /> {t.delete}
      </button>
    );
  }

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-box border-2 border-error bg-error/10 p-4"
    >
      <p className="font-semibold">{t.confirmTitle}</p>
      <p className="text-sm">{t.confirmText}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={confirm} disabled={pending} className="btn btn-error">
          {pending && <span className="loading loading-spinner" aria-hidden />}
          {t.confirm}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="btn btn-ghost"
        >
          {t.cancel}
        </button>
      </div>
      {failed && <p className="text-sm text-error">{t.error}</p>}
    </div>
  );
}
