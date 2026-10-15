# AGENTS.md — Supermarket ADBMS Login and Authentication Development

## 1. Mission

Implement login and authentication for the existing Supermarket ADBMS Next.js application incrementally. Reuse the existing repository structure, MySQL schema, database helper, app context, layout, pages, and APIs whenever possible.

**Mandatory database rule: use direct SQL queries through the existing MySQL helper. Do not use an ORM.** Do not introduce Prisma, Drizzle, Sequelize, TypeORM, MikroORM, or similar tools.

Complete one step at a time. After each step, summarize the files changed, commands/checks run, results, and remaining concerns. Stop and wait for the developer's confirmation before starting the next step.

## 2. Important distinction: role UI vs authentication

The current application already changes visible navigation/sections when a role is selected in a dropdown. Preserve that behavior where useful, but do not treat the dropdown as authentication or as a security boundary.

- **Authentication** verifies the identity of the employee who signed in.
- **Authorization** checks which actions and data that authenticated employee may access.
- **UI role filtering** only controls what is displayed and must not be relied on to protect API endpoints.

After authentication is implemented, the server-verified employee role must be the source of truth for permissions. Do not allow a user to gain permissions by changing the dropdown, browser state, request body, or URL.

## 3. Project context to verify before coding

Known from prior repository/schema inspection; verify current files and branch because they may have changed:

- Next.js App Router project under `supermarket-app`, using TypeScript, React, `mysql2`, and `lucide-react`.
- Existing database helper: `src/lib/db.ts`.
- Existing employee types: `src/lib/types.ts`.
- Existing app context: `src/lib/context.tsx`.
- Existing root layout: `src/app/layout.tsx`.
- Existing employee API: `src/app/api/employees/route.ts`.
- Existing shift API: `src/app/api/shifts/route.ts`.
- The supplied SQL script uses database `supermarket_oltp` and has an `employees` table with `email`, `password_hash`, `role`, and `is_active`.
- Some seeded employees may have `password_hash = NULL`; do not assume those accounts can sign in.
- No login page or authentication API was present on the inspected branch at the time of prior inspection. Recheck the current branch before creating files.

Do not assume the live database name, schema, seed values, role names, or helper signatures without confirming them. Do not rerun the setup SQL or create a duplicate users table.

## 4. Non-negotiable implementation rules

1. Use SQL directly via the existing `mysql2/promise` helper.
2. Parameterize all user-supplied SQL values with placeholders such as `?`.
3. Never concatenate user input into SQL.
4. Use a strict allowlist for any dynamic SQL identifiers.
5. Do not add an ORM or a second database access layer that duplicates the existing helper.
6. Inspect existing pages/routes before adding new ones; extend rather than duplicate.
7. Do not make repository writes, run database writes, install dependencies, or change schema without the developer's explicit approval.
8. Never put secrets, credentials, plain-text passwords, password hashes, session tokens, or `.env` contents in source control or logs.
9. Do not claim checks passed unless they were actually run.
10. Do not change unrelated functionality or perform broad refactors.

## 5. Recommended authentication structure

Use this as a target structure, not permission to create duplicates before inspection:

```text
src/app/
  login/
    page.tsx
  api/
    auth/
      login/
        route.ts
      logout/
        route.ts
      me/
        route.ts
src/lib/
  db.ts          # existing SQL helper; reuse
  auth.ts        # session verification and auth helpers, if appropriate
```

- `login/page.tsx`: login form and safe feedback.
- `api/auth/login/route.ts`: validate input, query employee with parameterized SQL, verify password, reject inactive/invalid accounts, and establish a secure session.
- `api/auth/logout/route.ts`: clear the session.
- `api/auth/me/route.ts`: return a minimal safe profile for the current session, if the app needs a client endpoint.
- `src/lib/auth.ts`: shared server-only session and authorization helpers, if appropriate for the project's Next.js version.

Confirm the installed Next.js version and its supported cookie/session APIs before implementing. Keep server-only secrets and functions out of client bundles.

## 6. Security requirements

- Use a maintained password hashing library such as bcrypt/bcryptjs or Argon2, selected based on compatibility with the current runtime and dependencies. Explain the choice before installing anything.
- Never store or compare plain-text passwords. Verify the submitted password against `employees.password_hash` using the chosen library.
- Check `is_active` before allowing a session.
- Use generic credential failure responses so the endpoint does not disclose whether an email exists.
- Establish sessions using a maintained, cryptographically secure session approach appropriate for Next.js. Do not invent home-grown cryptography or use unsigned client-controlled role data.
- Use an `HttpOnly` cookie, `Secure` in production, appropriate `SameSite` policy, and an explicit expiration. Evaluate CSRF protections for state-changing endpoints.
- Keep session lifetime and logout behavior consistent.
- Enforce authentication and role/branch authorization in server-side API routes and server components where applicable.
- Never trust a role, employee ID, or branch ID supplied by the client as proof of authority.
- Validate and normalize input on the server, including email and password length limits.
- Avoid logging passwords, password hashes, cookies, session tokens, or full sensitive request bodies.
- Do not create an unauthenticated production endpoint that can set an arbitrary employee or administrator password.
- If login throttling or lockout is considered, first inspect existing infrastructure and requirements; do not invent schema changes without approval.

## 7. SQL conventions

Use the existing helper and its actual signature. Example only:

```ts
const employee = await queryOne<Employee>(
  `SELECT employee_id, email, password_hash, role, is_active, branch_id
     FROM employees
    WHERE email = ?
    LIMIT 1`,
  [normalizedEmail]
);
```

Confirm that every selected column exists in the actual schema and type definitions before using it. If `branch_id` or another field is absent, remove it or establish the correct schema first; do not guess.

- Query only required columns.
- Use transactions for multi-query writes that must be atomic.
- Release acquired connections in `finally` blocks.
- Handle database errors safely and log only non-sensitive server-side diagnostic information.
- Do not assume a password hash exists for seeded accounts.

## 8. Step-by-step implementation plan

### Step 0 — Baseline inspection (no edits)

1. Confirm current branch and working tree changes.
2. Inspect `package.json`, available scripts, `src/lib/db.ts`, `src/lib/types.ts`, `src/lib/context.tsx`, `src/app/layout.tsx`, sidebar/navigation, and existing API routes/pages.
3. Search for existing login, session, password, middleware, and authorization code before creating anything.
4. Review the supplied SQL script for exact employee column names and types.
5. Confirm environment variable names without printing secret values.
6. Run existing lint/type/build checks if available and record baseline failures.

**Done when:** current structure and baseline are documented. No files or database rows changed.

### Step 1 — Authentication design and dependencies

1. Confirm the current schema supports employee login through `email`, `password_hash`, `role`, and `is_active`.
2. Select the smallest compatible set of maintained password/session dependencies.
3. Explain security and compatibility tradeoffs before adding dependencies.
4. Decide how an initial password hash will be safely provisioned for a known employee.
5. Do not create a users table or modify the schema unless inspection proves it necessary and the developer approves.

**Done when:** design and any proposed dependency changes are approved. No password or database write yet.

### Step 2 — Secure initial password provisioning

1. Confirm the target employee using a non-secret identifier, such as their email.
2. Propose a local-only password-hash generation procedure that does not print or commit the password.
3. Explain the exact database update before running it.
4. Obtain explicit approval before executing any database write.
5. Verify only that the intended row was updated; never display the password or hash.

Never add a public setup endpoint for initial admin credentials.

### Step 3 — Login API and session creation

1. Add the login route only after confirming it does not already exist.
2. Validate request shape, email, and password on the server.
3. Use a parameterized SQL query against the existing `employees` table.
4. Verify the password hash and reject missing hashes, invalid credentials, and inactive employees.
5. Create a secure session and set the cookie with appropriate flags and expiration.
6. Return only safe employee fields; never return `password_hash`.
7. Add safe error handling and focused tests/manual cases.

**Verification:** valid active account succeeds; wrong password, unknown email, null hash, and inactive account fail with safe responses; SQL injection input is treated as data; secrets are not logged.

### Step 4 — Login page

1. Follow the project's existing styling and components.
2. Add email/password fields, submission state, validation feedback, and generic credential errors.
3. Submit to the login API; do not implement password verification in the browser.
4. Avoid logging or retaining passwords unnecessarily.
5. Redirect to the appropriate existing app page after success.
6. Ensure logged-out users are directed to login where appropriate.

**Verification:** form submission works; errors are clear but do not disclose account existence; loading state prevents accidental duplicate submissions.

### Step 5 — Current-user endpoint and app context

1. Add a current-user endpoint only if needed by the existing client architecture.
2. Resolve the employee from the verified session on the server.
3. Replace automatic selection of an ADMIN/MANAGER employee with the authenticated employee.
4. Treat the role dropdown as display/testing UI only, or remove/disable it in production as appropriate to requirements.
5. Handle loading, logged-out, and expired-session states.
6. Return only safe profile fields to the client.

**Verification:** refreshing preserves a valid session; logout/expiration clears authenticated UI; a client cannot select another employee to impersonate them.

### Step 6 — Logout

1. Clear/invalidate the session using the selected session strategy.
2. Expire the cookie with matching cookie attributes.
3. Reset client auth state and navigate to login.
4. Ensure protected APIs reject the old session after logout.

**Verification:** logout succeeds; the previous session cannot access protected APIs afterward.

### Step 7 — Server-side authorization

1. Implement reusable server-only helpers for session lookup and role checks.
2. Protect each existing API route and protected page/server action as appropriate.
3. Define role permissions from verified project requirements and existing role types; do not guess permissions.
4. Enforce branch scope where the schema and business rules require it.
5. Keep sidebar filtering for usability, but never rely on it for security.

**Verification:** test allowed and denied roles, direct API calls, modified client role values, and cross-branch access where relevant.

### Step 8 — Login audit logging (only if requested/required)

Distinguish **application authentication logs** from **audit records**. Inspect existing `audit_log` and `error_log` tables and their schema first. Reuse them if they are intended for these events; do not create a duplicate table without approval.

Potential events, subject to requirements and schema support:

- successful login,
- failed login,
- logout,
- rejected authorization attempt,
- unexpected authentication service error.

Rules:

- Never store passwords, password hashes, cookies, session tokens, or complete sensitive request bodies in logs.
- Record only necessary fields supported by the existing schema, such as event type, timestamp, actor ID when known, and a safe result/status.
- Avoid recording excessive personal data or raw stack traces in user-facing pages.
- Do not let audit logging failures accidentally reveal secrets or silently undermine critical security behavior; define and test the intended failure policy.
- Never allow ordinary users to modify audit history unless requirements explicitly permit it.

### Step 9 — Final verification

Run available project checks based on `package.json`, such as lint, type-check, build, and tests. Do not assume script names exist.

Test:

- valid active employee login,
- invalid password and unknown email,
- missing/null password hash,
- inactive employee,
- logout and old-session rejection,
- session expiration,
- unauthorized role and direct API request,
- branch restrictions where applicable,
- input validation and SQL injection resistance,
- safe error messages and absence of secrets in logs,
- existing role-dependent UI still works.

Summarize files changed, commands run, results, known issues, and manual checks still required.

## 9. Required response format for every step

For each step, report:

1. **Goal** — what this step accomplishes.
2. **Inspect** — exact files/schema objects to examine.
3. **Changes** — minimal changes and exact paths.
4. **SQL** — parameterized SQL and confirmed schema assumptions.
5. **Run** — exact commands based on available project scripts.
6. **Verify** — expected success and failure cases.
7. **Stop point** — wait for developer confirmation before the next step.

When the repository, schema, runtime, role rules, or expected behavior is unclear, ask one focused question rather than guessing.

## 10. Definition of done

A step is complete only when its implementation matches the inspected repository and schema, SQL is parameterized, no ORM was introduced, security checks are server-side where required, relevant checks were run or clearly marked as not run, and the developer knows how to verify the result.
