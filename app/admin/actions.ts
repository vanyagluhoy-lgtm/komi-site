"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isStatus } from "@/lib/leads";
import { createSessionClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function signIn(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Вкажіть пошту і пароль." };

  try {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Неправильна пошта або пароль." };
  } catch (error) {
    console.error("Sign in failed", error);
    return { error: "Вхід зараз недоступний. Спробуйте пізніше." };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function updateStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status");
  if (!id || !isStatus(status)) return;

  // Право змінювати заявку перевіряє RLS у базі
  const supabase = await createSessionClient();
  const { error } = await supabase.from("leads").update({ status }).eq("id", id);
  if (error) console.error("Status update failed", error);

  revalidatePath("/admin");
  revalidatePath(`/admin/${id}`);
}
