/** Pure customer response templates. Variables: {{customerName}} {{orderId}} {{reference}} {{reason}} {{carrier}}. */
import type { ComplaintStatus } from "./types";
export type TemplateVars = { customerName: string; orderId: string; reference: string; reason: string; carrier: string };
export interface ResponseTemplate { id: string; label: string; status: ComplaintStatus; body: string }
export const RESPONSE_TEMPLATES: readonly ResponseTemplate[] = [
  { id: "refund", label: "Refund approved", status: "RESOLVED", body: "Hi {{customerName}},\n\nThank you for your patience while we reviewed complaint {{reference}} for order {{orderId}}. After inspection, we have approved a full refund. {{reason}}\n\nYour refund will reach your original payment method within 5–7 business days." },
  { id: "replacement", label: "Replacement dispatched", status: "RESOLVED", body: "Hi {{customerName}},\n\nWe're sorry about the problem with order {{orderId}} ({{reference}}). A replacement has been dispatched with {{carrier}}. {{reason}}\n\nYou'll receive tracking details from the carrier shortly." },
  { id: "delay", label: "Carrier delay explanation", status: "INVESTIGATING", body: "Hi {{customerName}},\n\nThank you for reaching out about order {{orderId}} ({{reference}}). {{carrier}} has told us the delay was caused by: {{reason}}\n\nWe're monitoring it closely and will update you as soon as it moves again." },
  { id: "safe-place", label: "Left at safe place", status: "RESOLVED", body: "Hi {{customerName}},\n\nWe checked with {{carrier}} about order {{orderId}} ({{reference}}). Their record shows the parcel was left at a safe place: {{reason}}\n\nPlease check that location, and reply here if you still can't find it." },
  { id: "investigating", label: "Investigation in progress", status: "INVESTIGATING", body: "Hi {{customerName}},\n\nWe've started investigating complaint {{reference}} for order {{orderId}}, including an inquiry with {{carrier}}. {{reason}}\n\nWe'll share an update here as soon as we hear back." },
  { id: "rejected", label: "Claim rejected with reason", status: "REJECTED", body: "Hi {{customerName}},\n\nThank you for your patience while we reviewed complaint {{reference}} for order {{orderId}}. Unfortunately we're unable to approve this claim because {{reason}}\n\nIf you have more information, please submit a new report and we'll gladly review it." },
];
export function interpolateTemplate(body: string, vars: Partial<TemplateVars>): string {
  return body.replace(/\{\{(customerName|orderId|reference|reason|carrier)\}\}/g, (_, key: keyof TemplateVars) => (vars[key] ?? "").trim()).replace(/[ \t]+\n/g, "\n").replace(/ {2,}/g, " ");
}
