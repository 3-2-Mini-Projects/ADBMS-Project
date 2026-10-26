import nodemailer from "nodemailer";

export interface LoyaltyEmailParams {
  email: string;
  customerName: string;
  pointsEarned: number;
  pointsRedeemed: number;
  newPointsBalance: number;
  customerTier?: string;
  cardNumber?: string;
  receiptNumber?: string;
  totalAmount?: number | string;
  branchName?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  recipient?: string;
  error?: string;
}

/**
 * Configure reusable nodemailer transporter
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER || "baddeal200@gmail.com";
  const pass = (process.env.SMTP_PASS || "nggj mccj cnaq nskw").replace(/\s+/g, "");

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Build rich HTML email template for loyalty points earned/redeemed
 */
export function buildLoyaltyHtml(params: LoyaltyEmailParams): string {
  const customerName = params.customerName?.trim() || "Valued Customer";
  const store = params.branchName || "Nexus Supermarket";
  const tier = params.customerTier ? params.customerTier.toUpperCase() : "MEMBER";
  const totalStr = params.totalAmount ? `Rs. ${Number(params.totalAmount).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "";
  const balanceValue = `Rs. ${Number(params.newPointsBalance).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const earned = Number(params.pointsEarned || 0);
  const redeemed = Number(params.pointsRedeemed || 0);

  // Tier color styling
  let tierBadgeBg = "#10b981";
  let tierBadgeColor = "#ffffff";
  if (tier === "PLATINUM") {
    tierBadgeBg = "linear-gradient(135deg, #6366f1, #8b5cf6)";
  } else if (tier === "GOLD") {
    tierBadgeBg = "linear-gradient(135deg, #f59e0b, #d97706)";
  } else if (tier === "SILVER") {
    tierBadgeBg = "linear-gradient(135deg, #94a3b8, #64748b)";
  } else {
    tierBadgeBg = "linear-gradient(135deg, #b45309, #78350f)";
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nexus Loyalty Points Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
              <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9; margin-bottom: 6px;">
                🛒 NEXUS SUPERMARKET
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                Loyalty Rewards Update
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95;">
                Thank you for shopping at ${store}!
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 28px;">
              <!-- Greeting & Customer Info -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 4px 0; font-size: 18px; color: #0f172a;">
                      Hello, ${customerName} 👋
                    </h2>
                    <p style="margin: 0; font-size: 13.5px; color: #64748b;">
                      Here is the summary of loyalty points earned and redeemed for your recent purchase.
                    </p>
                  </td>
                  ${params.cardNumber ? `
                  <td align="right" style="vertical-align: top;">
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; color: #475569; font-family: monospace;">
                      ${params.cardNumber}
                    </div>
                  </td>
                  ` : ""}
                </tr>
              </table>

              <!-- Bill Details Box -->
              ${(params.receiptNumber || totalStr) ? `
              <div style="background: #f8fafc; border-left: 4px solid #10b981; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px;">
                <table width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
                  <tr>
                    ${params.receiptNumber ? `<td><strong>Receipt:</strong> ${params.receiptNumber}</td>` : ""}
                    ${totalStr ? `<td align="right"><strong>Bill Total:</strong> <span style="font-weight: 700; color: #0f172a;">${totalStr}</span></td>` : ""}
                  </tr>
                </table>
              </div>
              ` : ""}

              <!-- Points Activity Card -->
              <div style="background: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 14px;">
                  TRANSACTION POINTS BREAKDOWN
                </div>

                <table width="100%" cellspacing="0" cellpadding="0">
                  ${redeemed > 0 ? `
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #475569;">
                      🔴 Points Redeemed (Discount)
                    </td>
                    <td align="right" style="padding: 8px 0; font-size: 15px; font-weight: 700; color: #dc2626;">
                      -${redeemed} pts <span style="font-size: 12px; font-weight: 500; color: #64748b;">(Saved Rs. ${redeemed.toFixed(2)})</span>
                    </td>
                  </tr>
                  ` : ""}

                  ${earned > 0 ? `
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #475569;">
                      🟢 Points Earned this Visit
                    </td>
                    <td align="right" style="padding: 8px 0; font-size: 16px; font-weight: 800; color: #059669;">
                      +${earned} pts
                    </td>
                  </tr>
                  ` : ""}

                  ${earned === 0 && redeemed === 0 ? `
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Points Activity</td>
                    <td align="right" style="padding: 8px 0; font-size: 14px; color: #64748b;">0 pts</td>
                  </tr>
                  ` : ""}

                  <tr>
                    <td colspan="2" style="padding-top: 14px; border-top: 1px dashed #cbd5e1;"></td>
                  </tr>

                  <!-- Current Balance Highlight -->
                  <tr>
                    <td style="vertical-align: middle;">
                      <div style="font-size: 14px; font-weight: 700; color: #0f172a;">New Points Balance</div>
                      <div style="font-size: 12px; color: #64748b;">Cash value for next shopping</div>
                    </td>
                    <td align="right" style="vertical-align: middle;">
                      <div style="font-size: 22px; font-weight: 900; color: #059669;">
                        ${params.newPointsBalance} <span style="font-size: 14px; font-weight: 600;">pts</span>
                      </div>
                      <div style="font-size: 12px; font-weight: 700; color: #047857;">
                        Value: ${balanceValue}
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Membership Tier Banner -->
              <div style="background: ${tierBadgeBg}; border-radius: 10px; padding: 14px 18px; color: ${tierBadgeColor}; display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="color: #ffffff;">
                      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">Membership Level</div>
                      <div style="font-size: 16px; font-weight: 800; letter-spacing: 0.5px;">${tier} MEMBER</div>
                    </td>
                    <td align="right" style="color: #ffffff; font-size: 12px; opacity: 0.95;">
                      ✨ Enjoy Exclusive Rewards & Multipliers
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Call to Action Note -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px; text-align: center; color: #166534; font-size: 13px; line-height: 1.5;">
                🎁 <strong>Tip:</strong> You can redeem your loyalty points directly at the checkout counter on your next purchase to save instantly on your bill!
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #64748b;">
                Nexus Supermarket Retail Network
              </p>
              <p style="margin: 0;">
                This is an automated notification for your loyalty account. If you did not make this transaction, please contact store support immediately.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Build plain text version for email clients that do not support HTML
 */
export function buildLoyaltyPlainText(params: LoyaltyEmailParams): string {
  const customerName = params.customerName?.trim() || "Valued Customer";
  const store = params.branchName || "Nexus Supermarket";
  const totalStr = params.totalAmount ? `Rs. ${Number(params.totalAmount).toFixed(2)}` : null;

  const lines: string[] = [];
  lines.push(`NEXUS SUPERMARKET - LOYALTY REWARDS UPDATE`);
  lines.push(`==========================================`);
  lines.push(`Dear ${customerName}, thank you for shopping at ${store}!`);
  lines.push("");

  if (params.receiptNumber || totalStr) {
    const parts: string[] = [];
    if (params.receiptNumber) parts.push(`Receipt: ${params.receiptNumber}`);
    if (totalStr) parts.push(`Total: ${totalStr}`);
    lines.push(parts.join(" | "));
    lines.push("");
  }

  lines.push(`POINTS BREAKDOWN:`);
  if (params.pointsRedeemed > 0) {
    lines.push(`- Points Redeemed: ${params.pointsRedeemed} pts (Saved Rs. ${Number(params.pointsRedeemed).toFixed(2)})`);
  }
  if (params.pointsEarned > 0) {
    lines.push(`- Points Earned: +${params.pointsEarned} pts`);
  }
  if (params.pointsEarned === 0 && params.pointsRedeemed === 0) {
    lines.push(`- Points Activity: 0 pts`);
  }

  lines.push("");
  lines.push(`NEW BALANCE: ${params.newPointsBalance} pts (Value: Rs. ${Number(params.newPointsBalance).toFixed(2)})`);
  if (params.customerTier) {
    lines.push(`Tier: ${params.customerTier} Member`);
  }

  lines.push("");
  lines.push(`Redeem points on your next purchase at Nexus Supermarket!`);

  return lines.join("\n");
}

/**
 * Send loyalty points email via Gmail SMTP (or configured SMTP)
 */
export async function sendLoyaltyEmail(params: LoyaltyEmailParams): Promise<EmailSendResult> {
  const recipientEmail = params.email?.trim();

  if (!recipientEmail || !recipientEmail.includes("@")) {
    console.warn(`[Email] Invalid or missing customer email: "${params.email}"`);
    return {
      success: false,
      error: `Invalid or missing recipient email: "${params.email}"`,
    };
  }

  const fromAddress = process.env.SMTP_FROM || `"Nexus Supermarket" <${process.env.SMTP_USER || "baddeal200@gmail.com"}>`;
  const subject = params.pointsRedeemed > 0 && params.pointsEarned > 0
    ? `Nexus Rewards: You saved with loyalty points & earned +${params.pointsEarned} pts!`
    : params.pointsRedeemed > 0
    ? `Nexus Rewards: You redeemed ${params.pointsRedeemed} loyalty points!`
    : params.pointsEarned > 0
    ? `Nexus Rewards: You earned +${params.pointsEarned} loyalty points!`
    : `Nexus Rewards: Loyalty Points Summary`;

  const htmlContent = buildLoyaltyHtml(params);
  const textContent = buildLoyaltyPlainText(params);

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[Email] Successfully sent loyalty email to ${recipientEmail} (ID: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
      recipient: recipientEmail,
    };
  } catch (err: any) {
    console.error("[Email] Error sending loyalty email via SMTP:", err);
    return {
      success: false,
      recipient: recipientEmail,
      error: err.message || "Failed to send email",
    };
  }
}
