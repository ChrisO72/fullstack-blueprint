import { EllipsisHorizontalIcon, PlusIcon } from "@heroicons/react/16/solid";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/organizations";
import { FieldError } from "~/components/field-error";
import { FormError } from "~/components/form-error";
import { Button } from "~/components/ui-kit/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "~/components/ui-kit/dialog";
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from "~/components/ui-kit/dropdown";
import { Field, Label } from "~/components/ui-kit/fieldset";
import { Heading } from "~/components/ui-kit/heading";
import { Input } from "~/components/ui-kit/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui-kit/table";
import { Textarea } from "~/components/ui-kit/textarea";
import {
  createOrganization,
  getOrganizationById,
  listOrganizations,
  softDeleteOrganization,
  updateOrganization,
} from "~/db/repositories/organizations";
import { getUsersByOrganizationId, listUsers } from "~/db/repositories/users";
import { parseForm, type ActionData } from "~/lib/form";
import { requireAdmin } from "~/lib/session.server";

const organizationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255, "Name is too long"),
  description: z.string().trim().max(2000, "Description is too long").optional(),
});

const organizationWithIdSchema = organizationSchema.extend({
  id: z.coerce.number({ message: "Invalid organization ID" }).positive("Invalid organization ID"),
});

const organizationIdSchema = z.object({
  id: z.coerce.number({ message: "Invalid organization ID" }).positive("Invalid organization ID"),
});

type OrganizationActionData = ActionData & { ok?: true };

export async function loader({ context }: Route.LoaderArgs) {
  const { user } = requireAdmin(context);
  const [organizations, users] = await Promise.all([listOrganizations(), listUsers()]);
  const userCounts = new Map<number, number>();

  for (const organizationUser of users) {
    userCounts.set(
      organizationUser.organizationId,
      (userCounts.get(organizationUser.organizationId) ?? 0) + 1,
    );
  }

  return {
    organizations: organizations.map((organization) => ({
      ...organization,
      userCount: userCounts.get(organization.id) ?? 0,
    })),
    currentOrganizationId: user.organizationId,
  };
}

export async function action({
  request,
  context,
}: Route.ActionArgs): Promise<OrganizationActionData> {
  const { user } = requireAdmin(context);
  const formData = await request.formData();

  if (request.method === "POST") {
    const { data, fieldErrors } = parseForm(formData, organizationSchema);
    if (fieldErrors) return { fieldErrors };

    await createOrganization({
      name: data.name,
      description: data.description || null,
    });
    return { ok: true };
  }

  if (request.method === "PATCH") {
    const { data, fieldErrors } = parseForm(formData, organizationWithIdSchema);
    if (fieldErrors) return { fieldErrors };

    const organization = await getOrganizationById(data.id);
    if (!organization) return { formError: "Organization not found." };

    await updateOrganization(data.id, {
      name: data.name,
      description: data.description || null,
    });
    return { ok: true };
  }

  if (request.method === "DELETE") {
    const { data, fieldErrors } = parseForm(formData, organizationIdSchema);
    if (fieldErrors) return { fieldErrors };
    if (data.id === user.organizationId) {
      return { formError: "You cannot delete your own organization." };
    }

    const organization = await getOrganizationById(data.id);
    if (!organization) return { formError: "Organization not found." };

    const organizationUsers = await getUsersByOrganizationId(data.id);
    if (organizationUsers.length > 0) {
      return { formError: "Delete the organization's users before deleting the organization." };
    }

    await softDeleteOrganization(data.id);
    return { ok: true };
  }

  return { formError: "Unsupported request method." };
}

export default function AdminOrganizationsPage({ loaderData }: Route.ComponentProps) {
  const { organizations, currentOrganizationId } = loaderData;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <Heading>
          Organizations
          {organizations.length > 0 && (
            <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
              ({organizations.length} total)
            </span>
          )}
        </Heading>
        <CreateOrganizationDialog />
      </div>

      {organizations.length === 0 ? (
        <div className="rounded-lg bg-zinc-50 py-12 text-center dark:bg-zinc-900">
          <p className="text-zinc-500 dark:text-zinc-400">No organizations found.</p>
        </div>
      ) : (
        <div className="overflow-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>ID</TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Users</TableHeader>
                <TableHeader>Created</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {organizations.map((organization) => (
                <TableRow key={organization.id}>
                  <TableCell className="font-medium">{organization.id}</TableCell>
                  <TableCell>{organization.name}</TableCell>
                  <TableCell>{organization.description || "-"}</TableCell>
                  <TableCell>{organization.userCount}</TableCell>
                  <TableCell>{organization.createdAt.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <OrganizationActions
                      organization={organization}
                      canDelete={
                        organization.id !== currentOrganizationId && organization.userCount === 0
                      }
                    />
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

function CreateOrganizationDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const fetcher = useFetcher<typeof action>();
  const formRef = useRef<HTMLFormElement>(null);
  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      formRef.current?.reset();
      setIsOpen(false);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <PlusIcon data-slot="icon" />
        New organization
      </Button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
        <DialogTitle>Create organization</DialogTitle>
        <DialogDescription>Add an organization that users can belong to.</DialogDescription>
        <DialogBody>
          <fetcher.Form ref={formRef} method="POST" id="create-organization" className="space-y-6">
            <FormError actionData={fetcher.data} />
            <OrganizationFields actionData={fetcher.data} disabled={isSubmitting} />
          </fetcher.Form>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setIsOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="create-organization" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function OrganizationActions({
  organization,
  canDelete,
}: {
  organization: Route.ComponentProps["loaderData"]["organizations"][number];
  canDelete: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const updateFetcher = useFetcher<typeof action>();
  const deleteFetcher = useFetcher<typeof action>();
  const isUpdating = updateFetcher.state !== "idle";

  useEffect(() => {
    if (updateFetcher.state === "idle" && updateFetcher.data?.ok) {
      setIsEditing(false);
    }
  }, [updateFetcher.state, updateFetcher.data]);

  const handleDelete = () => {
    if (!window.confirm(`Delete ${organization.name}?`)) return;
    deleteFetcher.submit({ id: organization.id.toString() }, { method: "DELETE" });
  };

  return (
    <>
      <Dropdown>
        <DropdownButton plain aria-label={`Manage ${organization.name}`}>
          <EllipsisHorizontalIcon data-slot="icon" />
        </DropdownButton>
        <DropdownMenu>
          <DropdownItem onClick={() => setIsEditing(true)}>Edit</DropdownItem>
          <DropdownItem onClick={handleDelete} disabled={!canDelete}>
            Delete
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>

      <Dialog open={isEditing} onClose={() => setIsEditing(false)}>
        <DialogTitle>Edit organization</DialogTitle>
        <DialogDescription>Update this organization&apos;s details.</DialogDescription>
        <DialogBody>
          <updateFetcher.Form
            method="PATCH"
            id={`edit-organization-${organization.id}`}
            className="space-y-6"
          >
            <input type="hidden" name="id" value={organization.id} />
            <FormError actionData={updateFetcher.data} />
            <OrganizationFields
              organization={organization}
              actionData={updateFetcher.data}
              disabled={isUpdating}
            />
          </updateFetcher.Form>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setIsEditing(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button type="submit" form={`edit-organization-${organization.id}`} disabled={isUpdating}>
            {isUpdating ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function OrganizationFields({
  organization,
  actionData,
  disabled,
}: {
  organization?: { name: string; description: string | null };
  actionData?: OrganizationActionData;
  disabled: boolean;
}) {
  return (
    <>
      <Field>
        <Label>Name</Label>
        <Input
          name="name"
          defaultValue={organization?.name}
          required
          maxLength={255}
          disabled={disabled}
          invalid={!!actionData?.fieldErrors?.name}
          autoFocus
        />
        <FieldError name="name" actionData={actionData} />
      </Field>
      <Field>
        <Label>Description</Label>
        <Textarea
          name="description"
          defaultValue={organization?.description ?? ""}
          rows={4}
          maxLength={2000}
          disabled={disabled}
          invalid={!!actionData?.fieldErrors?.description}
        />
        <FieldError name="description" actionData={actionData} />
      </Field>
    </>
  );
}
