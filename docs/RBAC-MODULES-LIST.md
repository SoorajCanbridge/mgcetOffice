# Permissions needed to access pages

**Actions:** `view` = can open the page (read-only). `edit` = can open the page + create, edit, delete where the app shows those actions.

**No permission required:** Dashboard (`/app`) and Analytics (`/app/analytics`) — any logged-in user can access.

---

## Page → Permission (resource + view)

| Route | Permission (resource) | To view page | To create/edit/delete |
|-------|------------------------|--------------|------------------------|
| `/app` | — | No permission | — |
| `/app/analytics` | — | No permission | — |
| `/app/courses` | `academic` | view | edit |
| `/app/students` | `students` | view | edit |
| `/app/staff` | `staff` | view | edit |
| `/app/staff-attendance` | `attendance` | view | edit |
| `/app/invoices/saved-contents` | `fees` | view | edit |
| `/app/invoices` | `invoice` | view | edit |
| `/app/invoices/payments` | `payments` | view | edit |
| `/app/payroll` | `payroll` | view | edit |
| `/app/finance/tracking` | `finance` | view | edit |
| `/app/finance/tracking/income` | `finance` | view | edit |
| `/app/finance/tracking/expenses` | `finance` | view | edit |
| `/app/finance/tracking/reports` | `finance` | view | edit |
| `/app/finance/categories` | `finance` | view | edit |
| `/app/accounts` | `finance` | view | edit |
| `/app/ledgers` | `finance` | view | edit |
| `/app/ledgers/balance-sheet` | `finance` | view | edit |
| `/app/settings/general` | `settings` | view | edit |
| `/app/settings/attendance` | `settings` | view | edit |
| `/app/settings/acadamic` | `settings` | view | edit |
| `/app/settings/team` | `team` | view | edit |
| `/app/settings/roles` | `team` | view | edit |

---

## By resource (for role assignment)

| Resource | Pages it controls |
|----------|-------------------|
| `dashboard` | `/app` (no check in app — open to all) |
| `analytics` | `/app/analytics` (no check in app — open to all) |
| `academic` | Courses |
| `students` | Students |
| `staff` | Staff |
| `attendance` | Staff attendance |
| `fees` | Invoice template |
| `invoice` | Invoices |
| `payments` | Payments |
| `payroll` | Payroll |
| `finance` | Finance dashboard, Accounts, Ledgers, Balance sheet, Income, Expenses, Categories, Reports |
| `settings` | General, Attendance, Academic settings |
| `team` | Team & users, Roles |

---

## Backend role payload example

To allow viewing and editing Students and Finance only:

```json
{
  "name": "accountant",
  "description": "Students view + full finance",
  "permissions": [
    { "resource": "students", "action": "view" },
    { "resource": "finance", "action": "edit" }
  ]
}
```

No access: omit the resource from `permissions` or set `"action": "none"`.
