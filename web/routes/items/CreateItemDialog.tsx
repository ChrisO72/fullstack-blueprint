import { useEffect, useRef, useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import { Button } from "~/components/ui-kit/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "~/components/ui-kit/dialog";
import { Field, Label } from "~/components/ui-kit/fieldset";
import { FieldError } from "~/components/field-error";
import { Input } from "~/components/ui-kit/input";
import { PlusIcon } from "@heroicons/react/24/outline";
import type { ActionData } from "~/lib/form";

export function CreateItemDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const formRef = useRef<HTMLFormElement>(null);

  // Reset form and close dialog on successful submission
  useEffect(() => {
    if (navigation.state === "idle" && !actionData?.fieldErrors) {
      formRef.current?.reset();
      setIsOpen(false);
    }
  }, [navigation.state, actionData]);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <PlusIcon data-slot="icon" />
        Create Item
      </Button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
        <DialogTitle>Create Item</DialogTitle>
        <DialogDescription>Add a new item to your list.</DialogDescription>
        <DialogBody>
          <Form ref={formRef} method="post" id="create-item" className="grid grid-cols-1 gap-8">
            <Field>
              <Label>Title</Label>
              <Input
                type="text"
                name="title"
                placeholder="Enter item title"
                required
                disabled={isSubmitting}
                invalid={!!actionData?.fieldErrors?.title}
                autoFocus
              />
              <FieldError name="title" actionData={actionData} />
            </Field>
            <Field>
              <Label>Description</Label>
              <Input
                type="text"
                name="description"
                placeholder="Enter item description (optional)"
                disabled={isSubmitting}
                invalid={!!actionData?.fieldErrors?.description}
              />
              <FieldError name="description" actionData={actionData} />
            </Field>
          </Form>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setIsOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="create-item" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
