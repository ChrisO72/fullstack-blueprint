# Repositories

Simple CRUD repository functions for database operations.

## Pattern

Each repository file exports functions for CRUD operations on a specific table.

### Basic Structure

```typescript
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { type InsertUser, users } from "../schema";

// Create
export async function createUser(user: InsertUser) {
  return await db.insert(users).values(user).returning();
}

// Read
export async function getUserById(id: number) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1);
  return user ?? null;
}

// Update
export async function updateUser(id: number, data: Partial<InsertUser>) {
  return await db
    .update(users)
    .set({
      ...data,
    })
    .where(eq(users.id, id))
    .returning();
}

// Soft Delete
export async function softDeleteUser(id: number) {
  return await db
    .update(users)
    .set({
      deletedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
}

// List (excluding soft-deleted)
export async function listUsers() {
  return await db.select().from(users).where(isNull(users.deletedAt));
}
```

## Guidelines

- Always check `deletedAt` is null for reads
- Use soft deletes (set `deletedAt`) instead of hard deletes
- `updatedAt` is updated automatically by the schema's `$onUpdate` — don't set it manually
- Add relationship helpers (e.g., `getItemsByUserId`) as needed
- Keep functions minimal and focused
