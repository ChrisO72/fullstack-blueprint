import type { Route } from "./+types/users";
import { listUsers, softDeleteUser, updateUser } from "~/db/repositories/users";
import { requireAdmin } from "~/lib/session.server";
import { Heading } from "../../components/ui-kit/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui-kit/table";
import { redirect, useFetcher, useSubmit } from "react-router";
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from "../../components/ui-kit/dropdown";
import { EllipsisHorizontalIcon } from "@heroicons/react/16/solid";
import { z } from "zod";
import { Select } from "../../components/ui-kit/select";
import { parseForm } from "~/lib/form";

const ROLES = ["admin", "user", "viewer"] as const;

const deleteUserSchema = z.object({
  id: z.coerce.number({ message: "Invalid user ID" }).positive("Invalid user ID"),
});

const updateRoleSchema = z.object({
  id: z.coerce.number({ message: "Invalid user ID" }).positive("Invalid user ID"),
  role: z.enum(ROLES, { message: "Invalid role" }),
});

export async function loader({ request }: Route.LoaderArgs) {
  const { user: currentUser } = await requireAdmin(request);
  const users = await listUsers();
  return { users, currentUserId: currentUser.id };
}

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireAdmin(request);

  const formData = await request.formData();

  if (request.method === "DELETE") {
    const { data, errors } = parseForm(formData, deleteUserSchema);
    if (errors) return { errors };
    if (data.id === user.id) {
      return { errors: { id: ["Cannot delete yourself"] } };
    }
    await softDeleteUser(data.id);
    return redirect(".");
  }

  if (request.method === "PATCH") {
    const { data, errors } = parseForm(formData, updateRoleSchema);
    if (errors) return { errors };
    if (data.id === user.id) {
      return { errors: { id: ["Cannot change your own role"] } };
    }
    await updateUser(data.id, { role: data.role });
    return redirect(".");
  }

  return null;
}

export default function AdminUsersPage({ loaderData }: Route.ComponentProps) {
  const { users, currentUserId } = loaderData;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <Heading>
          Users
          {users.length > 0 && (
            <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
              ({users.length} total)
            </span>
          )}
        </Heading>
      </div>

      {users.length === 0 ? (
        <div className="rounded-lg bg-zinc-50 py-12 text-center dark:bg-zinc-900">
          <p className="text-zinc-500 dark:text-zinc-400">No users found.</p>
        </div>
      ) : (
        <div className="overflow-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>ID</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Role</TableHeader>
                <TableHeader>Created</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.id}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") || "-"}
                  </TableCell>
                  <TableCell>
                    <RoleSelect
                      userId={u.id}
                      currentRole={u.role}
                      disabled={u.id === currentUserId}
                    />
                  </TableCell>
                  <TableCell>{u.createdAt.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <UserActions userId={u.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function RoleSelect({
  userId,
  currentRole,
  disabled,
}: {
  userId: number;
  currentRole: string;
  disabled?: boolean;
}) {
  const fetcher = useFetcher();
  const optimisticRole = fetcher.formData ? (fetcher.formData.get("role") as string) : currentRole;

  return (
    <Select
      name="role"
      value={optimisticRole}
      disabled={disabled}
      onChange={(e) => {
        fetcher.submit({ id: userId.toString(), role: e.target.value }, { method: "PATCH" });
      }}
    >
      {ROLES.map((role) => (
        <option key={role} value={role}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </option>
      ))}
    </Select>
  );
}

function UserActions({ userId }: { userId: number }) {
  const submit = useSubmit();

  const handleDelete = () => {
    const formData = new FormData();
    formData.append("id", userId.toString());
    submit(formData, { method: "DELETE" });
  };

  return (
    <Dropdown>
      <DropdownButton plain aria-label="More options">
        <EllipsisHorizontalIcon data-slot="icon" />
      </DropdownButton>
      <DropdownMenu>
        <DropdownItem onClick={handleDelete}>Delete</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
