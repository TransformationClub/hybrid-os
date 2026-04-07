# Hybrid OS - Complete Implementation Roadmap

> Full roadmap to ship Hybrid OS v1 as described in the PRD.
> Each phase builds on the previous. Items marked with the phase they belong to.

---

## What's Already Built (Foundation)

- [x] Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui app shell
- [x] HubSpot-inspired design system (CSS variable tokens, dark sidebar, swappable theme)
- [x] Brand config (`src/config/brand.ts`) - single-file rename
- [x] 7 pages with full mock UIs: Home, Initiatives list, Initiative workspace (3-tab canvas + chat), Second Brain, Agents, Skills, Settings
- [x] Domain types for all core entities
- [x] Supabase schema migration (12 tables, RLS policies, indexes, triggers)
- [x] Supabase browser + server client scaffolding
- [x] AgentRuntimeAdapter interface (provider-agnostic AI layer)
- [x] RetrievalAdapter interface (vector search abstraction)
- [x] `.env.local.example` with all required env vars

---

## Phase 1: Auth & Real Data Layer

**Goal:** Replace all mock data with real Supabase-backed CRUD. Users can sign up, log in, and own a workspace.

### 1.1 Authentication
- [ ] Supabase Auth setup (email/password + magic link)
- [ ] Login page (`/login`) with branded UI
- [ ] Signup page (`/signup`) with workspace creation
- [ ] Auth middleware (protect all `(dashboard)` routes)
- [ ] Session management (refresh tokens, cookie handling)
- [ ] Logout flow
- [ ] "Forgot password" flow
- [ ] Auth state provider (React context with current user + workspace)

### 1.2 Workspace & User Management
- [ ] Create workspace on signup (name, slug, first admin user)
- [ ] Workspace switcher UI (future: multi-workspace support)
- [ ] User profile page (name, avatar upload, email)
- [ ] Team management: invite members via email
- [ ] Role assignment (admin, strategist, operator, reviewer, viewer)
- [ ] Role-based UI gating (hide admin features from viewers)

### 1.3 Data Layer
- [ ] Supabase client hooks (`useQuery`/`useMutation` wrappers for each entity)
- [ ] Server actions or API routes for mutations (create/update/delete)
- [ ] Replace mock data on Home page with real queries
- [ ] Replace mock data on Initiatives list with real queries
- [ ] Replace mock data on Agents page with real queries
- [ ] Replace mock data on Skills page with real queries
- [ ] Replace mock data on Settings page with real queries
- [ ] Optimistic updates for common mutations
- [ ] Error boundaries for failed queries
- [ ] Loading skeletons for all pages

---

## Phase 2: Second Brain (Core Moat)

**Goal:** Users can build and browse a living knowledge base. Agents can retrieve context from it.

### 2.1 Knowledge Object CRUD
- [ ] Create knowledge object (title, type, path, content as markdown)
- [ ] Edit knowledge object (inline markdown editor)
- [ ] Delete knowledge object (with confirmation)
- [ ] Folder structure management (create/rename/move folders)
- [ ] Wire Second Brain page to real data (replace mock folder tree + cards)

### 2.2 File Upload & Ingestion Pipeline
- [ ] File upload UI (drag-and-drop, multi-file)
- [ ] Supabase Storage integration for file persistence
- [ ] PDF parsing (extract text, metadata)
- [ ] Markdown/text file parsing
- [ ] Google Docs export/import path (via Drive API)
- [ ] Ingestion queue (process uploads asynchronously)
- [ ] Auto-extract title, type, and metadata from uploaded content
- [ ] Progress indicator during ingestion

### 2.3 Embeddings & Retrieval
- [ ] Embedding generation on knowledge object create/update (OpenAI or Anthropic embeddings)
- [ ] pgvector storage (already in schema)
- [ ] Implement `PgVectorRetrievalAdapter` (implements `RetrievalAdapter` interface)
- [ ] Semantic search endpoint (query -> top-K relevant knowledge objects)
- [ ] Wire search into Second Brain page search bar
- [ ] Hybrid search: combine semantic + keyword (full-text) search

### 2.4 Versioning & Change History
- [ ] Auto-create `knowledge_versions` entry on every edit
- [ ] Version history sidebar UI (per knowledge object)
- [ ] Diff view between versions
- [ ] Rollback to previous version
- [ ] Changelog view (all recent changes across the brain)
- [ ] "Changed by" attribution (user vs. agent vs. system)

### 2.5 Proposed Memory Updates
- [ ] Agent-proposed edits queue (agent suggests changes, user approves)
- [ ] "Proposed Updates" section in Second Brain UI
- [ ] Accept/reject/edit proposed changes
- [ ] Auto-apply with approval gate for trusted agents

---

## Phase 3: Orchestration Service (AI Core)

**Goal:** The orchestrator can interpret user intent, select skills, coordinate agents, and stream responses.

### 3.1 Orchestration Service Skeleton
- [ ] API route: `POST /api/chat` (streaming endpoint)
- [ ] Conversation state management (per initiative)
- [ ] Message persistence (store chat history in DB)
- [ ] System prompt construction (combine agent definition + initiative context + second brain retrieval)

### 3.2 Vercel AI SDK Integration
- [ ] Install and configure `ai` package (Vercel AI SDK)
- [ ] Implement `VercelAIRuntimeAdapter` (implements `AgentRuntimeAdapter`)
- [ ] Claude model integration (Anthropic provider)
- [ ] Streaming response handling (server -> client)
- [ ] Tool calling support (agent can call defined tools)
- [ ] Multi-step agent reasoning (agent plans, then executes steps)

### 3.3 Context Assembly
- [ ] Retrieve relevant knowledge objects for each chat turn (via RetrievalAdapter)
- [ ] Include initiative brief, goals, success criteria
- [ ] Include recent work item state
- [ ] Include conversation history (sliding window)
- [ ] Token budget management (truncate context to fit model limits)
- [ ] Context source attribution (show user which knowledge was used)

### 3.4 Wire Chat Panel to Real Orchestrator
- [ ] Replace mock chat messages with real conversation
- [ ] Streaming message display (tokens appear as they arrive)
- [ ] Agent typing indicator
- [ ] Message retry on failure
- [ ] Copy message content
- [ ] Structured action blocks in messages (plan previews, approval cards, work item creation)

### 3.5 Intent Interpretation & Routing
- [ ] Intent classifier (what is the user trying to do?)
- [ ] Route to appropriate skill when intent matches
- [ ] Fallback to general conversation for ambiguous intents
- [ ] "I don't understand" handling with suggested actions

---

## Phase 4: Approval & Trust System

**Goal:** Every meaningful agent action goes through an approval gate. Full transparency and audit trail.

### 4.1 Approval Engine
- [ ] Create approval from agent action (auto-generate when agent wants to take action)
- [ ] Approval categories: content, workflow, execution, integration, communication
- [ ] Approval state machine: pending -> approved/rejected/changes_requested
- [ ] Approval metadata (what exactly will happen if approved)
- [ ] Batch approvals (approve multiple at once)

### 4.2 Approval UI
- [ ] Inline approval cards in chat (agent proposes, user approves in-line)
- [ ] Approval queue on Home page (wire to real data)
- [ ] Approval detail view (full context, diff preview)
- [ ] Approve / Reject / Request Changes buttons with feedback field
- [ ] Approval notifications (in-app + email)

### 4.3 Audit & Event System
- [ ] Emit events for all significant actions (use `events` table)
- [ ] Activity feed on Home page (wire to real events)
- [ ] Initiative activity timeline
- [ ] Agent run log (input, output, duration, token usage)
- [ ] Admin audit log view (Settings > Activity)
- [ ] Event filtering and search

### 4.4 Plan Preview & Execution
- [ ] Before any multi-step execution, show plan preview in chat
- [ ] User can modify plan before approving
- [ ] Step-by-step execution with progress updates
- [ ] Pause/cancel mid-execution
- [ ] Rollback support for reversible actions

---

## Phase 5: Agent System

**Goal:** Agents are configurable, execute work, and report results visibly.

### 5.1 Agent Configuration
- [ ] Agent CRUD (create, edit, delete custom agents)
- [ ] Agent definition editor (role, tone, tools, permissions, risk level, system prompt)
- [ ] Default agent templates (Orchestrator, Strategist, Content Writer, Researcher, QA Reviewer, Optimizer)
- [ ] Seed workspace with default agents on creation
- [ ] Agent avatar upload
- [ ] Agent on/off toggle

### 5.2 Agent Run Execution
- [ ] Create agent run from orchestrator dispatch
- [ ] Run state machine: queued -> planning -> waiting_approval -> running -> completed/failed
- [ ] Run state sync to UI in real-time (Supabase Realtime subscriptions)
- [ ] Run output normalization (structured output format for canvas)
- [ ] Run error handling (retry once, fallback to manual, notify user)
- [ ] Run cancellation
- [ ] Token usage tracking per run

### 5.3 Agent Visibility
- [ ] Agent status indicators on Agents page (wire to real run state)
- [ ] Agent activity in initiative workspace (which agents are working)
- [ ] Agent attribution on work items and outputs
- [ ] "Recent Runs" table on Agents page (wire to real data)
- [ ] Run detail view (full input/output/logs)

### 5.4 Model Selection & Cost Management
- [ ] Configure which model each agent uses (Haiku for classification, Sonnet for drafts, Opus for strategy)
- [ ] Token budget per workspace (monthly limits)
- [ ] Usage dashboard (tokens consumed, by agent, by initiative)
- [ ] Cost estimation before expensive operations
- [ ] Rate limiting and queue management

---

## Phase 6: Skill System

**Goal:** Skills are executable operational workflows that orchestrate agents.

### 6.1 Skill CRUD
- [ ] Create skill (name, purpose, inputs, workflow steps, agents, tools, quality bar, escalation rules)
- [ ] Skill editor UI (step-by-step workflow builder)
- [ ] Edit existing skills
- [ ] Skill versioning (track changes over time)
- [ ] Wire Skills page to real data

### 6.2 Skill Runner
- [ ] Parse skill workflow steps
- [ ] Resolve agents for each step
- [ ] Dispatch work to agents (via AgentRuntimeAdapter)
- [ ] Capture step outputs
- [ ] Pass outputs between steps (pipeline)
- [ ] Handle step failures (retry, skip, escalate)
- [ ] Skill execution progress UI (show current step)

### 6.3 Starter Skills (v1)
- [ ] **Onboarding Skill**: guided interview, data connection, second brain generation
- [ ] **Campaign Planning Skill**: research audience, define goals, create brief, build timeline
- [ ] **AEO Campaign Skill**: full AEO workflow (research -> strategy -> content -> QA -> draft)
- [ ] **ABM Campaign Skill**: account targeting, persona mapping, multi-channel content
- [ ] **Retro & Optimization Skill**: pull performance data, analyze, surface insights, update brain

### 6.4 Skill Improvement Loop
- [ ] Post-execution feedback capture (how did it go?)
- [ ] Skill performance metrics (success rate, time to complete, user satisfaction)
- [ ] Optimizer agent proposes skill improvements based on retros
- [ ] Skill changelog

---

## Phase 7: Initiative Workspace (Full Functionality)

**Goal:** The initiative workspace becomes a real working environment, not just mock UI.

### 7.1 Initiative CRUD
- [ ] Create initiative flow (type selection, title, goal, brief, success criteria)
- [ ] Edit initiative details
- [ ] Initiative status management (draft -> planning -> active -> completed)
- [ ] Archive/delete initiative
- [ ] Wire Initiatives list page to real data

### 7.2 Strategize Tab (Real)
- [ ] Editable campaign brief (persisted to DB)
- [ ] Strategy proposals from orchestrator (generated, stored, versioned)
- [ ] ICP summary generation (from second brain context)
- [ ] Key messages editor
- [ ] Approve/edit strategy proposals
- [ ] Link knowledge objects to initiative

### 7.3 Orchestrate Tab (Real)
- [ ] Work item CRUD (create, edit, move between columns, delete)
- [ ] Drag-and-drop Kanban board
- [ ] Assign work items to humans or agents
- [ ] Work item detail view (description, attachments, comments, history)
- [ ] Agent auto-creates work items when executing skills
- [ ] Due dates and priority management
- [ ] Blocker tracking

### 7.4 Report & Optimize Tab (Real)
- [ ] Metrics dashboard (pull from HubSpot integration or manual input)
- [ ] "Needs Attention" alerts (generated by optimizer agent)
- [ ] Recommendations list (from optimizer agent analysis)
- [ ] Retro capture (what worked, what didn't, learnings)
- [ ] "Update Second Brain" action (write learnings back to knowledge base)
- [ ] Performance trend visualization

### 7.5 Canvas Real-Time Updates
- [ ] Supabase Realtime subscriptions for initiative state changes
- [ ] Live work item status updates
- [ ] Agent activity indicators (typing, processing, completed)
- [ ] Optimistic UI updates on user actions

---

## Phase 8: HubSpot Integration

**Goal:** Read context from and write draft assets to HubSpot.

### 8.1 Auth & Connection
- [ ] HubSpot OAuth flow (connect account in Settings > Integrations)
- [ ] Token storage (encrypted, in Supabase)
- [ ] Token refresh handling
- [ ] Connection status indicator
- [ ] Disconnect flow

### 8.2 Read Operations
- [ ] Fetch contacts and companies (for ICP/account context)
- [ ] Fetch existing campaigns
- [ ] Fetch content/blog posts
- [ ] Fetch email templates
- [ ] Fetch performance data (traffic, conversions, engagement)
- [ ] Sync HubSpot data into second brain as reference knowledge objects

### 8.3 Write Operations (Draft Only)
- [ ] Create draft blog posts
- [ ] Create draft emails
- [ ] Create draft landing pages
- [ ] Create draft CTAs
- [ ] Associate assets with campaigns
- [ ] All writes require approval (no autonomous publishing)

### 8.4 Performance Readback
- [ ] Pull campaign performance metrics
- [ ] Feed into Report & Optimize tab
- [ ] Optimizer agent uses performance data for recommendations

---

## Phase 9: Onboarding Flow

**Goal:** New user reaches "this system just did real work for me" in 10-15 minutes.

### 9.1 Onboarding Wizard
- [ ] Welcome screen with brand explanation (1-3 sentences)
- [ ] Step 1: Connect HubSpot (the critical data source)
- [ ] Step 2: 3-question guided interview (customer, product, goal)
- [ ] Step 3: Optional brain dump (upload docs, past campaigns, ICP docs)
- [ ] Step 4: Magic moment - system generates second brain live (visible file creation, real-time updates)
- [ ] Step 5: "Ready to plan your first campaign?" prompt

### 9.2 Second Brain Seeding
- [ ] Auto-generate knowledge objects from interview answers
- [ ] Parse uploaded documents into structured knowledge
- [ ] Pull HubSpot context into brain
- [ ] Organize into folder structure (Context/Company, Context/Brand, Context/Product, Context/Customers)
- [ ] Show generation progress with animations

### 9.3 First Campaign Launch
- [ ] Suggest first initiative based on onboarding context
- [ ] Pre-populate campaign brief from brain
- [ ] Launch into initiative workspace with orchestrator ready

### 9.4 Personalization (Settings)
- [ ] Orchestrator tone preference (coach, direct, collaborative) - move to Settings
- [ ] Autonomy level preference (low, medium, high) - move to Settings
- [ ] These configure the orchestrator's system prompt dynamically

---

## Phase 10: Additional Integrations

**Goal:** Connect the key external tools from the PRD.

### 10.1 Google Drive / Docs
- [ ] Google OAuth flow
- [ ] Browse and select folders/files to import
- [ ] Parse Google Docs content
- [ ] Import into second brain as knowledge objects
- [ ] Keep source links for reference
- [ ] Selective sync (re-import on demand)

### 10.2 Slack
- [ ] Slack OAuth flow
- [ ] Send approval prompts to Slack channel
- [ ] Send status update notifications
- [ ] Deep links back to initiative workspace
- [ ] Configurable notification preferences (which events trigger Slack messages)

### 10.3 Email Notifications
- [ ] Transactional email setup (Resend, Postmark, or similar)
- [ ] Approval request emails
- [ ] Daily/weekly summary digest
- [ ] Initiative status change alerts
- [ ] Configurable email preferences

---

## Phase 11: Multiplayer

**Goal:** Teams can collaborate on initiatives together.

### 11.1 Core Collaboration
- [ ] Comments on work items
- [ ] Comments on knowledge objects
- [ ] @mention users in comments
- [ ] Comment notifications (in-app + email)

### 11.2 Assignments & Shared State
- [ ] Assign work items to specific team members
- [ ] Assignment notifications
- [ ] Shared initiative workspace state (all members see same data)
- [ ] Activity feed per initiative (who did what)

### 11.3 Lightweight Presence
- [ ] Show who's currently viewing an initiative
- [ ] User avatar indicators on workspace
- [ ] "Last seen" timestamps

---

## Phase 12: Marketing Workflows (End-to-End)

**Goal:** The two wedge use cases work completely from start to finish.

### 12.1 AEO Campaign Workflow
- [ ] User says "create AEO campaign" -> orchestrator triggers AEO skill
- [ ] Clarifying questions phase
- [ ] Retrieve second brain + HubSpot context automatically
- [ ] Strategist agent generates campaign plan
- [ ] Plan appears on Strategize canvas -> user approves
- [ ] Planner agent breaks plan into work items on Orchestrate board
- [ ] Content executor generates draft assets (blog posts, pillar pages)
- [ ] QA agent reviews outputs
- [ ] Draft assets created in HubSpot (with approval gate)
- [ ] User reviews in Orchestrate tab
- [ ] Optimize loop writes learnings back to second brain
- [ ] Full end-to-end test with real HubSpot account

### 12.2 ABM Campaign Workflow
- [ ] Same flow pattern as AEO but with:
  - [ ] Account targeting (pull from HubSpot companies)
  - [ ] Tighter ICP/account context per target
  - [ ] Asset variation by segment/account
  - [ ] Multi-channel content (email, LinkedIn, landing page, ads)
- [ ] Full end-to-end test

---

## Phase 13: Analytics & Observability

**Goal:** Track product health, user engagement, and system reliability.

### 13.1 Product Analytics
- [ ] Onboarding completion rate tracking
- [ ] Time to first initiative
- [ ] Time to first approved plan
- [ ] Time to execution-ready draft
- [ ] Number of approvals per initiative
- [ ] Agent run success rate
- [ ] Blocker frequency
- [ ] Integration failure rates
- [ ] Second brain usage frequency

### 13.2 Business Metrics Dashboard
- [ ] Weekly active teams
- [ ] Initiatives created / completed
- [ ] Campaigns completed
- [ ] Retention / repeat usage
- [ ] Feature adoption tracking

### 13.3 System Observability
- [ ] Error tracking (Sentry or similar)
- [ ] API latency monitoring
- [ ] Agent run performance metrics
- [ ] LLM cost tracking dashboard
- [ ] Background job monitoring (Inngest dashboard)
- [ ] Uptime monitoring

---

## Phase 14: Security & Hardening

**Goal:** Production-ready security posture.

### 14.1 Security Controls
- [ ] Supabase RLS policies tested and hardened (already scaffolded)
- [ ] Workspace isolation verification (no cross-workspace data leaks)
- [ ] Encrypted credential storage for integrations
- [ ] API rate limiting
- [ ] Input sanitization on all user inputs
- [ ] CSRF protection
- [ ] Content Security Policy headers

### 14.2 Approval Enforcement
- [ ] Backend enforcement of approval gates (not just UI)
- [ ] No agent can bypass approval for high-risk actions
- [ ] Approval audit trail is immutable

### 14.3 Admin Controls
- [ ] Admin visibility into all agent actions and errors
- [ ] Ability to disable agents immediately
- [ ] Integration credential rotation
- [ ] User deactivation

---

## Phase 15: Testing & QA

**Goal:** Confidence that the system works reliably.

### 15.1 Automated Tests
- [ ] Database schema tests (migrations apply cleanly)
- [ ] RLS policy tests (workspace isolation)
- [ ] API route tests (CRUD operations)
- [ ] Approval flow tests (state machine correctness)
- [ ] Runtime adapter tests (mock provider)
- [ ] Retrieval adapter tests
- [ ] Orchestration flow tests (intent -> skill -> agent -> output)
- [ ] UI component tests (critical interactions)

### 15.2 Critical Manual QA Scenarios
- [ ] Onboarding happy path
- [ ] Onboarding with partial integrations (no HubSpot)
- [ ] Initiative creation and full AEO workflow
- [ ] Approval rejection and rework flow
- [ ] Agent failure and retry
- [ ] Rollback of second brain change
- [ ] HubSpot write blocked by approval
- [ ] Two users collaborating on one initiative
- [ ] Stale integration credentials (token expired mid-flow)
- [ ] Large file upload and ingestion

---

## Phase 16: Deploy & Launch

**Goal:** Ship to design partners.

### 16.1 Infrastructure
- [ ] Supabase project provisioned (production)
- [ ] Vercel deployment (or similar)
- [ ] Custom domain setup
- [ ] Environment variables configured
- [ ] Database migrations applied to production
- [ ] Seed data for default agents and skills

### 16.2 Internal Alpha
- [ ] Deploy to staging
- [ ] Run full product loop internally (Luke's team)
- [ ] Fix trust, UX, and orchestration failures
- [ ] Performance optimization pass
- [ ] Tighten onboarding to hit 10-15 minute magic moment

### 16.3 Design Partner Pilot (3-8 partners)
- [ ] High-touch onboarding for each partner
- [ ] Weekly working sessions
- [ ] Feedback capture system
- [ ] Rapid iteration on blockers
- [ ] Monitor retention and usage

### 16.4 Case Study Launch
- [ ] Capture before/after story from best design partner
- [ ] Launch messaging: "Hybrid OS helps marketing teams plan and execute campaigns with a hybrid team of humans and agents"
- [ ] Landing page
- [ ] Demo video

---

## Phase Summary & Recommended Order

| Phase | Name | Dependency | Estimated Complexity |
|---|---|---|---|
| 1 | Auth & Real Data | Foundation | Medium |
| 2 | Second Brain | Phase 1 | High |
| 3 | Orchestration (AI Core) | Phase 2 | High |
| 4 | Approval & Trust | Phase 3 | Medium |
| 5 | Agent System | Phases 3, 4 | High |
| 6 | Skill System | Phase 5 | High |
| 7 | Initiative Workspace (Real) | Phases 2-6 | Medium |
| 8 | HubSpot Integration | Phase 1 | Medium |
| 9 | Onboarding Flow | Phases 2, 3, 8 | Medium |
| 10 | Additional Integrations | Phase 1 | Medium |
| 11 | Multiplayer | Phase 1 | Low-Medium |
| 12 | Marketing Workflows E2E | Phases 6-8 | High |
| 13 | Analytics & Observability | Phase 1 | Low-Medium |
| 14 | Security & Hardening | All | Medium |
| 15 | Testing & QA | All | Medium |
| 16 | Deploy & Launch | All | Medium |

### Critical Path (de-risk first)
```
Phase 1 (Auth) -> Phase 2 (Second Brain) -> Phase 3 (Orchestration)
    -> Phase 4 (Approvals) -> Phase 5 (Agents) -> Phase 6 (Skills)
        -> Phase 12 (E2E Marketing Workflows)
```

### Can Be Parallelized
- Phase 8 (HubSpot) can start alongside Phase 3
- Phase 11 (Multiplayer) can start alongside Phase 5
- Phase 13 (Analytics) can start alongside Phase 4
- Phase 10 (Additional Integrations) can start alongside Phase 8

---

## Total Scope

- **~180 line items** across 16 phases
- **Critical path:** Phases 1-6, 12 (the AI core + marketing workflow)
- **Highest risk:** Phase 3 (Orchestration) and Phase 6 (Skill Runner) - these determine whether the product actually works
- **Highest value:** Phase 9 (Onboarding) and Phase 12 (E2E Workflows) - these determine whether users see the magic
