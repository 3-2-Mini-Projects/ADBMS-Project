const nodemailer = require("nodemailer");

async function main() {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "baddeal200@gmail.com",
      pass: "nggjmccjcnaqnskw",
    },
  });

  const info = await transporter.sendMail({
    from: '"Nexus Supermarket" <baddeal200@gmail.com>',
    to: "baddeal200@gmail.com",
    subject: "Nexus Rewards: Test Loyalty Points Notification",
    html: `
      <div style="font-family: sans-serif; padding: 20px; background: #f8fafc; border-radius: 12px; max-width: 500px;">
        <h2 style="color: #059669; margin-top: 0;">🛒 Nexus Supermarket Loyalty Rewards</h2>
        <p>Dear Valued Customer,</p>
        <p>Your loyalty notification service is successfully connected!</p>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 15px 0;">
          <p style="margin: 4px 0;"><strong>Points Earned:</strong> +100 pts</p>
          <p style="margin: 4px 0;"><strong>Points Redeemed:</strong> 0 pts</p>
          <p style="margin: 4px 0;"><strong>New Points Balance:</strong> 250 pts (Value: Rs. 250.00)</p>
          <p style="margin: 4px 0;"><strong>Membership Tier:</strong> GOLD Member</p>
        </div>
        <p style="font-size: 12px; color: #64748b;">Automated message from Nexus Supermarket System</p>
      </div>
    `,
  });

  console.log("SUCCESS! Test email sent to baddeal200@gmail.com. Message ID:", info.messageId);
}

main().catch(console.error);
