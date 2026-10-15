import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { query } from "./db";
import { UserRole } from "./types";
import { PermissionKey, canAccess } from "./permissions";

export const SESSION_COOKIE_NAME = "adbms_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

export interface SessionEmployee {
  employee_id: number;
  email: string;
  full_name: string;
  role: UserRole;
  branch_id: number;
}

export interface SessionPayload extends SessionEmployee {
  exp: number; // Unix timestamp in seconds
  iat: number; // Unix timestamp in seconds
}

function getSessionSecret(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET environment variable is missing.");
    }
    return Buffer.from("adbms_supermarket_local_dev_fallback_secret_32bytes!", "utf-8");
  }
  return Buffer.from(secret, "utf-8");
}

export function createSessionToken(
  employee: SessionEmployee,
  maxAgeSeconds = SESSION_MAX_AGE_SECONDS
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    ...employee,
    iat: now,
    exp: now + maxAgeSeconds,
  };

  const secret = getSessionSecret();
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string") {
    return null;
  }

  const dotIndex = token.indexOf(".");
  if (dotIndex === -1 || token.lastIndexOf(".") !== dotIndex) {
    return null;
  }

  const encodedPayload = token.slice(0, dotIndex);
  const actualSignature = token.slice(dotIndex + 1);

  try {
    const secret = getSessionSecret();
    const expectedSignature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");

    const actualBuf = Buffer.from(actualSignature, "utf-8");
    const expectedBuf = Buffer.from(expectedSignature, "utf-8");

    if (
      actualBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(actualBuf, expectedBuf)
    ) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8")) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);

    if (!payload.exp || payload.exp < now || !payload.employee_id || !payload.email || !payload.role) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export const AUTH_COOKIE_OPTIONS = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

export async function getServerSession(): Promise<SessionEmployee | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return null;
    }

    const payload = verifySessionToken(sessionCookie.value);
    if (!payload) {
      return null;
    }

    return {
      employee_id: payload.employee_id,
      email: payload.email,
      full_name: payload.full_name,
      role: payload.role,
      branch_id: payload.branch_id,
    };
  } catch {
    return null;
  }
}

export type AuthResult =
  | { session: SessionEmployee; error?: never }
  | { session?: never; error: NextResponse };

export async function authenticateRequest(): Promise<AuthResult> {
  const session = await getServerSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized: Active session required. Please sign in." },
        { status: 401 }
      ),
    };
  }
  return { session };
}

export async function authorizeRequest(
  permission?: PermissionKey,
  allowedRoles?: UserRole[]
): Promise<AuthResult> {
  const auth = await authenticateRequest();
  if (auth.error) {
    return auth;
  }

  const { session } = auth;

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    await logAuthEvent({
      event: "FORBIDDEN_ATTEMPT",
      employee_id: session.employee_id,
      email: session.email,
      role: session.role,
      details: { requiredRoles: allowedRoles },
    });
    return {
      error: NextResponse.json(
        { error: `Forbidden: Role '${session.role}' is not authorized for this action.` },
        { status: 403 }
      ),
    };
  }

  if (permission && !canAccess(session.role, permission)) {
    await logAuthEvent({
      event: "FORBIDDEN_ATTEMPT",
      employee_id: session.employee_id,
      email: session.email,
      role: session.role,
      details: { requiredPermission: permission },
    });
    return {
      error: NextResponse.json(
        { error: `Forbidden: Missing required permission '${permission}'.` },
        { status: 403 }
      ),
    };
  }

  return { session };
}

export async function logAuthEvent(params: {
  event: "LOGIN_SUCCESS" | "LOGIN_FAILURE" | "LOGOUT" | "FORBIDDEN_ATTEMPT";
  employee_id?: number | null;
  email?: string;
  role?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const recordId = params.employee_id ? String(params.employee_id) : (params.email || "unknown");
    const changedBy = params.employee_id ? `employee_${params.employee_id}` : "system";
    const payload = JSON.stringify({
      event: params.event,
      email: params.email,
      role: params.role,
      ...params.details,
    });

    await query(
      `INSERT INTO audit_log (table_name, record_id, action, new_value, changed_by, changed_at)
       VALUES ('employees', ?, 'UPDATE', ?, ?, NOW())`,
      [recordId, payload, changedBy]
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("Audit log recording skipped:", message);
  }
}
