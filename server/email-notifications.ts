import { createClient } from "@supabase/supabase-js";

interface EmailNotification {
  to: string;
  subject: string;
  type: "program_assigned" | "deliverable_added" | "engagement_invitation";
  data: Record<string, any>;
}

export async function sendEmailNotification(
  notification: EmailNotification,
): Promise<void> {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn(
        "Email notification: Supabase configuration missing, logging instead",
      );
      logEmailNotification(notification);
      return;
    }

    // For now, log the notification
    // In production, this would integrate with a real email service like Sendgrid, Mailgun, or Klaviyo
    logEmailNotification(notification);

    // TODO: Integrate with email service (Sendgrid, Mailgun, Klaviyo transactional, etc.)
    // Example implementation:
    // const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    //   method: "POST",
    //   headers: {
    //     Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     personalizations: [{ to: [{ email: notification.to }] }],
    //     from: { email: "notifications@purplepine.digital" },
    //     subject: notification.subject,
    //     content: [{ type: "text/html", value: generateEmailContent(notification) }],
    //   }),
    // });

    console.log(
      `Email notification queued for ${notification.to}: ${notification.subject}`,
    );
  } catch (error: any) {
    console.error("Error sending email notification:", error?.message || error);
    // Don't throw - email failures shouldn't break the main flow
  }
}

export function generateProgramAssignedEmail(
  clientName: string,
  projectName: string,
  program: string,
): string {
  const programDisplay =
    program.charAt(0).toUpperCase() + program.slice(1).toLowerCase();

  return `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h2>Your Program Has Been Assigned</h2>
        <p>Hi ${clientName},</p>
        <p>
          We're excited to inform you that your project "<strong>${projectName}</strong>" 
          has been assigned to the <strong>${programDisplay}</strong> program.
        </p>
        <p>
          <a href="https://purplepine.digital/project/journey" style="
            background-color: #37306B;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            display: inline-block;
          ">View Your Project Roadmap</a>
        </p>
        <p>If you have any questions, feel free to reach out!</p>
        <p>Best regards,<br/>Purple Pine Digital Team</p>
      </body>
    </html>
  `;
}

export function generateDeliverableAddedEmail(
  clientName: string,
  projectName: string,
  stageName: string,
  deliverableTitle: string,
): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h2>New Deliverable Available</h2>
        <p>Hi ${clientName},</p>
        <p>
          Great news! A new deliverable "<strong>${deliverableTitle}</strong>" 
          has been added to <strong>${stageName}</strong> of your project 
          "<strong>${projectName}</strong>".
        </p>
        <p>
          <a href="https://purplepine.digital/project/journey" style="
            background-color: #37306B;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            display: inline-block;
          ">View Your Deliverables</a>
        </p>
        <p>We look forward to sharing this with you!</p>
        <p>Best regards,<br/>Purple Pine Digital Team</p>
      </body>
    </html>
  `;
}

export function generateInvitationEmail(
  clientName: string,
  projectName: string,
  inviteLink: string,
): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h2>You've Been Invited to Your Project</h2>
        <p>Hi ${clientName},</p>
        <p>
          We're excited to have you join us! You've been invited to access and contribute to your project
          "<strong>${projectName}</strong>".
        </p>
        <p>
          Please click the button below to accept your invitation and get started:
        </p>
        <p>
          <a href="${inviteLink}" style="
            background-color: #37306B;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            display: inline-block;
          ">Accept Invitation</a>
        </p>
        <p>
          Once you accept, you'll be able to fill out your Tier 1 and Tier 2 assessment forms
          and track the progress of your project.
        </p>
        <p>
          If you did not expect this invitation or have any questions, please feel free to reach out!
        </p>
        <p>Best regards,<br/>Purple Pine Digital Team</p>
      </body>
    </html>
  `;
}

export async function sendInvitationEmail(
  to: string,
  clientName: string,
  projectName: string,
  inviteLink: string,
): Promise<void> {
  const notification: EmailNotification = {
    to,
    subject: `You're Invited to ${projectName}`,
    type: "engagement_invitation",
    data: {
      clientName,
      projectName,
      inviteLink,
    },
  };

  await sendEmailNotification(notification);
}

function logEmailNotification(notification: EmailNotification): void {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] EMAIL NOTIFICATION
    To: ${notification.to}
    Subject: ${notification.subject}
    Type: ${notification.type}
    Data: ${JSON.stringify(notification.data, null, 2)}
  `);
}
