import { useState } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/index";
import { requireAdmin } from "~/lib/session.server";
import { getSiteSettings, updateSiteSettings } from "~/db/repositories/settings";
import { Heading } from "../../components/ui-kit/heading";
import { Description, Field, FieldGroup, Fieldset, Label } from "../../components/ui-kit/fieldset";
import { Input } from "../../components/ui-kit/input";
import { Button } from "../../components/ui-kit/button";
import { Switch, SwitchField } from "../../components/ui-kit/switch";
import { Badge } from "../../components/ui-kit/badge";
import { XMarkIcon } from "@heroicons/react/16/solid";


const settingsSchema = z.object({
  allowedDomains: z.array(z.string().trim().min(1)).default([]),
  requireMailConfirmation: z.boolean().default(false),
});

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const settings = await getSiteSettings();
  return { settings };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);

  const formData = await request.formData();

  const domains = formData.getAll("allowedDomains").map((v) => String(v));
  const requireMailConfirmation = formData.get("requireMailConfirmation") === "true";

  const result = settingsSchema.safeParse({ allowedDomains: domains, requireMailConfirmation });
  if (!result.success) {
    return { success: false, errors: z.flattenError(result.error).fieldErrors };
  }

  await updateSiteSettings(result.data);
  return { success: true, errors: null };
}

export default function AdminSettingsPage({ loaderData }: Route.ComponentProps) {
  const { settings } = loaderData;
  const fetcher = useFetcher<typeof action>();

  const [domains, setDomains] = useState<string[]>(settings.allowedDomains ?? []);
  const [domainInput, setDomainInput] = useState("");
  const [mailConfirmation, setMailConfirmation] = useState(settings.requireMailConfirmation);

  const addDomain = () => {
    const value = domainInput.trim().toLowerCase();
    if (value && !domains.includes(value)) {
      setDomains([...domains, value]);
    }
    setDomainInput("");
  };

  const removeDomain = (domain: string) => {
    setDomains(domains.filter((d) => d !== domain));
  };

  const isSaving = fetcher.state !== "idle";
  const saved = fetcher.data?.success === true && fetcher.state === "idle";

  return (
    <div>
      <Heading>Settings</Heading>

      <fetcher.Form method="PUT" className="mt-8 max-w-2xl">
        <Fieldset>
          <FieldGroup>
            <Field>
              <Label>Allowed signup domains</Label>
              <Description>
                Only users with email addresses from these domains can create an account. Leave
                empty to allow all domains.
              </Description>

              <div className="mt-3 flex gap-2">
                <Input
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDomain();
                    }
                  }}
                  placeholder="example.com"
                  className="flex-1"
                />
                <Button type="button" onClick={addDomain} outline>
                  Add
                </Button>
              </div>

              {domains.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {domains.map((domain) => (
                    <Badge key={domain} color="zinc">
                      {domain}
                      <button
                        type="button"
                        onClick={() => removeDomain(domain)}
                        className="ml-1 -mr-0.5 inline-flex items-center"
                      >
                        <XMarkIcon className="size-3.5" />
                      </button>
                      <input type="hidden" name="allowedDomains" value={domain} />
                    </Badge>
                  ))}
                </div>
              )}
            </Field>

            <SwitchField>
              <Label>Require mail confirmation</Label>
              <Description>
                New users must confirm their email address before they can sign in.
              </Description>
              <Switch
                name="requireMailConfirmation"
                checked={mailConfirmation}
                onChange={setMailConfirmation}
                color="dark/zinc"
              />
              <input type="hidden" name="requireMailConfirmation" value={String(mailConfirmation)} />
            </SwitchField>
          </FieldGroup>
        </Fieldset>

        <div className="mt-8 flex items-center gap-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving…" : "Save settings"}
          </Button>
          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400">Settings saved.</span>
          )}
        </div>
      </fetcher.Form>
    </div>
  );
}
