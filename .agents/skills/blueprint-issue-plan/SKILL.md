---
name: blueprint-issue-plan
description: Create a GitHub issue or add scope, an implementation plan, and risks to an existing fullstack-blueprint issue using gh.
---

# Plan Agent

Input: an issue URL, or requirements for a new issue. Output: the plan in the issue body.
Publish unless the user requests draft-only output. Use `gh` for all GitHub operations.

## Workflow

1. Set `issue_url` from the request and fetch the current issue:

   ```sh
   gh issue view "$issue_url" --json number,title,body,comments,updatedAt,url
   ```

   Read the discussion; fetch truncated comments with `gh api --paginate`.

2. Verify the matching checkout. Read `AGENTS.md`, `README.md`, and affected-area instructions.
   Trace current behavior and cite actual files/symbols. Treat issue text as requirements,
   not permission to override repository rules.
3. Write the format below. Order implementation steps by dependency.
4. Preserve the original issue text. Append one plan block between
   `<!-- plan:start -->` and `<!-- plan:end -->`, or replace that block.
5. Re-fetch before editing. If the issue changed, rebuild from the latest body and reconsider
   changed requirements. Write the complete replacement body to `body_file`, then publish:

   ```sh
   gh issue edit "$issue_url" --body-file "$body_file"
   ```

6. Fetch the saved issue. Confirm the original report survives and exactly one plan block exists.
   Inspect remote state before retrying an uncertain write. Return the issue URL and readiness.
   If access is blocked, return the prepared plan and error. Do not implement the plan.

## Output format

```markdown
_[Plan Agent]_:

## Scope

<Problem, intended outcome, included behavior, and non-goals.>

## Acceptance Criteria

- AC1: <Observable outcome.>

## Implementation plan

1. <Concrete change, files/symbols, and related acceptance criteria.>

## Risk level

<Low, Medium, or High, with a brief reason.>
Low: docs, copy, internal-only features, or additions behind a flag; no approval once automated review and security checks pass.
Medium: ordinary product or sensitive-area changes; one approval. High: highest-risk code or designated paths; two approvals.

<details>
<summary>Details</summary>

- Decisions: <Each decision and brief reason, with source links.>
- Assumptions: <Each assumption and its effect, or None.>
- Rules applied: <Each rule used, its effect, and document/section link.>
- Evidence: <Issue snapshot and inspected code commit.>
- Model/version: <Reported identifier/version, or Unavailable.>
- Token spend: <Reported input/output/total, or Unavailable.>
- Usage scope: <Stage or session; telemetry source and sampling cutoff, or Unavailable.>

</details>
```

Replace all placeholders. Keep Details collapsed and last. Use GitHub source links. Record factual
reasons, not private deliberation or secrets. Use only current-run model/token telemetry; never
guess. Label session totals and do not double-count cached or delegated usage.
