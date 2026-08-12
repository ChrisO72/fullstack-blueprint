import { createOrganization } from "~/db/repositories/organizations";
import { createUser } from "~/db/repositories/users";

export async function createTestOrganization(name: string) {
  const [organization] = await createOrganization({ name });
  if (!organization) throw new Error("Failed to create test organization");
  return organization;
}

export async function createTestUser(organizationId: number, email: string, passwordHash?: string) {
  const [user] = await createUser({ organizationId, email, passwordHash });
  if (!user) throw new Error("Failed to create test user");
  return user;
}
