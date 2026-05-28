# Dashboard UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the frontend into a dashboard-style app with a shadcn sidebar shell, analytics-first landing page, and dedicated upload and expenses routes.

**Architecture:** Keep the existing Next.js app router, move dashboard pages under a shared route-group layout, extract shared expense fetching into a reusable client hook, and reuse the existing charts/table/upload logic inside a stronger app-shell structure.

**Tech Stack:** Next.js 14 app router, React 18, TypeScript, Tailwind CSS, shadcn/ui, lucide-react, recharts

---

### Task 1: Scaffold The Shared App Shell

**Files:**
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/components/app-sidebar.tsx`
- Create: `frontend/app/(workspace)/layout.tsx`
- Create: `frontend/components/dashboard/DashboardShell.tsx`

- [ ] Wrap the root layout with the providers required by the new shadcn sidebar scaffold.
- [ ] Replace the generated sample sidebar content with real app branding and navigation.
- [ ] Create a shared route-group layout that hosts `SidebarProvider`, `AppSidebar`, and `SidebarInset`.
- [ ] Add a reusable page-shell component for consistent header/action layout.

### Task 2: Split The App Into Real Routes

**Files:**
- Modify: `frontend/app/page.tsx`
- Delete: `frontend/app/dashboard/page.tsx`
- Create: `frontend/app/(workspace)/dashboard/page.tsx`
- Create: `frontend/app/(workspace)/upload/page.tsx`
- Create: `frontend/app/(workspace)/expenses/page.tsx`

- [ ] Redirect `/` to `/dashboard`.
- [ ] Replace the placeholder dashboard page with the real analytics view under the route group.
- [ ] Move receipt upload into a dedicated `/upload` page.
- [ ] Move the editable table into a dedicated `/expenses` page.

### Task 3: Extract Shared Expense Data Logic

**Files:**
- Create: `frontend/hooks/use-expenses-data.ts`
- Modify: `frontend/lib/api.ts` only if needed for typing support

- [ ] Add a reusable client hook for fetching and refreshing expense data.
- [ ] Keep error handling minimal and compatible with existing API utilities.
- [ ] Reuse that hook across dashboard, upload, and expenses pages.

### Task 4: Upgrade Dashboard Components

**Files:**
- Modify: `frontend/components/dashboard/CategoryPieChart.tsx`
- Modify: `frontend/components/dashboard/SpendBarChart.tsx`
- Modify: `frontend/components/dashboard/InsightsBanner.tsx`
- Create: `frontend/components/dashboard/SummaryCards.tsx`
- Create: `frontend/components/dashboard/RecentExpensesCard.tsx`

- [ ] Add no-data handling to analytics components.
- [ ] Create focused KPI cards for the overview page.
- [ ] Create a recent-expenses preview card for the dashboard.

### Task 5: Polish Styling For The Dashboard Vibe

**Files:**
- Modify: `frontend/app/globals.css`
- Modify: `frontend/components/upload/UploadCard.tsx`
- Modify: `frontend/components/dashboard/ExpenseTable.tsx` only if required for visual consistency

- [ ] Adjust global theme tokens toward a cleaner dashboard surface.
- [ ] Refine upload and table card presentation to match the new shell.
- [ ] Keep the implementation grounded in the existing light theme.

### Task 6: Verify The Frontend

**Files:**
- No file edits required

- [ ] Run `npm run build` in `frontend`.
- [ ] Fix any TypeScript or route integration issues that surface.
- [ ] Confirm the final route structure and summarize any residual gaps.
