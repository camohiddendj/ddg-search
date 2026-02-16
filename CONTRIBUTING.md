# Contributing to ddg-search

Thanks for helping improve ddg-search! Please follow these quick guidelines so we can review and ship changes smoothly.

## Ways to contribute

- Report bugs or request features in GitHub Issues with steps, expected vs actual behavior, and environment details.
- Open pull requests for fixes or improvements; small, focused changes are easiest to review.
- Improve docs (README, examples) and add tests for new behavior.

## Getting started

- Requirements: Node.js 22+ and pnpm (via `corepack enable`).
- Install dependencies: `pnpm install`.
- Run tests: `pnpm test`; coverage: `pnpm run coverage`.
- Lint and format: `pnpm run lint` and `pnpm run format` (auto-fix: `pnpm run format:write`).

## Pull request checklist

- Include tests for new or changed behavior when feasible.
- Keep commits and PRs narrow in scope; describe the change and rationale in the PR body.
- Update README or usage docs if the user-facing behavior changes.
- Confirm the CLI still works for basic queries (e.g., `ddg-search duckduckgo`).

## Communication

- Discuss substantial changes in an issue before building large features.
- Be respectful and concise in reviews; maintainers may suggest revisions to keep the project consistent.
