import { and, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { type InsertUser, type SelectUser, users } from "../schema/auth";
import { organizations } from "../schema/organizations";

const userColumns = {
  id: users.id,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  emailConfirmedAt: users.emailConfirmedAt,
  role: users.role,
  organizationId: users.organizationId,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  deletedAt: users.deletedAt,
};

export type User = Pick<SelectUser, keyof typeof userColumns>;

export async function registerUser(data: Pick<InsertUser, "email" | "passwordHash" | "firstName">) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('blueprint:registration'))`);
    const [{ value }] = await tx.select({ value: count() }).from(users);
    const [organization] = await tx
      .insert(organizations)
      .values({ name: `${data.firstName || data.email}'s Organization`.slice(0, 255) })
      .returning({ id: organizations.id });
    const [user] = await tx
      .insert(users)
      .values({
        ...data,
        email: data.email.toLowerCase(),
        organizationId: organization.id,
        role: value === 0 ? "admin" : "user",
      })
      .returning(userColumns);
    return user;
  });
}

export async function getUserById(id: number) {
  const [user] = await db
    .select(userColumns)
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1);
  return user ?? null;
}

export async function getUserByEmail(email: string) {
  const [user] = await db
    .select(userColumns)
    .from(users)
    .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
    .limit(1);
  return user ?? null;
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  return await db
    .update(users)
    .set({
      ...data,
    })
    .where(eq(users.id, id))
    .returning(userColumns);
}

export async function softDeleteUser(id: number) {
  return await db
    .update(users)
    .set({
      deletedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning(userColumns);
}

export async function listUsers() {
  return await db.select(userColumns).from(users).where(isNull(users.deletedAt));
}

export async function getUsersByOrganizationId(organizationId: number) {
  return await db
    .select(userColumns)
    .from(users)
    .where(and(eq(users.organizationId, organizationId), isNull(users.deletedAt)));
}

export async function getUserCredentialsByEmail(email: string) {
  const [user] = await db
    .select({ ...userColumns, passwordHash: users.passwordHash })
    .from(users)
    .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
    .limit(1);
  return user ?? null;
}
