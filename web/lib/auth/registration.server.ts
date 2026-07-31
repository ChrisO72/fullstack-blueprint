import { createOrganization } from "~/db/repositories/organizations";
import { countUsers, createUser } from "~/db/repositories/users";
import { hashPassword } from "./password.server";

export async function createUserWithPassword(email: string, password: string, firstname?: string) {
  const passwordHash = await hashPassword(password);
  const isFirstUser = (await countUsers()) === 0;

  const [org] = await createOrganization({
    name: `${firstname || email}'s Organization`,
  });

  const [user] = await createUser({
    email: email.toLowerCase(),
    passwordHash,
    firstName: firstname || null,
    organizationId: org.id,
    role: isFirstUser ? "admin" : "user",
  });

  return user;
}
