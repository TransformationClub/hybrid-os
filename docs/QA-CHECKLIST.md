# Critical Path QA Checklist

Manual QA checklist for Hybrid OS. Run through before each release.

---

## Auth

- [ ] Login with email + password
- [ ] Login shows validation errors for empty fields
- [ ] Login shows error for wrong credentials
- [ ] Signup with new account (full name, email, password, workspace name)
- [ ] Signup validates password length (min 8 chars)
- [ ] Signup validates password confirmation match
- [ ] Signup validates all required fields
- [ ] Logout redirects to /login
- [ ] Forgot password sends reset email
- [ ] Magic link login works (if enabled)
- [ ] Auth redirects unauthenticated users to /login

---

## Home / Dashboard

- [ ] Dashboard loads without errors
- [ ] Approval queue card shows pending count
- [ ] Activity feed displays recent events
- [ ] Workspace name displays in sidebar/header
- [ ] Navigation sidebar links all work
- [ ] Command menu opens with Cmd+K

---

## Initiatives

- [ ] Initiatives list page loads
- [ ] Create new initiative (name, type, goal)
- [ ] View initiative detail page
- [ ] Edit initiative fields (name, goal, brief, success criteria)
- [ ] Change initiative status (draft, planning, active, paused, completed)
- [ ] Archive initiative
- [ ] Delete initiative (confirm dialog)
- [ ] Work items display on initiative detail
- [ ] Create work item (task, deliverable, approval, blocker)
- [ ] Drag-and-drop work items between status columns
- [ ] Filter initiatives by status
- [ ] Link knowledge objects to initiative
- [ ] Unlink knowledge objects from initiative

---

## Second Brain

- [ ] Brain page loads with knowledge objects
- [ ] Search knowledge objects by keyword
- [ ] Create new knowledge object
- [ ] Edit knowledge object content
- [ ] View version history for a knowledge object
- [ ] Folder/tag navigation works
- [ ] Delete knowledge object (confirm dialog)

---

## Agents

- [ ] Agents list page loads with default agents
- [ ] Create new agent (name, role, risk level, tools)
- [ ] Configure agent settings (tone, system prompt, approval requirements)
- [ ] Toggle agent active/inactive
- [ ] View agent run history
- [ ] Agent run detail shows input/output
- [ ] Delete/deactivate agent

---

## Skills

- [ ] Skills list page loads with default skills
- [ ] Create new skill (name, purpose, workflow steps)
- [ ] Edit skill configuration
- [ ] Run a skill manually
- [ ] Skill run shows step-by-step progress
- [ ] View skill run results
- [ ] Submit feedback on skill run (thumbs up/down)
- [ ] Delete/deactivate skill

---

## Approvals

- [ ] Approvals page loads
- [ ] Pending approvals display with details
- [ ] Approve a single approval
- [ ] Reject a single approval
- [ ] Request changes on an approval
- [ ] Batch approve multiple approvals
- [ ] Batch reject multiple approvals
- [ ] Filter approvals by status (pending, approved, rejected)
- [ ] Filter approvals by category
- [ ] Inline approval cards on dashboard

---

## Integrations

- [ ] HubSpot: initiate OAuth connect flow
- [ ] HubSpot: verify connection status displays
- [ ] HubSpot: disconnect integration
- [ ] Google Drive: initiate OAuth connect flow
- [ ] Google Drive: verify connection status displays
- [ ] Google Drive: disconnect integration
- [ ] Slack: initiate OAuth connect flow
- [ ] Slack: verify connection status displays
- [ ] Slack: disconnect integration
- [ ] Webhook endpoints respond correctly (/api/webhooks/hubspot, /api/webhooks/slack)

---

## Settings

- [ ] Profile page loads
- [ ] Update profile (full name, avatar)
- [ ] Team/members page loads
- [ ] Invite new member (email, role)
- [ ] Change member role
- [ ] Remove member from workspace
- [ ] Notification preferences load
- [ ] Toggle notification channels (email, in-app)
- [ ] Integration settings page shows connected services

---

## Onboarding

- [ ] Onboarding flow starts after signup
- [ ] Guided interview captures business context
- [ ] Data source connection step works
- [ ] First campaign suggestion generates
- [ ] Onboarding completes and redirects to dashboard
- [ ] Skip steps work without errors

---

## Cross-Cutting

- [ ] Responsive layout on tablet (768px)
- [ ] Dark mode toggle (if implemented)
- [ ] Error boundary catches and displays errors gracefully
- [ ] 404 page displays for unknown routes
- [ ] Loading states show during data fetches
- [ ] Toast notifications appear for actions (create, update, delete)
- [ ] No console errors in browser DevTools during normal usage
