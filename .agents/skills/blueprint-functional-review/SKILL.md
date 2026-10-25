---
name: blueprint-functional-review
description: Test changed fullstack-blueprint behavior through a browser or CLI and comment observed results on the supplied GitHub issue or PR using gh.
---

# Functional Review Agent

Input: an issue/PR URL and a local or designated test environment. Output: one results comment
on that issue/PR. Publish unless the user requests draft-only output. Do not fix code during review.

## Workflow

1. Set `target_url`. Run the command matching its URL type:

   ```sh
   gh issue view "$target_url" --json title,body,comments,updatedAt,url
   gh pr view "$target_url" --json title,body,comments,headRefOid,closingIssuesReferences,url
   ```

   For a PR, read its diff with `gh pr diff` and linked issue with `gh issue view`. For an issue,
   read its linked implementation PR. Fetch truncated discussion with `gh api --paginate`.

2. Read `AGENTS.md`, `README.md`, and affected-area instructions. Establish the acceptance criteria,
   code revision, test URL/CLI, and evidence that the running target contains that revision.
   Mark scenarios Blocked when access, fixtures, or revision identity cannot be established.
3. Before startup, read `Makefile`, `compose.yml`, and relevant operating guides. `make dev` runs
   migrations and uses fixed ports/network names and persistent volumes. Verify the stack is
   suitable for testing; a separate worktree alone is not isolation. Use disposable fixtures/test
   accounts. Do not reset existing data or use production, real email delivery, paid integrations,
   or shared-data mutations without authorization for those actions.
4. Exercise acceptance criteria and relevant validation, permission, failure, and state-transition
   cases. Use the browser for changed UI and CLI/API calls for service behavior. Record preconditions,
   actions, expected/observed results, and evidence. Verify resulting state; a click, HTTP success,
   or queued job alone does not prove completion. Bound waits for asynchronous work.
5. Assign each scenario Pass, Fail, Blocked, or Not run. Overall Pass requires every required
   scenario to pass; Fail means a demonstrated defect; Incomplete means required scenarios remain
   unverified. Include failure reproduction steps. Do not report unit checks as runtime evidence.
6. Remove only fixtures and stop only processes started for this review, unless asked to retain them.
   Re-fetch the issue/PR. If requirements or code changed, rerun affected scenarios or mark the result
   Incomplete; never transfer a pass to an untested revision.
7. Write `report_file` using the format below. Run the command matching the original target type:

   ```sh
   gh issue comment "$target_url" --body-file "$report_file"
   gh pr comment "$target_url" --body-file "$report_file"
   ```

8. Verify the comment and return its URL. Inspect remote state before retrying an uncertain write.
   If publication is blocked, return the report and error. Include sanitized evidence in the comment
   or accessible attachments, not local filesystem links readers cannot open.

## Output format

```markdown
**[Functional Review Agent]**: <Pass | Fail | Incomplete>

<Tested revision and environment.>

| Criterion/scenario | Expected           | Observed             | Result   | Evidence   |
| ------------------ | ------------------ | -------------------- | -------- | ---------- |
| <AC1 and actions>  | <Expected outcome> | <Actual observation> | <Status> | <Evidence> |

<Failure reproduction steps and remaining untested criteria.>

<details>
<summary>Details</summary>

- Decisions: <Each decision and brief reason, with source links.>
- Assumptions: <Each assumption and its effect, or None.>
- Rules applied: <Each rule used, its effect, and document/section link.>
- Evidence: <Revision/environment identity, fixtures, and cleanup status.>
- Model/version: <Reported identifier/version, or Unavailable.>
- Token spend: <Reported input/output/total, or Unavailable.>
- Usage scope: <Stage or session; telemetry source and sampling cutoff, or Unavailable.>

</details>
```

Replace all placeholders. Keep Details collapsed and last. Use GitHub source links. Record factual
reasons, not private deliberation or secrets. Use only current-run model/token telemetry; never
guess. Label session totals and do not double-count cached or delegated usage.
