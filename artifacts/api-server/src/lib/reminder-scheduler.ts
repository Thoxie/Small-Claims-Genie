import { eq, and, isNotNull, not } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable } from "@workspace/db";
import { getUncachableResendClient } from "./resend";
import { build14DayEmail, build3DayEmail, type HearingEmailData } from "./email-templates";
import { logger } from "./logger";

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const hearing = new Date(dateStr + "T00:00:00");
  hearing.setHours(0, 0, 0, 0);
  return Math.round((hearing.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

async function sendReminders() {
  try {
    const cases = await db
      .select()
      .from(casesTable)
      .where(
        and(
          isNotNull(casesTable.hearingDate),
          isNotNull(casesTable.plaintiffEmail)
        )
      );

    for (const c of cases) {
      if (!c.hearingDate || !c.plaintiffEmail) continue;
      const days = daysUntil(c.hearingDate);

      const emailData: HearingEmailData = {
        plaintiffName: c.plaintiffName || "",
        caseTitle: c.title,
        caseNumber: c.caseNumber,
        hearingDate: c.hearingDate,
        hearingTime: c.hearingTime,
        hearingJudge: c.hearingJudge,
        hearingCourtroom: c.hearingCourtroom,
        courthouseName: c.courthouseName,
        courthouseAddress: c.courthouseAddress,
        courthouseCity: c.courthouseCity,
        courthouseZip: c.courthouseZip,
        courthouseWebsite: c.courthouseWebsite,
        daysUntil: days,
        caseId: c.id,
      };

      // 14-day reminder (send when 13–15 days out to handle timing gaps)
      if (days >= 13 && days <= 15 && !c.reminder14DaySent) {
        try {
          const { client, fromEmail } = await getUncachableResendClient();
          const { subject, html } = build14DayEmail(emailData);
          await client.emails.send({
            from: `Small Claims Genie <${fromEmail}>`,
            to: c.plaintiffEmail,
            subject,
            html,
          });
          await db.update(casesTable).set({ reminder14DaySent: true }).where(eq(casesTable.id, c.id));
          logger.info({ caseId: c.id, email: c.plaintiffEmail }, "14-day reminder sent");
        } catch (err) {
          logger.error({ caseId: c.id, err }, "Failed to send 14-day reminder");
        }
      }

      // 3-day reminder (send when 2–4 days out)
      if (days >= 2 && days <= 4 && !c.reminder3DaySent) {
        try {
          const { client, fromEmail } = await getUncachableResendClient();
          const { subject, html } = build3DayEmail(emailData);
          await client.emails.send({
            from: `Small Claims Genie <${fromEmail}>`,
            to: c.plaintiffEmail,
            subject,
            html,
          });
          await db.update(casesTable).set({ reminder3DaySent: true }).where(eq(casesTable.id, c.id));
          logger.info({ caseId: c.id, email: c.plaintiffEmail }, "3-day reminder sent");
        } catch (err) {
          logger.error({ caseId: c.id, err }, "Failed to send 3-day reminder");
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Reminder scheduler error");
  }
}

export function startReminderScheduler() {
  // Run immediately on startup, then every hour
  sendReminders();
  setInterval(sendReminders, 60 * 60 * 1000);
  logger.info("Hearing reminder scheduler started (runs every hour)");
}
