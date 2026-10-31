import Link from "next/link";
import { HeroMascot } from "@/components/marketing/HeroMascot";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { fr } from "@/lib/i18n/fr";

export default function Home() {
  const t = fr.landing;

  return (
    <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col gap-14 px-4 py-10 sm:py-16">
      <ThemeToggle className="absolute top-3 right-3" />
      <section className="flex flex-col items-center gap-6 text-center">
        <p className="font-display text-2xl font-semibold tracking-wide text-primary">
          {fr.app.name}
        </p>
        <HeroMascot />
        <h1 className="max-w-md font-display text-4xl leading-tight font-bold sm:text-5xl">
          {fr.app.tagline}
        </h1>
        <p className="max-w-lg text-lg text-base-content/70">{fr.app.description}</p>
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Link
            href="/login"
            className="btn w-full btn-pop font-display text-lg btn-lg btn-primary"
          >
            {t.ctaStart}
          </Link>
          <Link href="/login" className="btn w-full btn-ghost btn-lg">
            {t.ctaLogin}
          </Link>
        </div>
      </section>

      <section aria-labelledby="features-title" className="flex flex-col gap-5">
        <h2 id="features-title" className="text-center font-display text-2xl font-bold">
          {t.featuresTitle}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {t.features.map((f) => (
            <li key={f.title} className="card border-2 border-base-300 bg-base-200">
              <div className="card-body gap-2 p-5">
                <span className="text-3xl" aria-hidden>
                  {f.icon}
                </span>
                <h3 className="card-title font-display text-lg">{f.title}</h3>
                <p className="text-base-content/70">{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="fields-title" className="flex flex-col gap-5">
        <h2 id="fields-title" className="text-center font-display text-2xl font-bold">
          {t.fieldsTitle}
        </h2>
        <ul className="flex flex-wrap justify-center gap-3">
          {fr.fields.map((field) => (
            <li
              key={field.slug}
              className={`flex min-h-11 items-center gap-2 rounded-full border-2 px-4 py-2 font-semibold ${
                field.published
                  ? "border-primary bg-primary/10"
                  : "border-base-300 text-base-content/50"
              }`}
            >
              <span aria-hidden>{field.icon}</span>
              {field.name}
              <span
                className={`badge badge-sm ${field.published ? "badge-success" : "badge-ghost"}`}
              >
                {field.published ? t.available : t.comingSoon}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-auto text-center text-sm text-base-content/50">{t.footer}</footer>
    </main>
  );
}
