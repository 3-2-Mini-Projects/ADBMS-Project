/**
 * Text.lk SMS Gateway Integration
 * Handles sending loyalty points notifications (earned & redeemed) upon POS sales.
 */

export interface LoyaltySmsParams {
  phone: string;
  customerName: string;
  pointsEarned: number;
  pointsRedeemed: number;
  newPointsBalance: number;
  receiptNumber?: string;
  totalAmount?: number | string;
  branchName?: string;
}

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  recipient?: string;
  error?: string;
  content?: string;
}

/**
 * Format and validate Sri Lankan mobile numbers into international format (947XXXXXXXX).
 * Handles formats: 0771234567, +94771234567, 94771234567, 771234567.
 */
export function formatSriLankanPhoneNumber(phone: string): string | null {
  if (!phone) return null;
  const cleaned = phone.trim().replace(/[^\d+]/g, "");
  let digits = cleaned.replace(/^\+/, "");

  if (digits.startsWith("0")) {
    digits = "94" + digits.substring(1);
  } else if (!digits.startsWith("94") && digits.length === 9) {
    digits = "94" + digits;
  }

  // Must be 11 digits starting with 947... (Sri Lankan mobile network)
  if (digits.startsWith("94") && digits.length === 11) {
    return digits;
  }

  return null;
}

/**
 * Build the message text for loyalty points earned and/or redeemed.
 */
export function buildLoyaltyMessage(params: LoyaltySmsParams): string {
  const firstName = params.customerName?.trim()?.split(" ")[0] || "Valued Customer";
  const store = params.branchName ? `${params.branchName}` : "Supermarket ADBMS";

  const parts: string[] = [];
  parts.push(`Dear ${firstName}, thank you for shopping at ${store}!`);

  if (params.receiptNumber) {
    parts.push(`Bill: ${params.receiptNumber}`);
  }

  // Points breakdown
  const pointsDetails: string[] = [];
  if (params.pointsRedeemed > 0) {
    pointsDetails.push(`Redeemed: ${params.pointsRedeemed} pts`);
  }
  if (params.pointsEarned > 0) {
    pointsDetails.push(`Earned: +${params.pointsEarned} pts`);
  } else if (params.pointsRedeemed === 0) {
    pointsDetails.push(`Earned: 0 pts`);
  }

  if (pointsDetails.length > 0) {
    parts.push(pointsDetails.join(" | "));
  }

  parts.push(`Available Balance: ${params.newPointsBalance} pts.`);
  parts.push(`Have a great day!`);

  return parts.join(" ");
}

/**
 * Send loyalty points SMS via Text.lk API v3.
 */
export async function sendLoyaltySaleSms(params: LoyaltySmsParams): Promise<SmsSendResult> {
  const apiToken =
    process.env.TEXTLK_API_TOKEN || "8400|oyBDrkNm6WOdr1F5hO2pnI6Rc74ufn6gtgWqnR3x07405681";
  const senderId = process.env.TEXTLK_SENDER_ID || "TextLKDemo";

  const formattedPhone = formatSriLankanPhoneNumber(params.phone);
  if (!formattedPhone) {
    console.warn(`[SMS] Invalid Sri Lankan phone number provided: "${params.phone}"`);
    return {
      success: false,
      error: `Invalid Sri Lankan phone number: "${params.phone}"`,
    };
  }

  const messageText = buildLoyaltyMessage(params);

  try {
    const response = await fetch("https://app.text.lk/api/v3/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        recipient: formattedPhone,
        sender_id: senderId,
        type: "plain",
        message: messageText,
      }),
    });

    const data = await response.json();

    if (response.ok && data.status === "success") {
      console.log(`[SMS] Successfully sent loyalty SMS to ${formattedPhone} (UID: ${data.data?.uid})`);
      return {
        success: true,
        messageId: data.data?.uid,
        recipient: formattedPhone,
        content: messageText,
      };
    } else {
      console.error("[SMS] Failed to send SMS via Text.lk:", data);
      return {
        success: false,
        recipient: formattedPhone,
        error: data.message || "Failed to deliver SMS",
        content: messageText,
      };
    }
  } catch (err: any) {
    console.error("[SMS] Network/API error while calling Text.lk:", err);
    return {
      success: false,
      recipient: formattedPhone,
      error: err.message || "Network error",
      content: messageText,
    };
  }
}
