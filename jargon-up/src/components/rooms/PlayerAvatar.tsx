import { Rabbit } from "lucide-react";

/** Photo du joueur, ou mascotte s'il n'en a pas. */
export function PlayerAvatar({ url }: { url: string | null }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={36}
        height={36}
        referrerPolicy="no-referrer"
        className="rounded-full"
      />
    );
  }
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-base-300">
      <Rabbit className="size-5 text-base-content/60" aria-hidden />
    </span>
  );
}
