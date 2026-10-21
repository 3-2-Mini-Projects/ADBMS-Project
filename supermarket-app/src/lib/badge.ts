import crypto from "crypto";
import QRCode from "qrcode";

export interface StaffBadgePayload {
  empId: number;
  role: string;
  type: "staff_badge";
  v: number;
}

export interface VerifiedStaffBadge {
  employeeId: number;
  role?: string;
  isSigned: boolean;
}

interface RawSignedBadge {
  sig: string;
  empId: number;
  role?: string;
  type?: string;
  v?: number;
}

function isRawSignedBadge(obj: unknown): obj is RawSignedBadge {
  if (!obj || typeof obj !== "object") return false;
  return "sig" in obj && typeof obj.sig === "string" && "empId" in obj && typeof obj.empId === "number";
}

function getSigningSecret(): string {
  return process.env.SESSION_SECRET || "adbms_supermarket_local_dev_fallback_secret_32bytes!";
}

/**
 * Generates a tamper-proof cryptographically signed badge payload string.
 */
export function generateBadgePayload(employeeId: number, role: string): string {
  const payload: StaffBadgePayload = {
    empId: employeeId,
    role,
    type: "staff_badge",
    v: 1,
  };

  const secret = getSigningSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");

  return JSON.stringify({
    ...payload,
    sig: signature,
  });
}

/**
 * Verifies a scanned QR code or barcode string.
 * Supports both cryptographically signed JSON payloads and physical badge IDs (e.g. EMP-0012).
 */
export function verifyBadgePayload(scannedText: string): VerifiedStaffBadge | null {
  if (!scannedText || typeof scannedText !== "string") {
    return null;
  }

  const trimmed = scannedText.trim();

  // 1. Try parsing cryptographically signed JSON payload
  try {
    const data = JSON.parse(trimmed) as unknown;
    if (isRawSignedBadge(data)) {
      const orderedPayload: StaffBadgePayload = {
        empId: data.empId,
        role: String(data.role || "STAFF"),
        type: "staff_badge",
        v: Number(data.v || 1),
      };

      const secret = getSigningSecret();
      const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(orderedPayload))
        .digest("hex");

      const actualBuf = Buffer.from(data.sig, "utf-8");
      const expectedBuf = Buffer.from(expectedSig, "utf-8");


      if (
        actualBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(actualBuf, expectedBuf)
      ) {
        return {
          employeeId: orderedPayload.empId,
          role: orderedPayload.role,
          isSigned: true,
        };
      }
    }
  } catch {
    // Not a JSON payload; proceed to raw badge format check
  }

  // 2. Fallback for physical supermarket barcode/laser scanners (e.g., "EMP-0012" or "EMP-12")
  const match = trimmed.match(/^(?:EMP|ADBMS-EMP)-?0*(\d+)$/i);
  if (match) {
    const id = parseInt(match[1], 10);
    if (!Number.isNaN(id) && id > 0) {
      return {
        employeeId: id,
        isSigned: false,
      };
    }
  }

  // 3. Fallback for raw employee ID number entered manually
  const numericId = parseInt(trimmed, 10);
  if (!Number.isNaN(numericId) && numericId > 0 && String(numericId) === trimmed) {
    return {
      employeeId: numericId,
      isSigned: false,
    };
  }

  return null;
}

/**
 * Generates a base64 Data URL for embedding or printing a QR code image.
 */
export async function generateBadgeQrDataUrl(
  employeeId: number,
  role: string
): Promise<string> {
  const payload = generateBadgePayload(employeeId, role);
  return QRCode.toDataURL(payload, {
    width: 320,
    margin: 2,
    color: {
      dark: "#0f172a", // slate-900
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}
