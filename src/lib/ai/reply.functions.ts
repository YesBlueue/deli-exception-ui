import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { draftCustomerReply } from "./reply.server";
const s = (max: number) => z.string().max(max);
const schema = z.object({ category: s(100), description: s(10000), orderId: s(100), customerName: s(200), reference: s(100), carrier: s(100), shipmentStatus: s(100), outcome: z.enum(["Approved", "Rejected", "Need info", "Investigating"]), notes: s(2000), tone: z.enum(["Empathetic", "Professional", "Direct"]) });
/** Prototype staff tool: returns a draft only; staff must review and send it themselves. */
export const generateReplyDraft = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => draftCustomerReply(data));
