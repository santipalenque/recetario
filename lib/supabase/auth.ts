import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verifies the session JWT and returns the authenticated user.
 * Uses getClaims() instead of getUser(): once asymmetric JWT signing keys
 * are enabled on the Supabase project, this verifies locally via a cached
 * JWKS instead of hitting the Auth server on every call.
 */
export async function getAuthUser(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;

  const { claims } = data;
  return { id: claims.sub, email: claims.email as string | undefined };
}
