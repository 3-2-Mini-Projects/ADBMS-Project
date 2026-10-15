# AGENTS.md — Supermarket ADBMS Employee Registration and Login

## 1. Project Objective

Implement a secure employee registration and authentication system for the existing Supermarket ADBMS application.

The application uses Next.js, TypeScript, React, and MySQL. Database operations must use direct SQL queries through the existing database connection helper.

**Do not use an ORM.** Do not introduce Prisma, Drizzle, Sequelize, TypeORM, or another ORM.

The required workflow is:

1. The system has a default administrator account.
2. The administrator logs in.
3. The administrator adds employees and assigns their roles.
4. New employees are stored in the existing `employees` table.
5. Employees who have not set a password activate their accounts.
6. During first-time activation, employees enter a new password and confirm it.
7. The server validates the activation request and stores a secure password hash.
8. After activation, employees can log in using their email and password.
9. The application loads the employee's role and displays the appropriate sections.
10. The server enforces permissions independently of the frontend.

Implement this process incrementally. Complete and test each step before moving to the next.

---

## 2. Mandatory Development Rules

- Use direct MySQL SQL queries only.
- Reuse the existing `src/lib/db.ts` helper where appropriate.
- Use parameterized queries with `?` placeholders for input values.
- Inspect existing pages, API routes, types, database tables, and SQL scripts before creating anything.
- Reuse the existing `employees` table.
- Do not create a duplicate users table.
- Do not rerun the entire database setup script.
- Do not make schema changes without explaining the reason and receiving approval.
- Do not modify unrelated features.
- Do not remove the existing role-dropdown functionality without understanding how it is used.
- Do not treat frontend role selection as authentication or authorization.
- Do not store plain-text passwords.
- Do not expose database credentials, password hashes, activation tokens, or session secrets.
- Do not make database writes or destructive changes without approval.
- Do not claim that a feature works until it has been tested.

## 3. Existing Project Inspection

Before implementation, inspect the current repository and branch.

Review:

- `package.json`
- `src/lib/db.ts`
- `src/lib/types.ts`
- `src/lib/context.tsx`
- `src/app/layout.tsx`
- The existing dashboard page
- The existing employee management page
- `src/app/api/employees/route.ts`
- Existing authentication-related pages and API routes, if any
- The supplied SQL setup script
- Existing audit logging tables and routes

Verify the actual current schema before relying on table or column names.

The previously reviewed SQL script contains an `employees` table with fields including:

- `employee_id`
- `email`
- `password_hash`
- `role`
- `is_active`

Verify all actual fields and constraints before using them.

Existing employee records may have a `NULL` password hash. Do not assume those employees can log in before activating their accounts.

Do not expose `.env` secrets while inspecting configuration.

---

## 4. User Roles and Permissions

The administrator is responsible for creating employee accounts and assigning roles.

Inspect the existing TypeScript role definitions and database constraints before implementing role selection.

The previously observed role values include:

- `ADMIN`
- `MANAGER`
- `CASHIER`
- `STOCK_CLERK`
- `CATALOG_MANAGER`
- `MARKETING`
- `HR`

Use only roles supported by the current project.

### Administrator permissions

The administrator should be able to:

- Log in to the system.
- Access the employee management section.
- Add employee records.
- Assign an allowed role to each employee.
- Set or confirm the employee's branch where required by the existing schema.
- View employee activation status.
- Review employee information.
- Perform permitted employee updates.

Only an authenticated administrator should be allowed to create employee records or assign privileged roles.

An ordinary employee must not be able to create another administrator account.

### Employee permissions

Employees should be able to:

- Activate their own account through the approved first-time setup process.
- Set and confirm a password.
- Log in after successful activation.
- Access application sections permitted by their assigned role.
- Log out securely.

Employees must not be allowed to change their own role by modifying client-side data or API requests.

---

## 5. Required Authentication Flow

### Phase A — Administrator login

1. Display the login page.
2. The administrator enters their email and password.
3. The server retrieves the employee record using parameterized SQL.
4. Verify the password against the stored password hash.
5. Verify that the employee is active.
6. Verify that the account has the administrator role.
7. Create a secure session.
8. Redirect the administrator to the dashboard.

The default administrator account must be provisioned through a secure, documented setup process. Do not create a publicly accessible endpoint that allows anyone to become an administrator.

### Phase B — Administrator creates an employee

1. The administrator opens Employee Management.
2. The administrator enters the required employee details.
3. The administrator selects an allowed role.
4. The server validates the request and administrator permissions.
5. The server checks required fields and unique employee identifiers.
6. The server inserts the employee into the existing `employees` table.
7. The new employee is initially unactivated for password login.
8. The system provides a secure account activation method.
9. The employee is shown in the employee list with an appropriate activation status.

Use the existing employee creation API where possible.

Do not create a second employee table.

### Phase C — Employee first-time password setup

Provide a first-time activation page, for example:

`/activate-account`

The employee should be able to enter:

- Email address, if required by the chosen activation design
- Activation token or one-time invitation code
- New password
- Confirm password

The exact fields should match the secure activation design chosen during implementation.

The employee enters the new password twice.

The frontend may check that the two password values match, but the server must perform the same validation independently.

The server must then:

1. Validate the activation token or code.
2. Verify that the activation is valid, unused, and not expired.
3. Verify that the employee record exists and is active.
4. Verify that the employee has not already completed password activation.
5. Verify that the password meets the agreed password policy.
6. Verify that the password and confirmation match.
7. Hash the password using a maintained password-hashing library.
8. Store the hash in `employees.password_hash`.
9. Mark the activation credential as used.
10. Complete these related changes atomically where the schema supports it.
11. Return a safe success response.
12. Direct the employee to the login page.

Do not permit password setup merely because someone knows an employee's email address or employee ID.

### Phase D — Employee login after activation

1. The employee opens the login page.
2. The employee enters their email and password.
3. The server retrieves the matching employee record.
4. If the password hash is missing, direct the user to the approved activation process without revealing sensitive account information.
5. Verify the password hash.
6. Verify that the employee is active.
7. Create a secure session.
8. Load the employee's actual role from trusted server-side data.
9. Display the appropriate dashboard and navigation.
10. Enforce the same role restrictions on server-side API routes.

### Phase E — Logout

1. The employee selects Logout.
2. The server invalidates or clears the session according to the chosen session design.
3. The browser's session cookie is cleared.
4. Protected API requests without a valid session are rejected.
5. The user returns to the login page.

---

## 6. Account Activation Security

Account activation is a critical security requirement.

A database record existing for an employee does not, by itself, prove that the person requesting a password belongs to that employee.

Use one of these approved approaches:

### Preferred approach: secure invitation

- An authenticated administrator creates an employee.
- The system generates a cryptographically secure, one-time activation token.
- The employee receives the invitation through an approved delivery method.
- The token expires after a limited period and cannot be reused.
- Store only a secure hash of the activation token where the design supports it.
- Do not log or expose the raw token.
- Validate the token before allowing password setup.

### Alternative: administrator-issued activation code

If email delivery is not available, use an administrator-issued, one-time activation code with an appropriate expiry and secure verification.

The delivery process must ensure that the code reaches the intended employee.

### Schema requirements

Inspect the current schema before implementing activation.

If secure activation requires additional database fields or a separate activation-token table, explain:

- Why the existing schema is insufficient.
- Which columns or table would be added.
- How tokens expire and become unusable.
- How token consumption is protected against concurrent requests.

Obtain approval before making the schema change.

Do not store a reusable plaintext activation token in the database.

---

## 7. Recommended File Structure

Adapt this structure to the existing repository. Inspect existing files first and avoid duplicate routes.

```text
supermarket-app/
├── src/
│   ├── app/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── activate-account/
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── logout/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── me/
│   │   │   │   │   └── route.ts
│   │   │   │   └── activate/
│   │   │   │       └── route.ts
│   │   │   └── employees/
│   │   │       └── route.ts
│   │   └── ...
│   └── lib/
│       ├── db.ts
│       ├── auth.ts
│       └── types.ts
└── AGENTS.md
```

The paths are suggestions. Reuse the existing employee API and any authentication files already present.

---

## 8. Direct SQL Requirements

Use the existing MySQL connection helper.

Example employee lookup:

```sql
SELECT employee_id, email, password_hash, role, is_active
FROM employees
WHERE email = ?
LIMIT 1;
```

Example employee insertion:

```sql
INSERT INTO employees (
    branch_id,
    full_name,
    email,
    role,
    is_active,
    password_hash
)
VALUES (?, ?, ?, ?, ?, ?);
```

This insertion is illustrative only. Verify the actual column names, required fields, defaults, and constraints in the current schema before using it.

Use `NULL` for the initial password hash only if the existing schema permits it and this is consistent with the chosen activation design.

Do not assume that all employee fields shown in these examples exist or are optional.

### SQL safety rules

- Use parameterized SQL for all user-provided values.
- Never concatenate submitted values into SQL.
- Validate role values against a server-side allowlist.
- Verify email uniqueness and handle duplicate records safely.
- Do not allow the client to supply an unrestricted administrator role.
- Use transactions for related writes that must succeed or fail together.
- Use conditional updates or row locking as appropriate to prevent activation-token reuse.
- Handle unique-constraint and database errors safely.
- Never print password hashes, activation tokens, or session secrets in logs.

---

## 9. Password Requirements

- Use a maintained password-hashing library, such as Argon2id or bcrypt, after reviewing compatibility with the existing project.
- Never store plain-text passwords.
- Never log passwords.
- Do not send password hashes to the frontend.
- Enforce a documented password policy on the server.
- Require the new password and confirmation to match.
- Do not store password confirmation in the database.
- Use a generic error message for invalid login credentials.
- Reject inactive accounts.
- Do not reveal whether a particular email exists through unauthenticated activation or login responses.

Password hashing must happen on the server.

---

## 10. Session Management and Authorization

Choose a maintained session implementation compatible with the existing Next.js version.

Session cookies should be configured with:

- `HttpOnly`
- `Secure` in production
- `SameSite=Lax` or stricter where compatible
- An appropriate expiration
- A suitable path and scope

Do not store session secrets or long-lived authentication tokens in local storage.

Create reusable server-side helpers for:

- Reading the current session
- Requiring an authenticated employee
- Requiring the administrator role
- Checking the employee's assigned role
- Enforcing branch restrictions where applicable

Protect all relevant API routes, including employee creation and role assignment.

The frontend may hide navigation items based on role, but the server must independently authorize every protected operation.

Do not trust a role supplied by the browser.

---

## 11. Login Audit Logging

Inspect the existing audit-related schema and APIs before creating any new logging table.

If the existing schema supports it, record appropriate security events such as:

- Successful login
- Failed login
- Successful account activation
- Logout
- Administrator employee creation
- Employee role assignment
- Account deactivation

Record only the fields supported by the actual schema and appropriate to the security requirements.

Never log:

- Plain-text passwords
- Password hashes
- Raw activation tokens
- Session cookies
- Session secrets
- Database credentials

Do not allow ordinary employees to edit or delete security audit history unless explicitly authorized by the requirements.

Keep application error logs separate from user-visible error messages.

---

## 12. Step-by-Step Implementation Plan

Complete only the current step. Report the files changed and tests performed, then wait for developer confirmation.

### Step 0 — Inspect the current project

- Review the current branch and working-tree status.
- Inspect the package scripts and installed dependencies.
- Inspect the database helper and TypeScript types.
- Inspect the employee page and API.
- Review the existing SQL script.
- Confirm current database column names and constraints.
- Check for existing login, session, activation, and audit implementations.
- Record existing lint, type-check, build, and test failures.
- Make no code changes.

### Step 1 — Agree on the activation design

- Confirm how the default administrator is provisioned.
- Confirm which employee fields are required.
- Decide how activation tokens or codes will be delivered.
- Decide token expiry and one-time-use behavior.
- Identify any schema additions required.
- Explain proposed dependencies and schema changes.
- Ask for approval before installing dependencies or changing the schema.

### Step 2 — Implement administrator authentication

- Securely verify administrator credentials.
- Verify active status and administrator role.
- Establish a secure session.
- Test successful and failed logins.
- Do not allow an unauthenticated user to establish an administrator session.

### Step 3 — Implement employee creation

- Reuse the existing employee page and API.
- Protect employee creation with server-side administrator authorization.
- Validate required employee fields.
- Validate the selected role against an allowlist.
- Insert the employee using parameterized SQL.
- Provide a safe initial activation status.
- Generate the approved activation invitation.
- Test duplicate emails, invalid roles, and unauthorized requests.

### Step 4 — Implement first-time password activation

- Add the activation page and API.
- Validate the activation token or code on the server.
- Verify expiry, one-time use, employee status, and password confirmation.
- Hash the password on the server.
- Update the existing employee record.
- Invalidate the activation credential atomically where supported.
- Test expired, invalid, reused, and valid activation credentials.

### Step 5 — Implement employee login

- Verify employee credentials.
- Reject inactive employees and invalid passwords.
- Handle employees without password hashes safely.
- Create the secure session.
- Load the actual employee role from server-side data.
- Test successful and failed login scenarios.

### Step 6 — Connect the frontend and app context

- Add or reuse the login page.
- Add the first-time activation page.
- Load the authenticated employee through the server session.
- Replace automatic employee selection as the source of identity.
- Preserve appropriate role-based navigation.
- Handle loading, logged-out, and expired-session states.
- Test refresh, direct URL access, and logout behavior.

### Step 7 — Protect existing APIs

- Add reusable authentication and authorization helpers.
- Protect employee, shift, and other relevant APIs.
- Enforce roles and branch restrictions server-side.
- Test allowed and denied requests for each relevant role.
- Ensure changing the dropdown cannot grant permissions.

### Step 8 — Implement audit logging

- Reuse the existing audit schema where possible.
- Record approved authentication and employee-management events.
- Exclude secrets and password information.
- Restrict access to audit information.
- Test expected audit events.

### Step 9 — Final verification

Test:

- Administrator login
- Unauthorized administrator access
- Employee creation
- Invalid employee role
- Duplicate employee email
- Valid first-time activation
- Password confirmation mismatch
- Invalid activation token
- Expired activation token
- Reused activation token
- Login before activation
- Login after activation
- Incorrect password
- Inactive employee
- Session expiration
- Logout
- Role-based navigation
- Direct requests to protected APIs
- SQL injection attempts through inputs
- Appropriate audit records

Run the relevant project lint, type-check, build, and test scripts.

Document the results and remaining limitations.

---

## 13. Required Response Format for the Coding Agent

For every step, provide:

1. **Goal** — what the current step accomplishes.
2. **Inspection** — exact files and database objects reviewed.
3. **Plan** — the smallest required changes.
4. **Implementation** — code changes with file paths.
5. **SQL** — parameterized queries and verified schema assumptions.
6. **Commands** — exact commands to run.
7. **Tests** — expected results for successful and failed cases.
8. **Security review** — authentication, authorization, and data-handling implications.
9. **Stop point** — wait for developer confirmation before proceeding.

Do not skip steps or silently implement future phases.

## 14. Definition of Done

The development process is complete when:

- The administrator can securely log in.
- Only authorized administrators can create employees and assign roles.
- New employee records are stored in the existing `employees` table.
- Employees can securely activate their accounts and set a password with confirmation.
- Activation credentials expire and cannot be reused.
- Employees can log in after successful activation.
- The application loads the authenticated employee's actual role.
- Server-side APIs enforce authentication and authorization.
- Logout invalidates the session.
- Relevant security events are logged without secrets.
- Direct SQL is used throughout.
- No ORM has been introduced.
- Tests and remaining limitations are documented.

When the existing schema or requirements are unclear, inspect the source and ask one focused question rather than guessing.
