import type { Route } from "./+types/index";
import { listItems, createItem, softDeleteItem } from "~/db/repositories/items";
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

export async function loader({}: Route.LoaderArgs) {
  const items = await listItems();
  return { items };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const method = request.method;

  // Handle DELETE for soft delete
  if (method === "DELETE") {
    const id = formData.get("id");
    if (!id) {
      return { error: "Item ID is required" };
    }

    const itemId = parseInt(id as string, 10);
    if (isNaN(itemId)) {
      return { error: "Invalid item ID" };
    }

    await softDeleteItem(itemId);
    return redirect(".");
  }

  // Handle POST for create
  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;

  if (!title) {
    return { error: "Title is required" };
  }

  // TODO: Get userId from session/auth
  // For now, using default userId of 4
  await createItem({
    userId: 4,
    title,
    description: description || null,
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

      {actionData?.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

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
