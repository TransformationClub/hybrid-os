# Hybrid OS - Product Backlog

> Last updated: 2026-04-06
> Status key: DONE | PARTIAL | TODO

---

## Phase 1: Auth & Real Data Layer

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | Login page with branded UI | DONE | `/login` |
| 1.2 | Signup page with workspace creation | DONE | `/signup` |
| 1.3 | Auth server actions (login, signup, logout) | DONE | `lib/auth/actions.ts` |
| 1.4 | Forgot password page | DONE | `/forgot-password` |
| 1.5 | Magic link authentication | DONE | `loginWithMagicLink` in auth actions |
| 1.6 | Workspace switcher UI | DONE | Sidebar dropdown component |
| 1.7 | User profile page | DONE | `/profile` |
| 1.8 | Team invite via email | DONE | `lib/workspace/invite-actions.ts` + settings UI |
| 1.9 | RBAC permission gate component | DONE | `PermissionGate` component |
| 1.10 | Wire Home page to real data | DONE | Fetches approvals, initiatives, events |
| 1.11 | Wire Initiatives list to real data | DONE | getInitiatives + createInitiative wired |
| 1.12 | Wire Agents page to real data | DONE | getAgents + create/update wired |
| 1.13 | Wire Skills page to real data | DONE | getSkills + create/update wired |
| 1.14 | Loading skeletons on data-fetching pages | DONE | Skeleton components on all pages |

## Phase 2: Second Brain (Core Moat)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | Knowledge object CRUD server actions | DONE | `lib/brain/actions.ts` |
| 2.2 | File upload + drag-and-drop UI | DONE | `FileUpload` component |
| 2.3 | Supabase Storage integration | DONE | `lib/storage/actions.ts` |
| 2.4 | Markdown/text/PDF parser | DONE | `lib/ingestion/parser.ts` |
| 2.5 | Embedding generation (OpenAI) | DONE | `lib/embeddings/service.ts` |
| 2.6 | pgvector retrieval adapter | DONE | `lib/retrieval/pgvector-adapter.ts` |
| 2.7 | Version history UI + diff view | DONE | `components/brain/version-history.tsx` |
| 2.8 | Proposed memory updates UI | DONE | `components/brain/proposed-updates.tsx` |
| 2.9 | Folder management (create/rename/move) | DONE | Create, rename folders + move objects |
| 2.10 | Wire Second Brain search bar to semantic search | DONE | Debounced search via embeddings |
| 2.11 | Google Docs import into brain | DONE | importGoogleDoc/s with embedding gen |
| 2.12 | Async ingestion queue | DONE | Inngest process-ingestion job |

## Phase 3: Orchestration Service (AI Core)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | Chat API route with streaming | DONE | `/api/chat` |
| 3.2 | Vercel AI SDK + Claude integration | DONE | |
| 3.3 | System prompt builder | DONE | `lib/orchestrator/system-prompt.ts` |
| 3.4 | Context assembler (knowledge + initiative) | DONE | `lib/orchestrator/context-assembler.ts` |
| 3.5 | Tool calling (searchKnowledge, createWorkItem, etc.) | DONE | 6 tools in `lib/orchestrator/tools.ts` |
| 3.6 | Mock stream fallback | DONE | Works without API key |
| 3.7 | Chat message persistence | DONE | `lib/chat/actions.ts` + migration |
| 3.8 | Copy message + retry on error | DONE | ChatPanel UI |
| 3.9 | Inline tool result cards (approvals, work items) | DONE | `components/chat/tool-part-renderer.tsx` |
| 3.10 | Source attribution/citations | DONE | `components/chat/citations.tsx` |
| 3.11 | Intent classifier + routing | DONE | Keyword-based classifier wired into chat API |
| 3.12 | Token budget enforcement | DONE | TokenBudget class + chat API integration |

## Phase 4: Approval & Trust System

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | Approval CRUD server actions | DONE | `lib/approvals/actions.ts` |
| 4.2 | Approval queue on Home page | DONE | Component exists, uses mock data |
| 4.3 | Approvals management page | DONE | `/approvals` |
| 4.4 | Inline approval cards in chat | DONE | |
| 4.5 | Event/audit logger | DONE | `lib/events/logger.ts` |
| 4.6 | Wire approval queue to real data | DONE | Home + Approvals page wired |
| 4.7 | Backend approval enforcement | DONE | `lib/approvals/enforcement.ts` + tools gated |
| 4.8 | Batch approve/reject | DONE | Checkbox selection + floating action bar |
| 4.9 | Plan preview before execution | DONE | `plan-preview-dialog.tsx` |
| 4.10 | Pause/cancel mid-execution | DONE | AbortController + ExecutionController |

## Phase 5: Agent System

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | Agent CRUD server actions | DONE | `lib/agents/actions.ts` |
| 5.2 | Agent editor dialog | DONE | `components/agents/agent-editor.tsx` |
| 5.3 | Agent run history page | DONE | `/agents/[id]/runs` |
| 5.4 | Vercel AI runtime adapter | DONE | `lib/runtime/vercel-ai-adapter.ts` |
| 5.5 | Agent run actions | DONE | `lib/agents/run-actions.ts` |
| 5.6 | Wire Agents page to real data | DONE | getAgents + getAgentRuns wired |
| 5.7 | Seed default agents on workspace creation | DONE | `seedWorkspaceDefaults` called on signup |
| 5.8 | Agent on/off toggle (real) | DONE | Toggle on agent cards with visual feedback |
| 5.9 | Token usage tracking + cost display | DONE | Persisted in agent_runs, shown on cards |
| 5.10 | Run cancellation (real) | DONE | cancelAgentRun wired to UI |

## Phase 6: Skill System

| # | Item | Status | Notes |
|---|------|--------|-------|
| 6.1 | Skill CRUD server actions | DONE | `lib/skills/actions.ts` |
| 6.2 | Skill editor with workflow builder | DONE | `components/skills/skill-editor.tsx` |
| 6.3 | Skill runner engine | DONE | `lib/skills/runner.ts` |
| 6.4 | Wire Skills page to real data | DONE | getSkills + create/update wired |
| 6.5 | Seed default skills on workspace creation | DONE | Part of `seedWorkspaceDefaults` |
| 6.6 | Skill execution progress UI | DONE | `skill-runner-dialog.tsx` with step tracking |
| 6.7 | Post-execution feedback capture | DONE | Thumbs up/down + text feedback in dialog |

## Phase 7: Initiative Workspace

| # | Item | Status | Notes |
|---|------|--------|-------|
| 7.1 | Initiative CRUD server actions | DONE | `lib/initiatives/actions.ts` |
| 7.2 | Create initiative dialog | DONE | |
| 7.3 | Kanban board with drag-and-drop | DONE | `@dnd-kit` integrated |
| 7.4 | Work item detail sheet | DONE | |
| 7.5 | Editable Strategize tab | DONE | Campaign brief, key messages, proposal |
| 7.6 | Report & Optimize tab | DONE | Mock metrics + recommendations |
| 7.7 | Wire initiative workspace to real data | DONE | Kanban fetches from getWorkItems |
| 7.8 | Wire work item moves to server actions | DONE | moveWorkItem called on drag |
| 7.9 | Archive/delete initiatives | DONE | Dropdown menu with archive/delete actions |
| 7.10 | Link knowledge objects to initiative | DONE | Linked Knowledge section in Strategize |
| 7.11 | Agent auto-creates work items (visible in UI) | DONE | 10s auto-refresh + manual refresh button |

## Phase 8: HubSpot Integration

| # | Item | Status | Notes |
|---|------|--------|-------|
| 8.1 | OAuth flow + token storage | DONE | |
| 8.2 | Token refresh handling | DONE | |
| 8.3 | Fetch contacts and companies | DONE | |
| 8.4 | Create draft blog posts | DONE | |
| 8.5 | Connection status in settings | DONE | |
| 8.6 | Fetch existing campaigns | DONE | getHubSpotCampaigns + getEmailTemplates |
| 8.7 | Create draft emails | DONE | createHubSpotEmail server action |
| 8.8 | Pull performance metrics | DONE | getHubSpotAnalytics server action |
| 8.9 | Sync HubSpot data to Second Brain | DONE | syncHubSpotToBrain creates knowledge objects |
| 8.10 | Feed performance into Report tab | DONE | ReportTab fetches HubSpot analytics |

## Phase 9: Onboarding Flow

| # | Item | Status | Notes |
|---|------|--------|-------|
| 9.1 | Multi-step onboarding wizard | DONE | `/onboarding` with 5 steps |
| 9.2 | Guided interview questions | DONE | |
| 9.3 | Brain dump file upload | DONE | |
| 9.4 | Auto-generate Second Brain from interview | DONE | `generateSecondBrain` action |
| 9.5 | Connect HubSpot during onboarding | DONE | OAuth flow + skip option |
| 9.6 | "Magic moment" brain generation animation | DONE | Animated progress + cycling text |
| 9.7 | Suggest first initiative after onboarding | DONE | AEO/ABM cards with redirect |
| 9.8 | Tone/autonomy preferences | DONE | Tone selector + autonomy slider |

## Phase 10: Additional Integrations

| # | Item | Status | Notes |
|---|------|--------|-------|
| 10.1 | Google Drive OAuth flow | DONE | |
| 10.2 | Slack OAuth flow | DONE | |
| 10.3 | Slack notification sending | DONE | |
| 10.4 | Email notification framework (Resend) | DONE | |
| 10.5 | Notification preferences UI + persistence | DONE | Settings page toggles |
| 10.6 | Notification dispatcher with pref checking | DONE | |
| 10.7 | Google Docs content parsing + import | DONE | fetchDocContent + importGoogleDoc |
| 10.8 | Slack approval prompts | DONE | sendSlackApproval with Block Kit |
| 10.9 | Daily/weekly digest emails (trigger) | DONE | Inngest cron: Mondays 8am UTC |
| 10.10 | Deep links in Slack messages | DONE | buildDeepLink + dispatcher integration |

## Phase 11: Multiplayer

| # | Item | Status | Notes |
|---|------|--------|-------|
| 11.1 | Comments on work items (schema + actions) | DONE | Migration + actions exist |
| 11.2 | Comment thread component | DONE | `components/collaboration/comment-thread.tsx` |
| 11.3 | Presence indicator component | DONE | `components/collaboration/presence-indicator.tsx` |
| 11.4 | @mention users in comments | DONE | `use-workspace-members` hook + mention dropdown |
| 11.5 | Comment notifications | DONE | `lib/notifications/comment-notifications.ts` |
| 11.6 | Assignment notifications | DONE | Dispatched on work item create/update |
| 11.7 | Activity feed per initiative | DONE | `components/initiatives/activity-feed.tsx` |
| 11.8 | Real-time presence (who's viewing) | DONE | `use-presence` hook + Supabase Realtime |

## Phase 12: E2E Marketing Workflows

| # | Item | Status | Notes |
|---|------|--------|-------|
| 12.1 | AEO campaign workflow skeleton | DONE | `lib/workflows/aeo-campaign.ts` |
| 12.2 | ABM campaign workflow skeleton | DONE | `lib/workflows/abm-campaign.ts` |
| 12.3 | Workflow registry | DONE | `lib/workflows/index.ts` |
| 12.4 | SSE streaming API for workflow execution | DONE | `/api/workflows/run` |
| 12.5 | Client hook for workflow execution | DONE | `hooks/use-workflow.ts` |
| 12.6 | Full AEO orchestration (end-to-end) | DONE | 7-step workflow fully implemented |
| 12.7 | Full ABM orchestration (end-to-end) | DONE | 6-step workflow fully implemented |
| 12.8 | HubSpot asset creation from workflow | DONE | AEO workflow publishes to HubSpot |

## Phase 13: Analytics & Observability

| # | Item | Status | Notes |
|---|------|--------|-------|
| 13.1 | Event tracking framework | DONE | `lib/analytics/tracker.ts` |
| 13.2 | Analytics queries | DONE | `lib/analytics/queries.ts` |
| 13.3 | Reports dashboard page | DONE | `/reports` |
| 13.4 | Error tracking (Sentry) | DONE | @sentry/nextjs client + server configs |
| 13.5 | API latency monitoring | DONE | trackApiLatency in chat route |
| 13.6 | LLM cost tracking dashboard | DONE | LLM Usage section in Reports |
| 13.7 | Onboarding funnel metrics | DONE | `getOnboardingMetrics` + Reports page card |

## Phase 14: Security & Hardening

| # | Item | Status | Notes |
|---|------|--------|-------|
| 14.1 | RLS policies on all tables | DONE | In migrations |
| 14.2 | Rate limiter | DONE | `lib/security/rate-limiter.ts` |
| 14.3 | Input sanitization | DONE | `lib/security/sanitize.ts` |
| 14.4 | Security headers | DONE | `lib/security/headers.ts` + `next.config.ts` |
| 14.5 | Workspace guard | DONE | `lib/security/workspace-guard.ts` |
| 14.6 | RLS policy testing | DONE | 24 RLS/RBAC tests in `rls-policies.test.ts` |
| 14.7 | CSRF protection | DONE | `lib/security/csrf.ts` + `use-csrf` hook |
| 14.8 | Credential rotation admin UI | DONE | Settings page rotation section |
| 14.9 | User deactivation | DONE | `deactivateUser`/`reactivateUser` actions |

## Phase 15: Testing & QA

| # | Item | Status | Notes |
|---|------|--------|-------|
| 15.1 | Vitest configuration | DONE | |
| 15.2 | Unit tests (4 files, 30 tests) | DONE | Sanitize, rate limiter, actions, tools |
| 15.3 | Integration tests | DONE | 31 tests in `integration/server-actions.test.ts` |
| 15.4 | E2E tests (Playwright) | DONE | `playwright.config.ts` + smoke + auth specs |
| 15.5 | Critical path manual QA checklist | DONE | `docs/QA-CHECKLIST.md` |

## Phase 16: Deploy & Launch

| # | Item | Status | Notes |
|---|------|--------|-------|
| 16.1 | Vercel deployment config | DONE | `vercel.json` |
| 16.2 | CI/CD pipeline | DONE | `.github/workflows/ci.yml` |
| 16.3 | Migration apply script | DONE | `scripts/apply-migrations.sh` |
| 16.4 | Seed workspace script | DONE | `scripts/seed-workspace.ts` |
| 16.5 | Supabase project provisioning | TODO | User must set up |
| 16.6 | Custom domain setup | TODO | |
| 16.7 | Internal alpha testing | TODO | |

---

## Infrastructure Gaps (Cross-Cutting)

| # | Item | Status | Notes |
|---|------|--------|-------|
| I.1 | Background job system (Inngest/BullMQ) | DONE | Inngest with 5 functions |
| I.2 | Cron/scheduled tasks | DONE | Token refresh hourly, digest weekly |
| I.3 | Webhook receivers (HubSpot, Slack) | DONE | `/api/webhooks/hubspot` + `/api/webhooks/slack` |
| I.4 | Supabase Realtime wired to UI | DONE | Approvals + Kanban use realtime |
| I.5 | Optimistic updates wired to mutations | DONE | Approvals + Kanban use optimistic |
| I.6 | Error boundary components | DONE | Error boundary + 404 + dashboard error |

---

## Summary

| Category | Done | TODO | Total |
|----------|------|------|-------|
| Auth & Data | 14 | 0 | 14 |
| Second Brain | 12 | 0 | 12 |
| Orchestration | 12 | 0 | 12 |
| Approvals | 10 | 0 | 10 |
| Agents | 10 | 0 | 10 |
| Skills | 7 | 0 | 7 |
| Initiative Workspace | 11 | 0 | 11 |
| HubSpot | 10 | 0 | 10 |
| Onboarding | 8 | 0 | 8 |
| Integrations | 10 | 0 | 10 |
| Multiplayer | 8 | 0 | 8 |
| E2E Workflows | 8 | 0 | 8 |
| Analytics | 7 | 0 | 7 |
| Security | 9 | 0 | 9 |
| Testing | 5 | 0 | 5 |
| Deploy | 4 | 3 | 7 |
| Infrastructure | 6 | 0 | 6 |
| **TOTAL** | **161** | **3** | **164** |
