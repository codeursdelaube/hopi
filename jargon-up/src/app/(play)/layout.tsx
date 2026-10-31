/** Écrans de jeu (leçon, révision) : plein écran, sans barre de navigation. */
export default function PlayLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col px-4">{children}</main>
  );
}
