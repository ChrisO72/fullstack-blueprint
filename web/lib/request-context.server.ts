import { randomUUID } from "node:crypto";
import { createContext } from "react-router";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export const requestIdContext = createContext<string | null>(null);

type RequestIdContextReader = {
  get(context: typeof requestIdContext): string | null;
};

export function resolveRequestId(request: Request): string {
  const suppliedRequestId = request.headers.get("x-request-id")?.trim();
  return suppliedRequestId && REQUEST_ID_PATTERN.test(suppliedRequestId)
    ? suppliedRequestId
    : randomUUID();
}

export function getRequestId(context: RequestIdContextReader | undefined): string | undefined {
  return context?.get(requestIdContext) ?? undefined;
}
