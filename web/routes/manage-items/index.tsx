import type { Route } from "./+types/index";
import { listItemsByOrg, createItem, softDeleteItem } from "~/db/repositories/items";
import { requireAuth } from "~/lib/session.server";
import { getUserById } from "~/db/repositories/users";
import { Heading } from "../../components/ui-kit/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui-kit/table";
import { CreateItemDialog } from "./CreateItemDialog";
import { redirect, useSubmit } from "react-router";
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from "../../components/ui-kit/dropdown";
import { EllipsisHorizontalIcon } from "@heroicons/react/16/solid";
import { z } from "zod";

const createItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
});

const deleteItemSchema = z.object({
  id: z.coerce.number({ message: "Invalid item ID" }).positive("Invalid item ID"),
});

export type ActionData =
  | { success: false; errors: Record<string, string[] | undefined> }
  | undefined;

export async function loader({ request }: Route.LoaderArgs) {
  const auth = await requireAuth(request);
  const user = await getUserById(auth.userId);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const items = await listItemsByOrg(user.organizationId);
  return { items, organizationId: user.organizationId };
}

export async function action({ request }: Route.ActionArgs) {
  const auth = await requireAuth(request);
  const user = await getUserById(auth.userId);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  // Handle DELETE
  if (request.method === "DELETE") {
    const result = deleteItemSchema.safeParse(data);
    if (!result.success) {
      return { success: false, errors: z.flattenError(result.error).fieldErrors };
    }
    await softDeleteItem(result.data.id, user.organizationId);
    return redirect(".");
  }

  // Handle POST (create)
  const result = createItemSchema.safeParse(data);
  if (!result.success) {
    return { success: false, errors: z.flattenError(result.error).fieldErrors };
  }

  await createItem({
    organizationId: user.organizationId,
    title: result.data.title,
    description: result.data.description ?? null,
  });

  return redirect(".");
}

export default function ManageItemsPage({ loaderData, actionData }: Route.ComponentProps) {
  const { items } = loaderData;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <Heading>
          Manage Items
          {items.length > 0 && (
            <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
              ({items.length} total)
            </span>
          )}
        </Heading>
        <CreateItemDialog />
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg bg-zinc-50 py-12 text-center dark:bg-zinc-900">
          <p className="text-zinc-500 dark:text-zinc-400">No items found.</p>
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>ID</TableHeader>
              <TableHeader>Title</TableHeader>
              <TableHeader>Description</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Priority</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.id}</TableCell>
                <TableCell>{item.title}</TableCell>
                <TableCell>{item.description || "-"}</TableCell>
                <TableCell>{item.status}</TableCell>
                <TableCell>{item.priority || 0}</TableCell>
                <TableCell>
                  <ItemActions itemId={item.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function ItemActions({ itemId }: { itemId: number }) {
  const submit = useSubmit();

  const handleDelete = () => {
    const formData = new FormData();
    formData.append("id", itemId.toString());
    submit(formData, { method: "DELETE" });
  };

  return (
    <Dropdown>
      <DropdownButton plain aria-label="More options">
        <EllipsisHorizontalIcon data-slot="icon" />
      </DropdownButton>
      <DropdownMenu>
        <DropdownItem href={`/manage-items/${itemId}`}>View</DropdownItem>
        <DropdownItem onClick={handleDelete}>Delete</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
