---
name: blueprint-implement
description: Execute a fullstack-blueprint GitHub issue's plan in a Worktrunk worktree, run project checks, and open a PR referencing the issue using gh.
---

# Implementation

Input: an issue URL. Output: implemented changes and a PR referencing the issue.
Always create a PR, or update the existing PR for the task branch.

## Workflow

1. Fetch the issue's plan and discussion:

   ```sh
   gh issue view "$issue_url" --json number,title,body,comments,url
   ```

   Read repository and affected-area instructions. Preserve unrelated work in the original checkout.

2. Record the original checkout path. Use [Worktrunk](https://worktrunk.dev/switch/) to create a
   dedicated worktree and a `dev-agent/` task branch from the intended base:

   ```sh
   wt switch --create "$head_branch" --base "$base_branch" --no-hooks
   ```

   For an existing task branch, use `wt switch "$head_branch" --no-hooks` instead. Resolve the
   worktree path with `wt list --format=json` and explicitly use it as the working directory for
   all implementation, checks, commits, pushes, and PR commands; shell navigation may not persist
   between tool calls. Skip lifecycle hooks so they do not start runtime services.

3. Execute the plan and acceptance criteria. Adapt to the current code where needed and record
   decisions and reasons for the PR. Resolve blocking requirements before dependent changes.
4. Update all relevant documentation, including READMEs, topic guides, golden paths, and examples,
   to match the implementation. Keep these changes in the same PR.
5. Run the required checks, fix failures caused by the changes, and inspect the final diff.
6. Commit and push changes. Resolve the target and head branches, then check for
   an existing PR before creating one. Always start the issue title with `*[Dev Agent]*:`. Write the body below to `pr_body_file` and use:

   ```sh
   gh pr create --repo "$repository" --base "$base_branch" --head "$head_branch" --title "$pr_title" --body-file "$pr_body_file"
   ```

   For an existing PR, update its body using `gh pr edit --body-file`. Verify the PR's URL,
   base, and head with `gh pr view`. Do not merge or deploy.
   If publication fails, retain the work and report the blocker; inspect remote state before retrying.

7. After verifying the PR, confirm the worktree has no uncommitted or untracked work and its HEAD
   is pushed to the PR branch. Return to the original checkout, then use
   [Worktrunk cleanup](https://worktrunk.dev/remove/) to remove only the task worktree:

   ```sh
   wt remove --no-delete-branch --foreground --no-hooks "$head_branch"
   ```

   Keep both local and remote branches. Verify the worktree directory is gone and the local branch
   still exists. Never force removal or delete a worktree containing unrelated work. If publication,
   push verification, or safe cleanup is blocked, retain the worktree and report why. Return the
   PR URL, check result, and cleanup status.

## PR body

```markdown
- <issue URL>.

## Summary

<What changed and the resulting behavior.>

## How to test

<Instructions for manual function testers>

<details>
<summary>Details</summary>

- Decisions: <Each decision and brief reason, with source links.>
- Assumptions: <Each assumption and its effect, or None.>
- Rules applied: <Each rule used, its effect, and document/section link.>

</details>
```

Replace placeholders with facts. Keep Details collapsed and last;
