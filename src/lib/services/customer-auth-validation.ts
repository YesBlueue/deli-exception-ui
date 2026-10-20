import { z } from "zod";

export function normalizePhone(value: string): string {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (compact.startsWith("09")) return `+95${compact.slice(1)}`;
  return compact;
}

const email = z.string().trim().toLowerCase().email("Enter a valid email address.");
export const signInSchema = z.object({ email, password: z.string().min(1, "Enter your password.").max(128) });
export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100, "Name must be 100 characters or fewer."),
  email,
  password: z.string().min(8, "Use at least 8 characters for your password.").max(128),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });