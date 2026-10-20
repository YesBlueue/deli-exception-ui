import { z } from "zod";

export function normalizePhone(value: string): string {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (compact.startsWith("09")) return `+95${compact.slice(1)}`;
  return compact;
}

const phone = z.string().transform(normalizePhone).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter a valid phone number, including country code (e.g. +95), or a Myanmar number starting with 09."));
export const signInSchema = z.object({ phone, password: z.string().min(1, "Enter your password.").max(128) });
export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100, "Name must be 100 characters or fewer."),
  phone,
  password: z.string().min(8, "Use at least 8 characters for your password.").max(128),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });