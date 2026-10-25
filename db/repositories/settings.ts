import { asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { siteSettings, type SelectSiteSettings } from "../schema/settings";

export async function getSiteSettings(): Promise<SelectSiteSettings> {
  const [existing] = await db
    .select()
    .from(siteSettings)
    .where(isNull(siteSettings.deletedAt))
    .orderBy(asc(siteSettings.id))
    .limit(1);
  if (existing) return existing;

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('blueprint:site-settings'))`);
    const [initialized] = await tx
      .select()
      .from(siteSettings)
      .where(isNull(siteSettings.deletedAt))
      .orderBy(asc(siteSettings.id))
      .limit(1);
    if (initialized) return initialized;

    const [created] = await tx.insert(siteSettings).values({}).returning();
    return created;
  });
}

export async function updateSiteSettings(
  data: Partial<
    Pick<SelectSiteSettings, "allowedDomains" | "signupEnabled" | "requireMailConfirmation">
  >,
) {
  const settings = await getSiteSettings();
  const [updated] = await db
    .update(siteSettings)
    .set(data)
    .where(eq(siteSettings.id, settings.id))
    .returning();
  return updated;
}
