# AGENTS.md
Guidance for coding agents working in `sk-landing`.

## Project Snapshot
- Framework: Next.js 14 with the Pages Router.
- Language: TypeScript with `strict: true` and `noEmit`.
- Styling: Tailwind CSS with shadcn/ui-style primitives.
- State: Zustand stores in `store/`.
- Backend integrations: Supabase plus Paystack via Next API routes.
- Import alias: `@/*` resolves from the repository root.
- Runtime note: `reactStrictMode` is enabled in `next.config.mjs`.

## Rules Sources
- Root agent guide: this file.
- Cursor rules: no `.cursorrules` file found.
- Cursor rule directory: no `.cursor/rules/` entries found.
- Copilot instructions: no `.github/copilot-instructions.md` file found.
- If any of those files are added later, merge their guidance into this document rather than duplicating or contradicting it.

## Working Norms
- Prefer small, targeted edits over broad refactors.
- Preserve the existing Pages Router structure unless a task explicitly calls for migration.
- Favor existing dependencies and patterns over adding new libraries.
- Do not mass-reformat files; there is no Prettier config in this repo.
- Match the local style of any file you touch, especially older mixed-style files.
- Keep generated or vendor-like files in `components/ui/` low-churn unless the task requires a change there.

## Repository Layout
- `pages/`: route components and Next API routes.
- `components/`: reusable layout and feature components.
- `components/ui/`: shadcn/ui-style primitives.
- `hooks/`: reusable client hooks.
- `lib/`: shared utilities and integration helpers.
- `store/`: Zustand stores and derived selectors.
- `styles/`: global CSS and Tailwind layers.
- `types/` and `types_db.ts`: shared type definitions.
- `docs/`: setup and operational notes.
- `supabase/` and `migrations/`: backend-related assets.

## Install, Build, And Run
- Install dependencies: `npm install`
- Start the dev server: `npm run dev`
- Dev server port: `4000`
- Create a production build: `npm run build`
- Start the production server: `npm run start`
- Run lint: `npm run lint`
- Run a repo-wide type check: `npx tsc --noEmit`

## Tests And Single-Test Guidance
- There is currently no automated test runner configured in `package.json`.
- No Jest, Vitest, Playwright, or Cypress config was found.
- No `*.test.*` or `*.spec.*` files were found when this guide was generated.
- There is therefore no true built-in single-test command today.
- For a single file lint pass, use `npx next lint --file pages/index.tsx`.
- For multiple specific files, repeat the flag: `npx next lint --file pages/index.tsx --file components/nav.tsx`.
- TypeScript checks are repo-wide only: `npx tsc --noEmit`.
- If you add a test framework, also add scripts for both full-suite and single-test execution, then update this file.

## Verification Expectations
- Run `npm run lint` after meaningful code changes.
- Run `npx tsc --noEmit` when changing types, hooks, stores, API contracts, or shared utilities.
- Run `npm run build` when changing routing, production bundling, or API behavior.
- If you cannot run a verification command, say so explicitly in your handoff and explain why.

## TypeScript Guidelines
- Maintain compatibility with `strict: true`.
- Prefer explicit types for component props, API payloads, and external-service responses.
- Prefer `type` aliases for props and payload shapes, which matches current repo usage.
- Use `import type` when it improves clarity or avoids unnecessary runtime imports.
- Avoid `any`; prefer `unknown` and narrow before use.
- Treat `req.body`, headers, query params, fetch responses, and third-party callbacks as untrusted data.
- Return `null` intentionally when a DB field or payload expects nullability.
- Keep `types_db.ts` aligned with Supabase usage when schema-related code changes.

## Imports
- Prefer `@/` imports for non-local internal modules.
- Use relative imports only for nearby siblings when that is clearly simpler.
- Group imports in this order when practical: framework/external packages, then internal aliases, then local relatives.
- Keep type-only imports marked with `type` where helpful.
- If you are making a small edit in a legacy file, follow that file's existing import order unless you are cleaning the whole file deliberately.

## Naming Conventions
- Components: PascalCase, usually matching the filename.
- Hooks: camelCase starting with `use`.
- Utility functions: camelCase with verb-oriented names.
- Types and interfaces: PascalCase.
- Local constants: camelCase unless they are true module-level constants.
- Module-level constants: `UPPER_SNAKE_CASE` only when they are genuinely constant configuration values.
- API handlers: default-export `handler` unless there is a strong reason not to.
- Route filenames should remain descriptive and URL-aligned.

## React And Next.js Conventions
- Use function components and hooks; class components are not part of this codebase.
- Pages typically default-export the page component.
- Keep route-specific logic in the relevant `pages/` file unless it becomes reusable.
- Extract shared logic into `components/`, `hooks/`, or `lib/` instead of duplicating it.
- Use `next/font` when introducing new web fonts.
- Preserve `reactStrictMode` compatibility and avoid patterns that rely on single-render assumptions.

## State Management
- Use Zustand for shared client state spanning multiple components.
- Keep stores focused and small.
- Persist only the minimal required state.
- Prefer derived selectors or computed totals over storing redundant values.
- Be careful with persisted state shape changes, especially in `store/cartStore.ts`.
- Keep browser-only storage access in safe client-side contexts.

## API Route Guidelines
- Validate HTTP method first and return `405` early.
- Validate required env vars or service clients before business logic.
- Normalize and trim incoming strings before storing or comparing them.
- Use guard clauses for required fields and invalid states.
- Return consistent JSON error payloads with an `error` field.
- Include `details` or `hint` only when they materially help debugging and do not leak secrets.
- Wrap async external calls in `try/catch`.
- Use appropriate status codes such as `400`, `401`, `405`, and `500`.

## Error Handling
- Fail early with clear, user-safe messages.
- Narrow caught values before reading properties when possible.
- Log useful diagnostics only; avoid noisy `console` calls in stable paths.
- Preserve defensive patterns such as fallback JSON parsing for uncertain upstream responses.
- Handle external service failure cases explicitly for Supabase, Paystack, and delivery integrations.

## Formatting And Style
- ESLint extends `next/core-web-vitals` and `next/typescript`; follow those rules.
- There is no formatter config, so avoid unrelated whitespace churn.
- Match the touched file's existing semicolon style.
- Match the touched file's existing quote style unless you are intentionally normalizing the whole file.
- Prefer descriptive variable names over short abbreviations.
- Keep functions reasonably small; extract helpers when a block becomes hard to scan.
- Avoid leaving commented-out dead code behind unless the task explicitly requires it.

## Tailwind And UI
- Reuse the design tokens already defined in `styles/globals.css` and `tailwind.config.ts`.
- Prefer Tailwind utility classes and existing `components/ui/` primitives over new one-off widgets.
- Use `cn` from `lib/utils.ts` when conditional class composition becomes non-trivial.
- Keep responsive behavior explicit for both mobile and desktop.
- Respect existing color variables such as `primary`, `primary-green`, and `milk`.

## Data And Integrations
- Server-side Supabase admin access is centralized in `lib/supabaseAdmin.ts`.
- Keep client Supabase usage separate from admin/service-role usage.
- Never hardcode secrets.
- Read configuration from `process.env` and guard missing values before use.
- Preserve the existing validation-first pattern around Paystack and Supabase flows.

## File-Specific Caution Areas
- `pages/index.tsx` is large and mixes UI with data-fetching logic; keep edits scoped.
- `components/ui/` files are generated or lightly customized primitives; avoid unnecessary churn.
- `store/cartStore.ts` persists cart data; avoid breaking persisted storage shape casually.
- `types_db.ts` likely mirrors database structure; update carefully and consistently.
- `pages/api/` routes already follow a recognizable guard-clause pattern; keep new handlers consistent with that style.

## When Adding Tooling
- If you add a test runner, add scripts for full-suite and single-test runs.
- If you add formatter tooling, do it deliberately and avoid repo-wide formatting churn in the same change.
- If you add env-dependent features, document required variables in `README.md` or `docs/`.
- If you add new agent-rule files such as `.cursorrules` or `.github/copilot-instructions.md`, update this guide to reference them.

## Handoff Expectations
- Mention which verification commands you ran.
- Mention any verification commands you could not run.
- Call out new env vars, schema assumptions, or manual setup.
- Keep final notes concise, specific, and actionable for the next agent.
