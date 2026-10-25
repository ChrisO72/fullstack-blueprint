import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectRefreshToken } from "../schema/auth";
import { rotateRefreshToken } from "../repositories/refreshTokens";

const state = vi.hoisted(() => ({ row: null as SelectRefreshToken | null, updates: 0 }));

vi.mock("../db", () => {
  const tx = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => ({
            for: async () => (state.row ? [state.row] : []),
          }),
        }),
      }),
    }),
    update: () => ({
      set: (values: Partial<SelectRefreshToken>) => ({
        where: () => ({
          returning: async () => {
            if (!state.row) throw new Error("Missing session");
            state.row = { ...state.row, ...values };
            state.updates++;
            return [state.row];
          },
        }),
      }),
    }),
  };
  return { db: { transaction: <T>(run: (transaction: typeof tx) => Promise<T>) => run(tx) } };
});

const now = new Date("2026-10-25T12:00:00Z");
const replacement = {
  userId: 42,
  tokenHash: "next",
  tokenId: "f418ecbf-5f02-4521-922d-034a8cc74102",
  issuedAt: now,
  expiresAt: new Date(now.getTime() + 60_000),
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  state.updates = 0;
  state.row = {
    id: 1,
    userId: 42,
    tokenHash: "current",
    tokenId: "b3c29aa1-8185-498d-894b-42ad728005b4",
    issuedAt: now,
    createdAt: now,
    expiresAt: replacement.expiresAt,
    previousTokenHash: "previous",
    previousValidUntil: new Date(now.getTime() + 10_000),
  };
});
afterEach(() => {
  vi.useRealTimers();
});

describe("refresh rotation grace period", () => {
  it.each(["previous", "current"])(
    "reuses the current token for %s without extending the window",
    async (tokenHash) => {
      const stored = state.row;
      expect(await rotateRefreshToken(tokenHash, replacement, 10_000)).toEqual(stored);
      expect(state.updates).toBe(0);
    },
  );

  it("rejects the previous token at the grace deadline", async () => {
    vi.setSystemTime(new Date(now.getTime() + 10_000));
    expect(await rotateRefreshToken("previous", replacement, 10_000)).toBeNull();
    expect(state.updates).toBe(0);
  });

  it("rotates the current token after the grace period", async () => {
    vi.setSystemTime(new Date(now.getTime() + 10_000));
    const result = await rotateRefreshToken("current", replacement, 10_000);
    expect(result).toMatchObject({
      ...replacement,
      previousTokenHash: "current",
      previousValidUntil: new Date(now.getTime() + 20_000),
    });
    expect(state.updates).toBe(1);
  });

  it("upgrades sessions created before rotation metadata existed", async () => {
    if (!state.row) throw new Error("Missing session fixture");
    state.row = {
      ...state.row,
      tokenId: null,
      issuedAt: null,
      previousTokenHash: null,
      previousValidUntil: null,
    };
    expect(await rotateRefreshToken("current", replacement, 10_000)).toMatchObject({
      ...replacement,
      previousTokenHash: "current",
    });
  });

  it("does not revive an expired session after waiting for the row lock", async () => {
    vi.setSystemTime(replacement.expiresAt);
    expect(await rotateRefreshToken("current", replacement, 10_000)).toBeNull();
    expect(state.updates).toBe(0);
  });
});
