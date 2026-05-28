# Dashboard UI Redesign Spec

## Goal

Restructure the frontend into a dashboard-style product UI using the shadcn `sidebar-07` pattern, with analytics as the primary landing experience and receipt upload moved into its own page.

## Routes

- `/` redirects to `/dashboard`
- `/dashboard` shows analytics-first overview
- `/upload` shows the receipt upload workflow
- `/expenses` shows the full editable expense table

## Shared Shell

- Use the shadcn sidebar scaffold as the persistent app shell
- Keep the sidebar navigation limited to real app destinations
- Support desktop collapsed sidebar and mobile sheet behavior from the generated component
- Keep a page header inside the main content area for title, description, and primary action

## Sidebar

- Brand the app as `Expense Categorizer`
- Primary navigation:
  - Dashboard
  - Upload Receipt
  - All Expenses
- Secondary navigation can include one dormant item only if it is clearly non-primary; avoid fake SaaS clutter

## Dashboard Page

- Fetch expense data on load
- Show analytics first:
  - total spend
  - receipt count
  - top category
  - average spend per receipt
- Show the existing insight banner when available
- Reuse the existing pie chart and bar chart in cleaner cards
- Show a recent-expenses preview instead of the full editable table
- Provide a clear CTA to upload a new receipt
- Add intentional empty states for zero receipts

## Upload Page

- Reuse and visually upgrade the existing upload card
- Keep current upload success behavior and latest extraction summary
- Show lightweight supporting context such as current receipt count and total spend
- After successful upload, refresh page data so stats stay current

## Expenses Page

- Reuse the editable table for category corrections
- Wrap the table in a dashboard card with summary context
- Keep the existing category patch flow and refresh after edits

## State And Data Flow

- Extract shared expense fetching into a reusable client hook
- Pages should consume the same backend response shape without duplicating fetch logic
- Upload success should trigger a data refresh on the upload page
- Expense edits should trigger a data refresh on the expenses page

## Styling Direction

- Move away from plain white marketing-page spacing
- Use a muted dashboard background with white cards
- Keep typography crisp and compact
- Preserve a light theme
- Avoid placeholder sections and non-functional analytics

## Verification

- Build the frontend successfully
- Verify route rendering for `/dashboard`, `/upload`, and `/expenses`
- Confirm the shadcn sidebar works after integration
