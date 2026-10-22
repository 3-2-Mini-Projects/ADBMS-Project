export const COMPANY_EMAIL_DOMAIN = "shop.lk";

export interface EmailValidationResult {
  valid: boolean;
  normalizedEmail: string;
  error?: string;
}

/**
 * Validates and normalizes an employee's official store email address.
 * Automatically appends @shop.lk if only the username is provided.
 */
export function validateStaffEmail(rawEmail: string): EmailValidationResult {
  if (!rawEmail || typeof rawEmail !== "string") {
    return {
      valid: false,
      normalizedEmail: "",
      error: "Email address is required.",
    };
  }

  let trimmed = rawEmail.trim().toLowerCase();

  // If the administrator only entered the username prefix (e.g. "kamala"), auto-append @shop.lk
  if (!trimmed.includes("@")) {
    trimmed = `${trimmed}@${COMPANY_EMAIL_DOMAIN}`;
  }

  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    return {
      valid: false,
      normalizedEmail: trimmed,
      error: "Invalid email structure.",
    };
  }

  const [username, domain] = parts;

  if (username.length < 3) {
    return {
      valid: false,
      normalizedEmail: trimmed,
      error: "Employee email username must be at least 3 characters long.",
    };
  }

  // Strict username character check: alphanumeric, dots, underscores, dashes
  const usernameRegex = /^[a-z0-9._-]+$/;
  if (!usernameRegex.test(username)) {
    return {
      valid: false,
      normalizedEmail: trimmed,
      error: "Username contains invalid characters. Use letters, numbers, dots, or dashes.",
    };
  }

  if (domain !== COMPANY_EMAIL_DOMAIN) {
    return {
      valid: false,
      normalizedEmail: trimmed,
      error: `Invalid email domain. Staff accounts must use the official @${COMPANY_EMAIL_DOMAIN} company address.`,
    };
  }

  return {
    valid: true,
    normalizedEmail: trimmed,
  };
}
