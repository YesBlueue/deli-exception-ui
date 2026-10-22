import type { Instrumentation } from "next";
import { describeError } from "@/infrastructure/monitoring/describe-error";

/** Logs server render, Server Action and Route Handler failures with their full cause chain. */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  console.error(`[${context.routerKind}] ${request.method} ${request.path} (${context.routeType} ${context.routePath})\n${describeError(error)}`);
};
