# Agent development skills

Each skill contains its own instructions, `gh` commands, publication destination, and output
format. Read the skill for the requested stage; no shared GitHub procedure is required.

| Skill                                                                       | Input                                     | Result                                                        |
| --------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| [Issue planning](../.agents/skills/blueprint-issue-plan/SKILL.md)           | Issue URL or requirements for a new issue | Scope, plan, and risks in the issue body                      |
| [Plan review](../.agents/skills/blueprint-plan-review/SKILL.md)             | Issue URL                                 | Review comment on that issue                                  |
| [Implementation](../.agents/skills/blueprint-implement/SKILL.md)            | Issue URL                                 | Code, updated docs, checks, and PR referencing the issue      |
| [Code review](../.agents/skills/blueprint-code-review/SKILL.md)             | PR URL                                    | Review comment on that PR                                     |
| [Functional review](../.agents/skills/blueprint-functional-review/SKILL.md) | Issue/PR URL and test environment         | Observed browser/CLI results commented on the supplied target |

GitHub is the source of truth. A stage request includes its listed publication unless the user
requests draft-only/local-only output. Implementation updates relevant docs and golden paths,
creates or updates a PR, and does not comment on the issue. It works in a dedicated Worktrunk (`wt`)
worktree and removes it after verifying the pushed PR, keeping the branch. Code review checks
that the docs match the implementation. Its PR body uses Summary, How to test, and collapsed
Details containing decisions. Other published contributions begin with their role's bold
prefix and end with collapsed Details containing decisions, assumptions, applied rules, evidence,
model/version, and token usage. Unavailable telemetry is explicitly marked unavailable.

The usual sequence is issue planning, plan review, implementation, code review, then functional
review. Review fixes return to implementation and require
updated evidence. Invoke only the stages requested; these skills do not create separate agents.

```text
Use $blueprint-issue-plan to plan here: https://github.com/OWNER/REPO/issues/123
Use $blueprint-plan-review to review https://github.com/OWNER/REPO/issues/123
Use $blueprint-implement to implement issue #123 and open a PR.
Use $blueprint-code-review to review https://github.com/OWNER/REPO/pull/456
Use $blueprint-functional-review to verify PR #456 in the local test environment.
```

Codex discovers these skills under `.agents/skills/`. The `blueprint-` prefix distinguishes them
from personal skills.
