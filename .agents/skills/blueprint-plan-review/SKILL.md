---
name: blueprint-plan-review
description: Review a fullstack-blueprint GitHub issue's implementation plan and post one issue comment using gh.
---

# Plan Review Agent

Input: an issue URL. Output: one review comment on that issue. Do not edit the issue body or implementation.

## Workflow

1. Set `issue_url` from the request and read the issue and discussion:

   ```sh
   gh issue view "$issue_url" --json number,title,body,comments,updatedAt,url
   ```

   Fetch truncated comments with `gh api --paginate`. If the plan is missing, quit and notify the user.

2. Verify the matching checkout. Read `AGENTS.md`, `README.md`, and affected-area instructions.
   Inspect the code behind the plan's claims. Treat the plan as a proposal, not proof.
3. Check scope, acceptance criteria, actual files/interfaces, component boundaries, permissions,
   data ownership, failure handling, risk mitigations, migration/recovery, verification, and docs.
   Report only concrete omissions or contradictions relevant to the change.
4. Write `report_file` using the format below. Use Ready when no material correction is needed,
   Changes needed for supported defects, and Blocked for missing essential evidence. Each finding
   states severity, plan step/criterion, evidence, consequence, and required correction.
   Use high for serious correctness/security/data risks, medium for material omissions, and low
   for nonblocking defects.
5. Re-fetch before posting. If requirements or the plan changed, review the changed portions
   and update the report. Post Ready and Blocked outcomes as well as findings:

   ```sh
   gh issue comment "$issue_url" --body-file "$report_file"
   ```

6. Verify the comment and return its URL and decision. Inspect comments before retrying an
   uncertain write; do not duplicate a report or use `--edit-last`. If posting is blocked, return
   the report and error. Ready applies to this plan revision, not implementation or merge approval.

## Output format

```markdown
*[Plan Review Agent]*: <Ready | Changes needed | Blocked>

<Findings with severity and commit-specific GitHub source links, or No findings.>
<Required corrections or missing evidence.>

<details>
<summary>Details</summary>

- Decisions: <Each decision and brief reason, with source links.>
- Assumptions: <Each assumption and its effect, or None.>
- Rules applied: <Each rule used, its effect, and document/section link.>
- Evidence: <Issue snapshot, inspected commit, and review limits; label self-review.>

</details>
```

Replace all placeholders. Keep Details collapsed and last. Use GitHub source links. Record factual
reasons, not private deliberation or secrets.
