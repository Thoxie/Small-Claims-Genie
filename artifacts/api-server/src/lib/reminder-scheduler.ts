import { eq, and, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { casesTable } from "@workspace/db";
import { getUncachableResendClient } from "./resend";
import {
  build30DayEmail,
  build14DayEmail,
  build7DayEmail,
  build3DayEmail,
  build1DayEmail,
  buildNoHearingDateEmail,
  buildCaseConfirmationEmail,
  buildWeeklyCheckInEmail,
  type HearingEmailData,
  type NoHearingDateEmailData,
  type CaseConfirmationEmailData,
  type WeeklyCheckInEmailData,
} from "./email-templates";
import { logger } from "./logger";

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const hearing = new Date(dateStr + "T00:00:00");
  hearing.setHours(0, 0, 0, 0);
  return Math.round((hearing.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function daysSince(date: Date): number {
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Confirmation Email (sent once when intake is complete and email exists) ──
async function sendConfirmationEmails() {
  const cases = await db
    .select()
    .from(casesTable)
    .where(
      and(
        eq(casesTable.intakeComplete, true),
        isNotNull(casesTable.plaintiffEmail),
        eq(casesTable.confirmationEmailSent, false)
      )
    );

  for (const c of cases) {
    if (!c.plaintiffEmail) continue;

    const emailData: CaseConfirmationEmailData = {
      plaintiffName: c.plaintiffName || "",
      caseTitle: c.title,
      claimAmount: c.claimAmount,
      defendantName: c.defendantName,
      countyId: c.countyId,
      courthouseName: c.courthouseName,
      courthouseAddress: c.courthouseAddress,
      courthouseCity: c.courthouseCity,
      courthouseZip: c.courthouseZip,
      courthousePhone: c.courthousePhone,
      courthouseWebsite: c.courthouseWebsite,
      courthouseClerkEmail: c.courthouseClerkEmail,
      caseId: c.id,
    };

    try {
      const { client, fromEmail } = await getUncachableResendClient();
      const { subject, html } = buildCaseConfirmationEmail(emailData);
      await client.emails.send({
        from: `Small Claims Genie <${fromEmail}>`,
        to: c.plaintiffEmail,
        subject,
        html,
      });
      await db.update(casesTable).set({ confirmationEmailSent: true }).where(eq(casesTable.id, c.id));
      logger.info({ caseId: c.id, email: c.plaintiffEmail }, "Case confirmation email sent");
    } catch (err) {
      logger.error({ caseId: c.id, err }, "Failed to send confirmation email");
    }
  }
}

// ─── Weekly check-in (every 7 days while no hearing date is entered) ──────────
async function sendWeeklyCheckIns() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Cases where: email exists, no hearing date, AND
  // (weekly reminder was never sent OR last sent 7+ days ago)
  const cases = await db
    .select()
    .from(casesTable)
    .where(
      and(
        isNotNull(casesTable.plaintiffEmail),
        isNull(casesTable.hearingDate),
        eq(casesTable.intakeComplete, true),
        or(
          isNull(casesTable.weeklyReminderLastSent),
          lte(casesTable.weeklyReminderLastSent, sevenDaysAgo)
        )
      )
    );

  for (const c of cases) {
    if (!c.plaintiffEmail) continue;

    // Calculate which week number this is (weeks since case was created)
    const weeksSinceCreated = Math.floor(daysSince(c.createdAt) / 7) + 1;

    const emailData: WeeklyCheckInEmailData = {
      plaintiffName: c.plaintiffName || "",
      caseTitle: c.title,
      weekNumber: weeksSinceCreated,
      countyId: c.countyId,
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
      const { subject, html } = buildWeeklyCheckInEmail(emailData);
      await client.emails.send({
        from: `Small Claims Genie <${fromEmail}>`,
        to: c.plaintiffEmail,
        subject,
        html,
      });
      await db
        .update(casesTable)
        .set({ weeklyReminderLastSent: new Date() })
        .where(eq(casesTable.id, c.id));
      logger.info({ caseId: c.id, email: c.plaintiffEmail, week: weeksSinceCreated }, "Weekly check-in sent");
    } catch (err) {
      logger.error({ caseId: c.id, err }, "Failed to send weekly check-in");
    }
  }
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

    // 30-day reminder (send when 29–31 days out)
    if (days >= 29 && days <= 31 && !c.reminder30DaySent) {
      try {
        const { client, fromEmail } = await getUncachableResendClient();
        const { subject, html } = build30DayEmail(emailData);
        await client.emails.send({ from: `Small Claims Genie <${fromEmail}>`, to: c.plaintiffEmail, subject, html });
        await db.update(casesTable).set({ reminder30DaySent: true }).where(eq(casesTable.id, c.id));
        logger.info({ caseId: c.id, email: c.plaintiffEmail }, "30-day reminder sent");
      } catch (err) {
        logger.error({ caseId: c.id, err }, "Failed to send 30-day reminder");
      }
    }

    // 14-day reminder (send when 13–15 days out to handle timing gaps)
    if (days >= 13 && days <= 15 && !c.reminder14DaySent) {
      try {
        const { client, fromEmail } = await getUncachableResendClient();
        const { subject, html } = build14DayEmail(emailData);
        await client.emails.send({ from: `Small Claims Genie <${fromEmail}>`, to: c.plaintiffEmail, subject, html });
        await db.update(casesTable).set({ reminder14DaySent: true }).where(eq(casesTable.id, c.id));
        logger.info({ caseId: c.id, email: c.plaintiffEmail }, "14-day reminder sent");
      } catch (err) {
        logger.error({ caseId: c.id, err }, "Failed to send 14-day reminder");
      }
    }

    // 7-day reminder (send when 6–8 days out)
    if (days >= 6 && days <= 8 && !c.reminder7DaySent) {
      try {
        const { client, fromEmail } = await getUncachableResendClient();
        const { subject, html } = build7DayEmail(emailData);
        await client.emails.send({ from: `Small Claims Genie <${fromEmail}>`, to: c.plaintiffEmail, subject, html });
        await db.update(casesTable).set({ reminder7DaySent: true }).where(eq(casesTable.id, c.id));
        logger.info({ caseId: c.id, email: c.plaintiffEmail }, "7-day reminder sent");
      } catch (err) {
        logger.error({ caseId: c.id, err }, "Failed to send 7-day reminder");
      }
    }

    // 3-day reminder (send when 2–4 days out)
    if (days >= 2 && days <= 4 && !c.reminder3DaySent) {
      try {
        const { client, fromEmail } = await getUncachableResendClient();
        const { subject, html } = build3DayEmail(emailData);
        await client.emails.send({ from: `Small Claims Genie <${fromEmail}>`, to: c.plaintiffEmail, subject, html });
        await db.update(casesTable).set({ reminder3DaySent: true }).where(eq(casesTable.id, c.id));
        logger.info({ caseId: c.id, email: c.plaintiffEmail }, "3-day reminder sent");
      } catch (err) {
        logger.error({ caseId: c.id, err }, "Failed to send 3-day reminder");
      }
    }

    // 1-day reminder (send when 0–1 days out)
    if (days >= 0 && days <= 1 && !c.reminder1DaySent) {
      try {
        const { client, fromEmail } = await getUncachableResendClient();
        const { subject, html } = build1DayEmail(emailData);
        await client.emails.send({ from: `Small Claims Genie <${fromEmail}>`, to: c.plaintiffEmail, subject, html });
        await db.update(casesTable).set({ reminder1DaySent: true }).where(eq(casesTable.id, c.id));
        logger.info({ caseId: c.id, email: c.plaintiffEmail }, "1-day reminder sent");
      } catch (err) {
        logger.error({ caseId: c.id, err }, "Failed to send 1-day reminder");
      }
    }
  }
}

// ─── Legacy one-time no-hearing-date follow-up (kept for older cases) ─────────
async function sendNoHearingDateReminders() {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

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
    await sendConfirmationEmails();
    await sendWeeklyCheckIns();
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
