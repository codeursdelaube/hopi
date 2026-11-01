import { NextResponse } from "next/server";
import { connection } from "next/server";

/** Version actuellement en ligne (comparée par l'appli ouverte pour proposer la mise à jour). */
export async function GET() {
  await connection(); // jamais figée au build : toujours la version du déploiement actif
  return NextResponse.json(
    { version: process.env.NEXT_PUBLIC_APP_VERSION },
    { headers: { "Cache-Control": "no-store" } },
  );
}
