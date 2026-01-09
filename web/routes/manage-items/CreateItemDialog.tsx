import { useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import { Button } from "../../components/ui-kit/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "../../components/ui-kit/dialog";
import { Field, Label, ErrorMessage } from "../../components/ui-kit/fieldset";
import { Input } from "../../components/ui-kit/input";
import { PlusIcon } from "@heroicons/react/24/outline";

export function CreateItemDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const actionData = useActionData<{ error?: string }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <PlusIcon data-slot="icon" />
        Create Item
      </Button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
        <DialogTitle>Create Item</DialogTitle>
        <DialogDescription>Add a new item to your list.</DialogDescription>
        <Form method="post">
          <DialogBody>
            {actionData?.error && (
              <ErrorMessage>{actionData.error}</ErrorMessage>
            )}
            <Field>
              <Label>Title</Label>
              <Input
                type="text"
                name="title"
                placeholder="Enter item title"
                required
                disabled={isSubmitting}
              />
            </Field>
            <Field>
              <Label>Description</Label>
              <Input
                type="text"
                name="description"
                placeholder="Enter item description (optional)"
                disabled={isSubmitting}
              />
            </Field>
          </DialogBody>
          <DialogActions>
            <Button
              plain
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogActions>
        </Form>
      </Dialog>
    </>
  );
}
