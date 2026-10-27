---
name: blueprint-code-review
description: Review a fullstack-blueprint GitHub PR for concrete defects and missed requirements, then post one PR comment using gh.
---

# Code Review Agent

Input: a PR URL. Output: one review comment on that PR. Publish unless the user requests draft-only
output. Keep the checkout unchanged; do not fix code, approve the PR, or resolve discussions.

## Workflow

1. Set `pr_url`. Read the PR and full diff:

   ```sh
   gh pr view "$pr_url" --json number,title,body,baseRefName,baseRefOid,headRefOid,closingIssuesReferences,comments,reviews,url
   gh pr diff "$pr_url"
   ```

   Read linked issues with `gh issue view`. Read inline comments with
   `gh api --hostname "$host" --paginate "repos/$repository/pulls/$number/comments"`, using host,
   OWNER/REPO, and PR number from the URL. Fetch truncated discussion/reviews with paginated API
   reads. For an issue URL, resolve its implementation PR; ask if multiple PRs make the target unclear.

2. Verify the checkout matches the PR head. Read `AGENTS.md`, `README.md`, and affected-area
   instructions. Inspect changed code, callers, and tests against the issue's acceptance criteria.
   Review the complete base-to-head diff, not only the most recent commit.
3. Find concrete defects in correctness, permissions/organization isolation, data integrity,
   compatibility, async retries, cleanup, and failure handling. Check applicable architecture
   rules. Check that relevant documentation, including golden paths and examples, was updated
   to match the implementation; report missing or stale guidance. Exclude style preferences,
   speculative failures, duplicates, and unrelated pre-existing defects.
4. Write `report_file` in the format below. Each finding includes priority, a commit-specific
   GitHub file/line link, triggering condition, consequence, and correction. Use P0 for immediate
   critical impact, P1 for serious defects to fix before merge, P2 for ordinary functional defects,
   and P3 for minor defects. Use No findings when none are supported; Incomplete for missing evidence.
   Cite check results and their revision. Do not run `npm run check` in the review checkout: its
   formatter writes files. If fresh checks are requested, use an isolated checkout.
5. Re-fetch the PR head. If it changed, review the new diff before posting:

   ```sh
   gh pr comment "$pr_url" --body-file "$report_file"
   ```

6. Verify the comment and return its URL and outcome. Inspect comments before retrying an uncertain
   write; do not duplicate a report or use `--edit-last`. If GitHub is unavailable, return the report
   and error. No findings does not establish runtime behavior or authorize merging.

## Output format

```markdown
*[Code Review Agent]*: <Findings | No findings | Incomplete>

<Prioritized findings, or No findings. State any missing evidence.>

<details>
<summary>Details</summary>

- Decisions: <Each decision and brief reason, with source links.>
- Assumptions: <Each assumption and its effect, or None.>
- Rules applied: <Each rule used, its effect, and document/section link.>
- Evidence: <Base/head commits, check results, and review limits; label self-review.>

</details>
```

Replace all placeholders. Keep Details collapsed and last. Use GitHub source links. Record factual
reasons, not private deliberation or secrets.
