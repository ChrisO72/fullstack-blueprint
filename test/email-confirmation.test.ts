import crypto from "crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "~/db/db";
import { getUserById } from "~/db/repositories/users";
import { emailConfirmationTokens } from "~/db/schema/auth";
import {
  confirmUserEmail,
  createEmailConfirmationToken,
  deleteEmailConfirmationToken,
} from "~/lib/auth/email-confirmation.server";
import { createTestOrganization, createTestUser } from "./fixtures";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

describe("email-confirmation lifecycle", () => {
  it("stores only a hash and confirms a token once", async () => {
    const organization = await createTestOrganization("Email confirmation test");
    const user = await createTestUser(organization.id, "confirmation@example.com");
    const token = await createEmailConfirmationToken(user.id);

    const storedTokens = await db
      .select()
      .from(emailConfirmationTokens)
      .where(eq(emailConfirmationTokens.userId, user.id));

    expect(storedTokens).toHaveLength(1);
    expect(storedTokens[0]?.tokenHash).toBe(hashToken(token));
    expect(storedTokens[0]?.tokenHash).not.toBe(token);

    expect(await confirmUserEmail(token)).toMatchObject({ id: user.id });
    expect(await confirmUserEmail(token)).toBeNull();

    const confirmedUser = await getUserById(user.id);
    expect(confirmedUser?.emailConfirmedAt).toBeInstanceOf(Date);
  });

  it("replaces the prior token when confirmation is resent", async () => {
    const organization = await createTestOrganization("Email confirmation resend test");
    const user = await createTestUser(organization.id, "confirmation-resend@example.com");
    const firstToken = await createEmailConfirmationToken(user.id);
    const secondToken = await createEmailConfirmationToken(user.id);

    const storedTokens = await db
      .select()
      .from(emailConfirmationTokens)
      .where(eq(emailConfirmationTokens.userId, user.id));

    expect(storedTokens).toEqual([
      expect.objectContaining({
        userId: user.id,
        tokenHash: hashToken(secondToken),
      }),
    ]);
    expect(await confirmUserEmail(firstToken)).toBeNull();
    expect(await confirmUserEmail(secondToken)).toMatchObject({ id: user.id });
  });

  it("rejects an expired token without confirming the user", async () => {
    const organization = await createTestOrganization("Expired email confirmation test");
    const user = await createTestUser(organization.id, "confirmation-expired@example.com");
    const token = await createEmailConfirmationToken(user.id);

    await db
      .update(emailConfirmationTokens)
      .set({ expiresAt: new Date(Date.now() - 1_000) })
      .where(eq(emailConfirmationTokens.tokenHash, hashToken(token)));

    expect(await confirmUserEmail(token)).toBeNull();
    expect((await getUserById(user.id))?.emailConfirmedAt).toBeNull();
  });

  it("allows only one concurrent confirmation of the same token", async () => {
    const organization = await createTestOrganization("Concurrent email confirmation test");
    const user = await createTestUser(organization.id, "confirmation-concurrent@example.com");
    const token = await createEmailConfirmationToken(user.id);

    const results = await Promise.all([confirmUserEmail(token), confirmUserEmail(token)]);

    expect(results.filter((result) => result !== null)).toHaveLength(1);
    expect(
      await db
        .select()
        .from(emailConfirmationTokens)
        .where(eq(emailConfirmationTokens.userId, user.id)),
    ).toHaveLength(0);
  });

  it("deletes a queued-email token by its raw value", async () => {
    const organization = await createTestOrganization("Email confirmation cleanup test");
    const user = await createTestUser(organization.id, "confirmation-cleanup@example.com");
    const token = await createEmailConfirmationToken(user.id);

    await deleteEmailConfirmationToken(token);

    expect(await confirmUserEmail(token)).toBeNull();
    expect(
      await db
        .select()
        .from(emailConfirmationTokens)
        .where(eq(emailConfirmationTokens.userId, user.id)),
    ).toHaveLength(0);
  });
});
