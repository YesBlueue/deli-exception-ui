import { useState } from "react";
import { Eye, EyeOff, Loader2, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { signInSchema, signUpSchema } from "@/lib/services/customer-auth-validation";

export function CustomerAccountForm() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verificationPhone, setVerificationPhone] = useState("");
  const [code, setCode] = useState("");
  const signup = mode === "signup";

  async function submit() {
    setError("");
    if (verificationPhone) {
      if (!/^\d{4,8}$/.test(code)) { setError("Enter the verification code from your text message."); return; }
      setBusy(true);
      try {
        const result = await supabase.auth.verifyOtp({ phone: verificationPhone, token: code, type: "sms" });
        if (result.error) setError(result.error.message);
      } catch { setError("Could not verify the code. Please try again."); }
      finally { setBusy(false); }
      return;
    }
    const parsed = signup ? signUpSchema.safeParse({ name, phone, password, confirmPassword }) : signInSchema.safeParse({ phone, password });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check your details."); return; }
    setBusy(true);
    try {
      const settings = await fetch(`${import.meta.env['VITE_SUPABASE_URL']}/auth/v1/settings`, { headers: { apikey: import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] } });
      if (!settings.ok) throw new Error("settings");
      const config = await settings.json();
      if (!config.external?.phone) { setError("Phone sign-in is not available yet. Please try again once the support team has enabled it."); return; }
      const result = signup
        ? await supabase.auth.signUp({ phone: parsed.data.phone, password: parsed.data.password, options: { data: { name: name.trim() } } })
        : await supabase.auth.signInWithPassword({ phone: parsed.data.phone, password: parsed.data.password });
      if (result.error) { setError(signup ? result.error.message : "Could not sign in. Check your phone number and password, or verify your phone first."); return; }
      setPassword(""); setConfirmPassword("");
      if (signup && !result.data.session) setVerificationPhone(parsed.data.phone);
    } catch { setError("Could not connect. Please try again."); }
    finally { setBusy(false); }
  }

  return <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
    <div>
      <h1 className="text-2xl font-semibold">{verificationPhone ? "Verify your phone" : signup ? "Create your account" : "Welcome back"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{verificationPhone ? "Enter the code sent to your phone to complete sign-up." : "Sign in to Shwe Market Support to report an order problem."}</p>
    </div>
    {!verificationPhone && <Tabs value={mode} onValueChange={(value) => { setMode(value); setError(""); setPassword(""); setConfirmPassword(""); }}>
      <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="login" disabled={busy}>Sign in</TabsTrigger><TabsTrigger value="signup" disabled={busy}>Sign up</TabsTrigger></TabsList>
    </Tabs>}
    {verificationPhone ? <div className="space-y-1.5"><Label htmlFor="verification-code">Verification code</Label><Input id="verification-code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={8} className="h-12" /></div> : <>
      {signup && <div className="space-y-1.5"><Label htmlFor="customer-name">Name</Label><Input id="customer-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} className="h-12" disabled={busy} /></div>}
      <div className="space-y-1.5"><Label htmlFor="customer-phone">Phone number</Label><Input id="customer-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="09… or +95…" maxLength={30} className="h-12" disabled={busy} /></div>
      <div className="space-y-1.5"><Label htmlFor="customer-password">Password</Label><div className="relative"><Input id="customer-password" type={visible ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={signup ? "new-password" : "current-password"} maxLength={128} className="h-12 pr-12" disabled={busy} /><Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1 size-10" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff /> : <Eye />}</Button></div>{signup && <p className="text-xs text-muted-foreground">At least 8 characters.</p>}</div>
      {signup && <div className="space-y-1.5"><Label htmlFor="customer-confirm-password">Confirm password</Label><Input id="customer-confirm-password" type={visible ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" maxLength={128} className="h-12" disabled={busy} /></div>}
    </>}
    {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={busy} className="h-12 w-full text-base">{busy ? <Loader2 className="animate-spin" /> : signup ? <UserPlus /> : <LogIn />}{busy ? "Please wait…" : verificationPhone ? "Verify phone" : signup ? "Create account" : "Sign in"}</Button>
    {verificationPhone && <Button type="button" variant="ghost" className="w-full" onClick={() => { setVerificationPhone(""); setCode(""); setError(""); }}>Back to sign in</Button>}
  </form>;
}