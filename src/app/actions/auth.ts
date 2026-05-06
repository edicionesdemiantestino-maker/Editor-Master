"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logStructuredLine } from "@/lib/observability/structured-log";
import {
  isPlausibleEmail,
  isPlausiblePassword,
  parseAuthForm,
} from "@/lib/auth/form-validation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { signOut, signUpWithEmailPassword } from "@/services/auth/auth-service";

export async function signInAction(formData: FormData) {
  const requestId = randomUUID();
  if (!isSupabaseConfigured()) {
    logStructuredLine(
      {
        service: "actions/auth",
        requestId,
        event: "sign_in_supabase_missing",
        httpStatus: 503,
      },
      "warn",
    );
    redirect("/login?error=auth_failed");
  }

  const { email, password } = parseAuthForm(formData);
  if (!isPlausibleEmail(email) || !isPlausiblePassword(password)) {
    logStructuredLine(
      {
        service: "actions/auth",
        requestId,
        event: "sign_in_validation_failed",
        httpStatus: 400,
        code: "invalid_form",
      },
      "warn",
    );
    redirect("/login?error=auth_failed");
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("LOGIN ERROR:", error.message);
    redirect("/login?error=auth_failed");
  }

  await supabase.auth.getUser();

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const requestId = randomUUID();
  if (!isSupabaseConfigured()) {
    logStructuredLine(
      {
        service: "actions/auth",
        requestId,
        event: "sign_up_supabase_missing",
        httpStatus: 503,
      },
      "warn",
    );
    redirect("/register?error=auth_failed");
  }

  const { email, password } = parseAuthForm(formData);
  if (!isPlausibleEmail(email) || !isPlausiblePassword(password)) {
    logStructuredLine(
      {
        service: "actions/auth",
        requestId,
        event: "sign_up_validation_failed",
        httpStatus: 400,
        code: "invalid_form",
      },
      "warn",
    );
    redirect("/register?error=auth_failed");
  }

  const { error } = await signUpWithEmailPassword(email, password);
  if (error) {
    console.error("SIGNUP ERROR:", error.message);
    logStructuredLine(
      {
        service: "actions/auth",
        requestId,
        event: "sign_up_failed",
        httpStatus: 400,
        code: "supabase_sign_up_error",
      },
      "warn",
    );
    redirect("/register?error=auth_failed");
  }
  redirect("/login?message=confirm-email");
}

export async function signOutAction() {
  const requestId = randomUUID();
  if (!isSupabaseConfigured()) {
    redirect("/");
  }
  try {
    const supabase = await createServerSupabaseClient();
    await signOut(supabase);
    logStructuredLine(
      {
        service: "actions/auth",
        requestId,
        event: "sign_out_ok",
        httpStatus: 200,
      },
      "info",
    );
  } catch (e) {
    logStructuredLine(
      {
        service: "actions/auth",
        requestId,
        event: "sign_out_error",
        httpStatus: 500,
        code: e instanceof Error ? e.name : "unknown",
      },
      "error",
    );
  }
  revalidatePath("/", "layout");
  redirect("/");
}
