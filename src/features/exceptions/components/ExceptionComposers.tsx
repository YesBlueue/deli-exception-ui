"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { updatePlatformData, addExceptionAction } from "@/infrastructure/demo-platform/platform";
import { CURRENT_USER } from "@/core/domain/config";
export function ExceptionComposers({ id }: { id: string }) {
  const [note, setNote] = useState(""); const [inquiry, setInquiry] = useState("");
  const save = (type: "NOTE" | "CARRIER_REQUEST", text: string) => { const r = updatePlatformData((db) => addExceptionAction(db, id, type, text, CURRENT_USER)); if (!r.ok) toast.error(r.error); else { toast.success(type === "NOTE" ? "Internal note saved" : "Carrier inquiry recorded (simulated)"); if (type === "NOTE") setNote(""); else setInquiry(""); } };
  return <section className="space-y-5 border-y py-5"><div className="space-y-2"><Label htmlFor="exception-note">Internal staff note</Label><Textarea id="exception-note" value={note} onChange={(e) => setNote(e.target.value)} /><Button variant="secondary" disabled={!note.trim()} onClick={() => save("NOTE", note)}>Save internal note</Button></div><div className="space-y-2"><Label htmlFor="carrier-inquiry">Carrier inquiry (simulated)</Label><Textarea id="carrier-inquiry" value={inquiry} onChange={(e) => setInquiry(e.target.value)} /><Button variant="outline" disabled={!inquiry.trim()} onClick={() => save("CARRIER_REQUEST", inquiry)}>Record simulated inquiry</Button></div></section>;
}