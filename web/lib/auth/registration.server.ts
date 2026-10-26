import { registerUser } from "~/db/repositories/users";
import { hashPassword } from "./password.server";

export async function createUserWithPassword(email: string, password: string, firstname?: string) {
  const passwordHash = await hashPassword(password);
  return registerUser({
    email,
    passwordHash,
    firstName: firstname || null,
  });
}
