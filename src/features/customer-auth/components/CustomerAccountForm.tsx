"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { supabase } from "@/infrastructure/supabase/client";
import { signInSchema, signUpSchema } from "@/core/domain/customer-auth-validation";
import { useCustomerAuth } from "./CustomerAuthProvider";

export function CustomerAccountForm({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const auth = useCustomerAuth();
  const [signup, setSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fallback, setFallback] = useState(false);
  const changeForm = () => { setSignup(!signup); setError(""); setNotice(""); setPassword(""); setConfirmPassword(""); setVisible(false); };
  async function submit() {
    setError(""); setNotice(""); setFallback(false);
    const input = { name, email, password, confirmPassword };
    const parsed = signup ? signUpSchema.safeParse(input) : signInSchema.safeParse(input);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check your details."); return; }
    setBusy(true);
    try {
      if (auth.mode === "demo") {
        if (signup) await auth.localSignUp(input); else await auth.localLogIn(input);
        setPassword(""); setConfirmPassword(""); onAuthenticated?.(); return;
      }
      const result = signup
        ? await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { name: name.trim() }, emailRedirectTo: `${window.location.origin}/customer/complaint` } })
        : await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
      if (result.error) {
        if (/fetch|network|offline|unavailable|service|unexpected|database|disabled/i.test(result.error.message) || (result.error.status ?? 0) >= 500) throw Error("service");
        setError(result.error.message); return;
      }
      setPassword(""); setConfirmPassword("");
      if (result.data.session) onAuthenticated?.();
      else { setSignup(false); setNotice("Account created. Check your email to confirm your account, then log in to Report an Order Problem."); }
    } catch (e) {
      setError(auth.mode === "demo" ? (e instanceof Error ? e.message : "Demo sign-in could not be saved in this browser.") : "Unable to reach the account service. Check your connection and try again");
      setFallback(auth.mode === "cloud");
    } finally { setBusy(false); }
  }
  return <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
    <div><h1 className="text-2xl font-semibold">{signup ? "Create your account" : "Welcome back"}</h1><p className="mt-2 text-sm text-muted-foreground">{signup ? "Create an account to report an order problem." : "Log in to Shwe Market Support to report an order problem."}</p></div>
    {signup && <div className="space-y-1.5"><Label htmlFor="customer-name">Name</Label><Input id="customer-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} className="h-12" disabled={busy} /></div>}
    <div className="space-y-1.5"><Label htmlFor="customer-email">Email</Label><Input id="customer-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="h-12" disabled={busy} /></div>
    <div className="space-y-1.5"><Label htmlFor="customer-password">Password</Label><div className="relative"><Input id="customer-password" type={visible ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={signup ? "new-password" : "current-password"} maxLength={128} className="h-12 pr-12" disabled={busy} /><Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1 size-10" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff /> : <Eye />}</Button></div>{signup && <p className="text-xs text-muted-foreground">At least 8 characters.</p>}</div>
    {signup && <div className="space-y-1.5"><Label htmlFor="customer-confirm-password">Confirm password</Label><Input id="customer-confirm-password" type={visible ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" className="h-12" disabled={busy} /></div>}
    {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    <Button type="submit" disabled={busy} className="h-12 w-full text-base">{busy ? <Loader2 className="animate-spin" /> : signup ? <UserPlus /> : <LogIn />}{busy ? "Please wait…" : signup ? "Sign Up" : "Log In"}</Button>
    <div className="text-center text-sm text-muted-foreground">{signup ? "Already have an account?" : "Don’t have an account?"}<Button type="button" variant="link" disabled={busy} onClick={changeForm}>{signup ? "Log In" : "Sign Up"}</Button></div>
    {auth.mode === "cloud" && <Button type="button" variant="outline" className="h-auto min-h-10 w-full whitespace-normal" disabled={busy} onClick={() => { auth.changeMode("demo"); setEmail(""); setPassword(""); setConfirmPassword(""); setError(""); setNotice(""); setSignup(true); }}>{fallback ? "Use local demo sign-in instead" : "Use local demo sign-in"}</Button>}
    {auth.mode === "demo" && <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => { auth.changeMode("cloud"); setEmail(""); setPassword(""); setConfirmPassword(""); setError(""); setNotice(""); }}>Use cloud login</Button>}
  </form>;
}