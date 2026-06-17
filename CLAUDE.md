# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is **`consensus-docs`** — the documentation site for the [Consensus Protocol](https://github.com/Demali-876/consensus), built with **Astro Starlight** and deployed to **docs.consensus.canister.software**. (Repo lives under the `canister-software` org.)

## This repo is the canonical source of truth

It hosts the cross-repo reference at [`src/content/docs/protocol/architecture.md`](src/content/docs/protocol/architecture.md) (rendered at `/protocol/architecture/`). When an architecture decision or a cross-repo contract changes, **update that page first**, then the affected repos.

## Commands

```bash
npm install
npm run dev       # local Starlight dev server
npm run build     # static build to dist/
npm run preview   # preview the build
```

## Content structure

- Pages live under `src/content/docs/<section>/` as `.md`/`.mdx` with Starlight frontmatter (`title`, `description`).
- The sidebar is configured in `astro.config.mjs`. Most sections use `autogenerate: { directory: '<section>' }`; the **Protocol** section uses an explicit `items` list, so add new protocol pages there by hand.
- Sections: `quickstart`, `protocol`, `nodes`, `cli`, `x402proxy`, `facilitator`, `guides`.

## Related repositories

Part of a four-repo set — keep them in sync via the canonical page above:

- [`consensus`](https://github.com/Demali-876/consensus) — orchestrator / proxy (`server/`).
- [`consensus-client`](https://github.com/Demali-876/consensus-client) — `@canister-software/consensus-cli` (SDK + TUI/CLI).
- [`consensus-node`](https://github.com/Demali-876/consensus-node) — Bun worker-node runtime.
- **`consensus-docs`** (this repo) — the docs site.

## Conventions

- Match the frontmatter of neighboring pages (`title` + `description`).
- Don't commit `.claude/` (agent worktrees), `dist/`, `.astro/`, or `node_modules/`.
- Keep prose precise and implementation-accurate — this site is the reference other repos and their agents rely on.
