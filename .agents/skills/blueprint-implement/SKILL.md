---
name: blueprint-implement
description: Implement a fullstack-blueprint GitHub issue, run checks, sync docs, and comment the result using gh. Open a draft PR when requested.
---

# Dev Agent

Input: an issue URL. Output: implementation and a completion/blocker comment on the issue.
Create a draft PR when requested. Use `gh`; publish the report unless the user requests local-only work.

## Workflow

1. Set `issue_url` and fetch the current plan and review discussion:

   ```sh
   gh issue view "$issue_url" --json number,title,body,comments,updatedAt,url
   ```

   Read linked review results; fetch truncated discussion with `gh api --paginate`. Verify the
   matching checkout and read `AGENTS.md`, `README.md`, and affected-area instructions.

2. Inspect branch/status. Reuse the issue's task branch or create a `codex/` branch. Use an isolated
   worktree when the current checkout has unrelated changes. Preserve all user work.
3. Implement the acceptance criteria. Reconcile the plan with current code and review findings.
   Resolve blocking product/security/data decisions before dependent edits. Record deviations
   and reasons; do not silently change requirements to fit the implementation.
4. Add minimal behavior-focused unit coverage in the owning component's `test/` directory using
   in-memory dependencies. Apply [blueprint-docs-sync](../blueprint-docs-sync/SKILL.md) in caller mode:
   it returns documentation changes and audit notes without a separate GitHub comment.
5. Run `npm run check` after the combined edits. Fix failures caused by this work, rerun after
   fixes, and inspect formatting changes. Report remaining failures or blocked checks. Use
   [blueprint-functional-review](../blueprint-functional-review/SKILL.md) only when runtime review
   is requested; a passing check does not establish runtime behavior.
6. If a draft PR was requested, commit/push only task-owned changes. Resolve the actual target/head
   branches and check for an existing PR on this branch before creating another. Write the Dev Agent
   report below to `pr_body_file`, including the issue link:

   ```sh
   gh pr create --repo "$repository" --base "$base_branch" --head "$head_branch" --draft --title "$pr_title" --body-file "$pr_body_file"
   ```

   Verify the PR's base, head, and draft status with `gh pr view`. Do not merge or deploy.

7. Re-read the issue; disclose newly changed requirements that remain unimplemented. Write
   `report_file` using the same format, linking the confirmed PR or identifying local-only work:

   ```sh
   gh issue comment "$issue_url" --body-file "$report_file"
   ```

8. Verify the comment and return its URL, the PR URL when present, and check results. Inspect
   remote state before retrying uncertain writes. If publication fails, retain the work and report
   the error. Do not present uncommitted or unpushed work as available on GitHub.

## Output format

```markdown
**[Dev Agent]**: <Implemented | Blocked>

<Issue link; resulting behavior; acceptance criteria delivered or still missing.>
<Check results, documentation changes, remaining risks, and PR link when available.>

<details>
<summary>Details</summary>

- Decisions: <Each decision and brief reason, with source links.>
- Assumptions: <Each assumption and its effect, or None.>
- Rules applied: <Each rule used, its effect, and document/section link.>
- Evidence: <Issue snapshot, code revision/local changes, and verification performed or not run.>
- Model/version: <Reported identifier/version, or Unavailable.>
- Token spend: <Reported input/output/total, or Unavailable.>
- Usage scope: <Stage or session; telemetry source and sampling cutoff, or Unavailable.>

</details>
```

Replace all placeholders. Keep Details collapsed and last. Use GitHub source links. Record factual
reasons, not private deliberation or secrets. Use only current-run model/token telemetry; never
guess. Label session totals and do not double-count cached or delegated usage.
