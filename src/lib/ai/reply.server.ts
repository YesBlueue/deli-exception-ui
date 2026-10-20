import { generateChatCompletion, GatewayError } from "@lovable.dev/ai-gateway";
export type ReplyTone = "Empathetic" | "Professional" | "Direct";
export interface ReplyContext { category: string; description: string; orderId: string; customerName: string; reference: string; carrier: string; shipmentStatus: string; outcome: "Approved" | "Rejected" | "Need info" | "Investigating"; notes: string; tone: ReplyTone }
export async function draftCustomerReply(ctx: ReplyContext): Promise<{ ok: true; draft: string } | { ok: false; error: string }> {
  try {
    const res = await generateChatCompletion({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You write customer support replies for a delivery company. Write a concise reply (under 150 words) addressed to the customer by first name. Clearly state the decision, the reason, and next steps. Never invent refunds, dates or facts not given. Never mention internal notes, staff names, or that you are an AI. Plain text only, no markdown, no subject line, no signature placeholders." },
        { role: "user", content: `Tone: ${ctx.tone}\nDecision: ${ctx.outcome}\nStaff key reasons: ${ctx.notes || "(none)"}\nCustomer: ${ctx.customerName}\nOrder: ${ctx.orderId}\nComplaint reference: ${ctx.reference}\nCategory: ${ctx.category}\nCarrier: ${ctx.carrier}\nShipment status: ${ctx.shipmentStatus}\nCustomer description: ${ctx.description || "(none)"}` },
      ],
    });
    const draft = res.choices?.[0]?.message?.content;
    const text = typeof draft === "string" ? draft.trim() : "";
    return text ? { ok: true, draft: text } : { ok: false, error: "The AI returned an empty draft. Try again." };
  } catch (e) {
    console.error("draftCustomerReply", e);
    if (e instanceof GatewayError) {
      if (e.code === "rate_limited" || e.httpStatus === 429) return { ok: false, error: "AI is busy right now. Please wait a moment and try again." };
      if (e.httpStatus === 402) return { ok: false, error: "AI credits are used up. Add credits to keep generating drafts." };
    }
    return { ok: false, error: "Couldn't generate a draft. Write the reply manually or try again." };
  }
}
