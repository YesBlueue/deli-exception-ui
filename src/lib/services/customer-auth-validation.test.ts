import { describe, expect, it } from "vitest";
import { normalizePhone, signInSchema, signUpSchema } from "./customer-auth-validation";

describe("customer account rules", () => {
  const signup = { name: "Customer", phone: "+959123456789", password: "Example-pass-123", confirmPassword: "Example-pass-123" };
  it("requires name for signup", () => expect(signUpSchema.safeParse({ ...signup, name: "" }).success).toBe(false));
  it("requires phone for signup", () => expect(signUpSchema.safeParse({ ...signup, phone: "" }).success).toBe(false));
  it("requires a password for signup", () => expect(signUpSchema.safeParse({ ...signup, password: "", confirmPassword: "" }).success).toBe(false));
  it("requires matching password confirmation", () => expect(signUpSchema.safeParse({ ...signup, confirmPassword: "different" }).success).toBe(false));
  it("accepts phone and password alone for sign-in", () => expect(signInSchema.safeParse({ phone: signup.phone, password: signup.password }).success).toBe(true));
  it("requires phone and password for sign-in", () => { expect(signInSchema.safeParse({ phone: "", password: signup.password }).success).toBe(false); expect(signInSchema.safeParse({ phone: signup.phone, password: "" }).success).toBe(false); });
  it("normalizes Myanmar phone numbers consistently", () => expect(normalizePhone("09 123 456 789")).toBe("+959123456789"));
});