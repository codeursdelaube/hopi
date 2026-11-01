import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Mascot } from "@/components/game/Mascot";
import { safeNextPath } from "@/lib/auth/paths";
import { fr } from "@/lib/i18n/fr";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <Suspense fallback={<LoginActionsSkeleton />}>
        <LoginActions searchParams={searchParams} />
      </Suspense>
      <p className="text-xs text-base-content/60">
        {fr.legal.acceptPrefix}{" "}
        <Link href="/cgu" className="link">
          {fr.legal.acceptTerms}
        </Link>{" "}
        {fr.legal.acceptAnd}{" "}
        <Link href="/confidentialite" className="link">
          {fr.legal.acceptPrivacy}
        </Link>
        .
      </p>
      <Link href="/" className="link text-sm link-hover">
        {fr.auth.backHome}
      </Link>
    </main>
  );
}

function LoginHeading() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-3xl font-bold">{fr.auth.loginTitle}</h1>
      <p className="text-base-content/70">{fr.auth.loginSubtitle}</p>
    </div>
  );
}

async function LoginActions({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const errorKey = params.error === "oauth" || params.error === "callback" ? params.error : null;

  return (
    <>
      <Mascot mood={errorKey ? "sad" : "happy"} size={150} />
      <LoginHeading />
      {errorKey && (
        <div role="alert" className="alert w-full alert-soft alert-error">
          {fr.auth.errors[errorKey]}
        </div>
      )}
      <GoogleButton next={next} />
    </>
  );
}

function LoginActionsSkeleton() {
  return (
    <>
      <Mascot mood="happy" size={150} />
      <LoginHeading />
      <div className="h-14 w-full skeleton rounded-field" />
    </>
  );
}
