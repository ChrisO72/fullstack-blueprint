import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { FormError } from "~/components/form-error";
import { Button } from "~/components/ui-kit/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "~/components/ui-kit/dialog";
import { Description, ErrorMessage, Field, Label } from "~/components/ui-kit/fieldset";
import type { FileActionData } from "./index";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function UploadFileDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [clientError, setClientError] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | undefined>(undefined);
  const handledPreparationRef = useRef<number | undefined>(undefined);
  const handledFinishRef = useRef<string | undefined>(undefined);
  const prepareFetcher = useFetcher<FileActionData>();
  const finishFetcher = useFetcher<FileActionData>();
  const revalidator = useRevalidator();

  const busy = isUploading || prepareFetcher.state !== "idle" || finishFetcher.state !== "idle";

  useEffect(() => {
    if (prepareFetcher.state !== "idle") return;

    if (prepareFetcher.data?.formError || prepareFetcher.data?.fieldErrors) {
      setIsUploading(false);
      return;
    }

    const prepared = prepareFetcher.data?.prepared;
    const selectedFile = selectedFileRef.current;
    if (!prepared || !selectedFile || handledPreparationRef.current === prepared.fileId) return;

    handledPreparationRef.current = prepared.fileId;

    void (async () => {
      try {
        const uploadData = new FormData();
        for (const [name, value] of Object.entries(prepared.fields)) {
          uploadData.append(name, value);
        }
        uploadData.append("file", selectedFile);

        const response = await fetch(prepared.url, {
          method: "POST",
          body: uploadData,
        });
        if (!response.ok) {
          throw new Error(`Object storage returned ${response.status}`);
        }

        const confirmData = new FormData();
        confirmData.set("intent", "confirm");
        confirmData.set("fileId", prepared.fileId.toString());
        finishFetcher.submit(confirmData, { method: "POST" });
      } catch (error) {
        console.error("Direct file upload failed", error);
        setClientError("The file could not be uploaded. Please try again.");
        setIsUploading(false);

        const failData = new FormData();
        failData.set("intent", "fail");
        failData.set("fileId", prepared.fileId.toString());
        finishFetcher.submit(failData, { method: "POST" });
      }
    })();
  }, [finishFetcher, prepareFetcher.data, prepareFetcher.state]);

  useEffect(() => {
    if (finishFetcher.state !== "idle" || !finishFetcher.data?.fileId) return;

    const resultKey = `${finishFetcher.data.intent}:${finishFetcher.data.fileId}`;
    if (handledFinishRef.current === resultKey) return;
    handledFinishRef.current = resultKey;
    setIsUploading(false);

    if (finishFetcher.data.intent === "confirm" && finishFetcher.data.success) {
      fileInputRef.current?.form?.reset();
      selectedFileRef.current = undefined;
      setClientError(undefined);
      setIsOpen(false);
      void revalidator.revalidate();
    } else if (finishFetcher.data.intent === "fail") {
      void revalidator.revalidate();
    }
  }, [finishFetcher.data, finishFetcher.state, revalidator]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClientError(undefined);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setClientError("Choose a file to upload.");
      return;
    }
    if (file.size === 0) {
      setClientError("The selected file is empty.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setClientError("Files must be 25 MB or smaller.");
      return;
    }

    selectedFileRef.current = file;
    setIsUploading(true);

    const prepareData = new FormData();
    prepareData.set("intent", "prepare");
    prepareData.set("filename", file.name);
    prepareData.set("contentType", file.type || "application/octet-stream");
    prepareData.set("size", file.size.toString());
    prepareFetcher.submit(prepareData, { method: "POST" });
  };

  const closeDialog = () => {
    if (!busy) setIsOpen(false);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <ArrowUpTrayIcon data-slot="icon" />
        Upload file
      </Button>

      <Dialog open={isOpen} onClose={closeDialog}>
        <DialogTitle>Upload a private file</DialogTitle>
        <DialogDescription>
          The file uploads directly to private object storage and is available only to your
          organization.
        </DialogDescription>
        <DialogBody>
          <prepareFetcher.Form id="upload-file" method="post" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <FormError actionData={prepareFetcher.data} />
              <FormError actionData={finishFetcher.data} />
              {clientError && <ErrorMessage>{clientError}</ErrorMessage>}
              <Field>
                <Label htmlFor="private-file">File</Label>
                <input
                  ref={fileInputRef}
                  id="private-file"
                  name="file"
                  type="file"
                  required
                  disabled={busy}
                  className="block w-full rounded-lg border border-zinc-950/10 bg-transparent px-3 py-2 text-sm text-zinc-950 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-950 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:opacity-50 dark:border-white/10 dark:text-white dark:file:bg-white dark:file:text-zinc-950"
                />
                <Description>Maximum size: 25 MB.</Description>
              </Field>
            </div>
          </prepareFetcher.Form>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={closeDialog} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="upload-file" disabled={busy}>
            {busy ? "Uploading..." : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
