"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logStructuredLine } from "@/lib/observability/structured-log";
import {
  isPlausibleEmail,
  isPlausiblePassword,
  parseAuthForm,
  parseSafeInternalPath,
} from "@/lib/auth/form-validation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  signInWithEmailPassword,
  signOut,
  signUpWithEmailPassword,
} from "@/services/auth/auth-service";

/** TEMP (diagnóstico): mensaje completo de Supabase en query; revertir antes de prod estable. */
function redirectAuthError(path: string, rawMessage: string): never {
  redirect(`${path}?error=${encodeURIComponent(rawMessage)}`);
}

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
    redirect(
      `/login?error=${encodeURIComponent("Supabase no está configurado en el servidor.")}`,
    );
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
    redirect(
      `/login?error=${encodeURIComponent("Revisá el email y la contraseña (mín. 6 caracteres).")}`,
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await signInWithEmailPassword(supabase, email, password);
  if (error) {
    logStructuredLine(
      {
        service: "actions/auth",
        requestId,
        event: "sign_in_failed",
        httpStatus: 401,
        code: "supabase_sign_in_error",
      },
      "warn",
    );
    redirectAuthError("/login", error.message);
  }
  // Forzar que las cookies de sesión se escriban (implicit + Server Action).
  await supabase.auth.getSession();
  revalidatePath("/", "layout");
  const nextPath = parseSafeInternalPath(formData.get("next"));
  redirect(nextPath);
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
    redirect(
      `/register?error=${encodeURIComponent("Supabase no está configurado en el servidor.")}`,
    );
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
    redirect(
      `/register?error=${encodeURIComponent("Email o contraseña no válidos (mín. 6 caracteres).")}`,
    );
  }

  const { error } = await signUpWithEmailPassword(email, password);
  if (error) {
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
    redirectAuthError("/register", error.message);
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
