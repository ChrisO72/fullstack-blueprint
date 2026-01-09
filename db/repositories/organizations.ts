import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { type InsertOrganization, organizations } from "../schema";

export async function createOrganization(organization: InsertOrganization) {
  return await db.insert(organizations).values(organization).returning();
}

export async function getOrganizationById(id: number) {
  const result = await db
    .select()
    .from(organizations)
    .where(and(eq(organizations.id, id), isNull(organizations.deleted_at)));
  return result[0] || null;
}

export async function updateOrganization(
  id: number,
  data: Partial<InsertOrganization>
) {
  return await db
    .update(organizations)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(organizations.id, id))
    .returning();
}

export async function softDeleteOrganization(id: number) {
  return await db
    .update(organizations)
    .set({
      deleted_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(organizations.id, id))
    .returning();
}

export async function listOrganizations() {
  return await db
    .select()
    .from(organizations)
    .where(isNull(organizations.deleted_at));
}
