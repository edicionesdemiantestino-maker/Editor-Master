"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("LOGIN ERROR FULL:", JSON.stringify(error, null, 2));
    redirect("/login?error=auth_failed");
  }

  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    console.error("NO USER AFTER LOGIN");
    redirect("/login?error=session_failed");
  }

  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("SIGNUP ERROR:", error);
    redirect("/login?error=auth_failed");
  }

  redirect("/login?message=check_email_or_login");
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}
