import { eq, and, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable } from "@workspace/db";
import { getUncachableResendClient } from "./resend";
import {
  build14DayEmail,
  build3DayEmail,
  buildNoHearingDateEmail,
  type HearingEmailData,
  type NoHearingDateEmailData,
} from "./email-templates";
import { logger } from "./logger";

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const hearing = new Date(dateStr + "T00:00:00");
  hearing.setHours(0, 0, 0, 0);
  return Math.round((hearing.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Hearing date reminders (14-day and 3-day) ────────────────────────────────
async function sendHearingReminders() {
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
}

// ─── No-hearing-date follow-up (14 days after intake complete, still no date) ─
async function sendNoHearingDateReminders() {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // Cases where: intake is complete, no hearing date, email exists,
  // reminder not yet sent, and case was created 14+ days ago
  const cases = await db
    .select()
    .from(casesTable)
    .where(
      and(
        eq(casesTable.intakeComplete, true),
        isNull(casesTable.hearingDate),
        isNotNull(casesTable.plaintiffEmail),
        eq(casesTable.reminderNoHearingDateSent, false),
        lte(casesTable.createdAt, fourteenDaysAgo)
      )
    );

  for (const c of cases) {
    if (!c.plaintiffEmail) continue;

    const emailData: NoHearingDateEmailData = {
      plaintiffName: c.plaintiffName || "",
      caseTitle: c.title,
      courthouseName: c.courthouseName,
      courthousePhone: c.courthousePhone,
      courthouseWebsite: c.courthouseWebsite,
      courthouseClerkEmail: c.courthouseClerkEmail,
      courthouseAddress: c.courthouseAddress,
      courthouseCity: c.courthouseCity,
      courthouseZip: c.courthouseZip,
      caseId: c.id,
    };

    try {
      const { client, fromEmail } = await getUncachableResendClient();
      const { subject, html } = buildNoHearingDateEmail(emailData);
      await client.emails.send({
        from: `Small Claims Genie <${fromEmail}>`,
        to: c.plaintiffEmail,
        subject,
        html,
      });
      await db
        .update(casesTable)
        .set({ reminderNoHearingDateSent: true })
        .where(eq(casesTable.id, c.id));
      logger.info({ caseId: c.id, email: c.plaintiffEmail }, "No-hearing-date follow-up sent");
    } catch (err) {
      logger.error({ caseId: c.id, err }, "Failed to send no-hearing-date follow-up");
    }
  }
}

// ─── Main scheduler tick ───────────────────────────────────────────────────────
async function runAllReminders() {
  try {
    await sendHearingReminders();
    await sendNoHearingDateReminders();
  } catch (err) {
    logger.error({ err }, "Reminder scheduler error");
  }
}

export function startReminderScheduler() {
  // Run immediately on startup, then every hour
  runAllReminders();
  setInterval(runAllReminders, 60 * 60 * 1000);
  logger.info("Hearing reminder scheduler started (runs every hour)");
}
