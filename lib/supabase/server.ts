import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function createSessionClient() {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase env is not configured");
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components не можуть змінювати cookies, це робить proxy.ts
        }
      },
    },
  });
}

// Лише для сервера: цей клієнт обходить RLS
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase env is not configured");
  return createPlainClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}
