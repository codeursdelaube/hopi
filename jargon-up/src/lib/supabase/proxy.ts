import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";
import { HOME_PATH, LOGIN_PATH, isPrivatePath } from "@/lib/auth/paths";

/**
 * Rafraîchit la session Supabase à chaque requête et applique la protection des routes.
 * Appelé depuis src/proxy.ts.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    getPublicEnv().NEXT_PUBLIC_SUPABASE_URL,
    getPublicEnv().NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Ne rien intercaler entre la création du client et getClaims() : c'est lui qui
  // déclenche le rafraîchissement du jeton.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!isLoggedIn && isPrivatePath(pathname)) {
    return redirectKeepingCookies(request, response, LOGIN_PATH, { next: pathname + search });
  }

  if (isLoggedIn && pathname === LOGIN_PATH) {
    return redirectKeepingCookies(request, response, HOME_PATH);
  }

  return response;
}

/** Redirige en recopiant les cookies de session éventuellement rafraîchis. */
function redirectKeepingCookies(
  request: NextRequest,
  from: NextResponse,
  pathname: string,
  params: Record<string, string> = {},
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = new URLSearchParams(params).toString();
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
