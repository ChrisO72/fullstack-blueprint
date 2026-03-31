import { eq } from "drizzle-orm";
import { db } from "../db";
import { siteSettings, type SelectSiteSettings } from "../schema";

export async function getSiteSettings(): Promise<SelectSiteSettings> {
  const [existing] = await db.select().from(siteSettings).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(siteSettings).values({}).returning();
  return created;
}

export async function updateSiteSettings(
  data: Partial<Pick<SelectSiteSettings, "allowedDomains" | "requireMailConfirmation">>,
) {
  const settings = await getSiteSettings();
  const [updated] = await db
    .update(siteSettings)
    .set(data)
    .where(eq(siteSettings.id, settings.id))
    .returning();
  return updated;
}
