"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AtSign,
  Briefcase,
  Check,
  Copy,
  MessageCircle,
  Send,
  Share2,
  ThumbsUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { fr } from "@/lib/i18n/fr";

const t = fr.share;

type ShareProps = {
  /** Titre de la fenêtre de partage. */
  title: string;
  /** Message d'invitation ; le lien est ajouté à la fin. */
  text: string;
  /** Chemin de la page partagée (ex. `/salle/…`), complété avec l'adresse du site. */
  path: string;
};

type Target = { name: string; Icon: LucideIcon; tone: string; href: string };

function targets(text: string, url: string): Target[] {
  const enc = encodeURIComponent;
  return [
    {
      name: "WhatsApp",
      Icon: MessageCircle,
      tone: "bg-[#25D366] text-white",
      href: `https://wa.me/?text=${enc(`${text} ${url}`)}`,
    },
    {
      name: "Facebook",
      Icon: ThumbsUp,
      tone: "bg-[#1877F2] text-white",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    },
    {
      name: "Telegram",
      Icon: Send,
      tone: "bg-[#229ED9] text-white",
      href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
    },
    {
      name: "X",
      Icon: AtSign,
      tone: "bg-neutral text-neutral-content",
      href: `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`,
    },
    {
      name: "LinkedIn",
      Icon: Briefcase,
      tone: "bg-[#0A66C2] text-white",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    },
  ];
}

/** Fenêtre de partage : réseaux sociaux, copie du lien et partage natif du téléphone. */
export function ShareDialog({ title, text, path, onClose }: ShareProps & { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  // Adresse du site courant (fonctionne aussi en local et sur les déploiements de test).
  const url = new URL(path, window.location.origin).href;
  const canShareNatively = typeof navigator.share === "function";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
    } catch {
      // Presse-papiers refusé : rien à faire, les autres boutons restent disponibles.
    }
  }

  async function shareNatively() {
    try {
      await navigator.share({ title: fr.app.name, text, url });
      onClose();
    } catch {
      // Partage annulé par l'utilisateur.
    }
  }

  return createPortal(
    <div
      className="modal modal-open modal-bottom sm:modal-middle"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-title"
    >
      <div className="modal-box flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="share-title" className="font-display text-xl font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-circle btn-ghost btn-sm"
            aria-label={t.close}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <p className="rounded-box bg-base-200 p-3 text-sm text-base-content/80">
          {text} <span className="break-all text-primary">{url}</span>
        </p>

        <ul className="grid grid-cols-5 gap-2">
          {targets(text, url).map(({ name, Icon, tone, href }) => (
            <li key={name}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 text-xs font-semibold"
              >
                <span className={`flex size-12 items-center justify-center rounded-full ${tone}`}>
                  <Icon className="size-6" aria-hidden />
                </span>
                {name}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => void copy()} className="btn w-full btn-outline">
            {copied ? (
              <Check className="size-5 text-success" strokeWidth={3} aria-hidden />
            ) : (
              <Copy className="size-5" aria-hidden />
            )}
            <span role="status">{copied ? t.copied : t.copy}</span>
          </button>
          {canShareNatively && (
            <button
              type="button"
              onClick={() => void shareNatively()}
              className="btn w-full btn-pop btn-primary"
            >
              <Share2 className="size-5" aria-hidden /> {t.more}
            </button>
          )}
        </div>
      </div>
      <button type="button" className="modal-backdrop" onClick={onClose} aria-label={t.close} />
    </div>,
    document.body,
  );
}

/** Bouton « Partager » qui ouvre la fenêtre de partage. */
export function ShareButton({
  className = "btn btn-sm btn-ghost",
  label = t.button,
  ...share
}: ShareProps & { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Share2 className="size-4" aria-hidden /> {label}
      </button>
      {open && <ShareDialog {...share} onClose={() => setOpen(false)} />}
    </>
  );
}
