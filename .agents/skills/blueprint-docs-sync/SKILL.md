---
name: blueprint-docs-sync
description: Update documentation for a fullstack-blueprint PR on its existing branch and comment the result using gh. Also supports implementation handoff before a PR exists.
---

# Docs Sync Agent

Input: a PR URL, or the implementation diff supplied by the Dev Agent.
Output: documentation changes on the implementation branch and a results report.
For a PR request, publish the edits and comment. Report-only means no edits; draft-only/local-only
means no push or GitHub comment.

## Workflow

1. For a PR request, set `pr_url` and fetch the current PR:

   ```sh
   gh pr view "$pr_url" --json title,body,comments,baseRefName,baseRefOid,headRefName,headRefOid,headRepository,headRepositoryOwner,closingIssuesReferences,url
   gh pr diff "$pr_url"
   ```

   Read linked issues with `gh issue view`; fetch truncated discussion with `gh api --paginate`.
   Use a checkout of the PR head branch. Preserve user changes; use an isolated worktree when needed.
   Do not create a separate documentation branch or PR.

2. Read `AGENTS.md`, `README.md`, and affected-area instructions. Compare code with documented
   behavior, commands, configuration, permissions, failure handling, and examples. Follow affected
   links and search for changed symbols/commands.
3. Update owning component READMEs/topic guides. Use root `README.md` for whole-app commands,
   `.env.example` for public configuration, `docs/code-organization.md` for shared boundaries,
   and affected `AGENTS.md`/skills for workflow rules. Check defaults against `config.ts` and
   Compose wiring; never copy private `.env` values. Read deeper instructions before editing.
4. Edit only stale or missing documentation. Report code/acceptance-criteria contradictions rather
   than documenting a bug as intended behavior. Do not edit generated files. If no update is needed,
   report which documents remain accurate. Report-only mode makes no edits.
5. Verify changed links/examples against the code and run `npm run check` after edits. Fix failures
   caused by this work. If checks fail, leave edits local and report the blocker.
6. With changes and passing checks, commit only task-owned documentation and push to the verified
   existing PR head remote/branch. Re-fetch the PR and confirm those edits are included. Reconcile
   a concurrently changed head before pushing; never force-push. Local-only mode leaves edits unpushed.
7. Write `report_file` using the format below and post to the same PR, including no-change outcomes:

   ```sh
   gh pr comment "$pr_url" --body-file "$report_file"
   ```

   Explicit draft-only/local-only output stays in chat. Verify the comment and return its URL.
   Inspect comments before retrying an uncertain write. If access is blocked, return the report and error.

## Caller mode

When the Dev Agent calls this skill, perform steps 2–4 on its implementation diff, including
task-owned local changes. Return the report and audit to the caller. Do not commit, push, or post
separately. The Dev Agent runs `npm run check` on the combined edits and publishes the combined result.

## Output format

```markdown
**[Docs Sync Agent]**: <Updated | No changes needed | Blocked>

<Documents changed and why, or documents checked and why they remain accurate.>
<PR/commit link, check results, and unpublished edits or blockers.>

<details>
<summary>Details</summary>

- Decisions: <Each decision and brief reason, with source links.>
- Assumptions: <Each assumption and its effect, or None.>
- Rules applied: <Each rule used, its effect, and document/section link.>
- Evidence: <Implementation revision, documentation inspected, and verification results.>
- Model/version: <Reported identifier/version, or Unavailable.>
- Token spend: <Reported input/output/total, or Unavailable.>
- Usage scope: <Stage or session; telemetry source and sampling cutoff, or Unavailable.>

</details>
```

Replace all placeholders. Keep Details collapsed and last. Use GitHub source links. Record factual
reasons, not private deliberation or secrets. Use only current-run model/token telemetry; never
guess. Label session totals and do not double-count cached or delegated usage.
