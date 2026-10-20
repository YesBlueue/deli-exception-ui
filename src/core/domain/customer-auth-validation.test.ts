import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "@/core/domain/customer-auth-validation";

describe("customer account rules", () => {
  const signup = { name: "Customer", email: "customer@example.test", password: "Example-pass-123", confirmPassword: "Example-pass-123" };
  it("requires name for signup", () => expect(signUpSchema.safeParse({ ...signup, name: "" }).success).toBe(false));
  it("requires email for signup", () => expect(signUpSchema.safeParse({ ...signup, email: "" }).success).toBe(false));
  it("requires a password for signup", () => expect(signUpSchema.safeParse({ ...signup, password: "", confirmPassword: "" }).success).toBe(false));
  it("requires matching password confirmation", () => expect(signUpSchema.safeParse({ ...signup, confirmPassword: "different" }).success).toBe(false));
  it("accepts email and password alone for sign-in", () => expect(signInSchema.safeParse({ email: signup.email, password: signup.password }).success).toBe(true));
  it("requires email and password for sign-in", () => { expect(signInSchema.safeParse({ email: "", password: signup.password }).success).toBe(false); expect(signInSchema.safeParse({ email: signup.email, password: "" }).success).toBe(false); });
  it("normalizes email", () => expect(signInSchema.parse({ email: " Customer@Example.test ", password: "pass" }).email).toBe("customer@example.test"));
});
