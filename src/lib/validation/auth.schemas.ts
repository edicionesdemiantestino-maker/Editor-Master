import { z } from "zod";

// ── Login ─────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string()
    .min(5)
    .max(254)
    .email({ message: "Email inválido" })
    .transform((s) => s.trim().toLowerCase()),
  password: z
    .string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" })
    .max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ── Registro ──────────────────────────────────────────────────
export const registerSchema = z
  .object({
    email: z
      .string()
      .min(5)
      .max(254)
      .email({ message: "Email inválido" })
      .transform((s) => s.trim().toLowerCase()),
    password: z
      .string()
      .min(6, { message: "Mínimo 6 caracteres" })
      .max(128),
    confirmPassword: z.string().min(6).max(128),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// ── Reset password ────────────────────────────────────────────
export const resetPasswordSchema = z.object({
  email: z
    .string()
    .email()
    .transform((s) => s.trim().toLowerCase()),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ── Update password ───────────────────────────────────────────
export const updatePasswordSchema = z
  .object({
    password: z.string().min(6).max(128),
    confirmPassword: z.string().min(6).max(128),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

// ── Helper: parsear FormData de auth ──────────────────────────
export function parseAuthFormData(formData: FormData): {
  email: string;
  password: string;
} {
  return {
    email: String(formData.get("email") ?? "")
      .trim()
      .slice(0, 254),
    password: String(formData.get("password") ?? "").slice(0, 128),
  };
}