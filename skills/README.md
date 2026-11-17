# AI Agent Skills

This directory provides standardized agent skills for AI coding assistants (such as Antigravity, Claude Code, Cursor, Codex, and Gemini CLI) to automate the adoption and integration of the Backstage OpenSearch & Elasticsearch plugin suite.

---

## Available Skills

| Skill | Description | Location |
| :--- | :--- | :--- |
| **`integrate-backstage-search-clusters`** | Comprehensive step-by-step instructions for AI agents to install packages, wire the backend/frontend, configure `app-config.yaml`, annotate entities, and verify live endpoints. | [`skills/integrate-backstage-search-clusters/SKILL.md`](./integrate-backstage-search-clusters/SKILL.md) |

---

## How Agents Use This Skill

When asking an AI agent to install or wire this plugin into a Backstage app, simply prompt the agent:

> *"Please read `skills/integrate-backstage-search-clusters/SKILL.md` and integrate the OpenSearch and Elasticsearch plugins into our Backstage application."*

The agent will automatically:
1. Detect whether your Backstage repo uses the New Backend/Frontend Systems or classic JSX setups.
2. Install `@lockum/opensearch-plugin` and `@lockum/opensearch-plugin-backend`.
3. Wire the backend plugin in `packages/backend/src/index.ts`.
4. Register the frontend extensions in `packages/app/src/App.tsx` (or `EntityPage.tsx`).
5. Configure `app-config.yaml` and annotate sample catalog entities.
6. Verify live endpoints using the built-in test suite and mock clusters.
