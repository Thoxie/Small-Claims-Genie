export type NoHearingDateEmailData = {
  plaintiffName: string;
  caseTitle: string;
  courthouseName: string | null;
  courthousePhone: string | null;
  courthouseWebsite: string | null;
  courthouseClerkEmail: string | null;
  courthouseAddress: string | null;
  courthouseCity: string | null;
  courthouseZip: string | null;
  caseId: number;
};

export function buildNoHearingDateEmail(d: NoHearingDateEmailData): { subject: string; html: string } {
  const subject = `📋 Have You Received Your Hearing Notice Yet?`;

  const contactFormNote = d.courthouseWebsite
    ? `<p style="margin:6px 0 0;font-size:13px;color:#374151;">💬 No direct email? Use the <a href="${d.courthouseWebsite}" style="color:#0d6b5e;font-weight:bold;">court's online contact form →</a></p>`
    : "";

  const courtContactBlock = `
    <div style="background:#f0faf8;border-left:4px solid #14b8a6;padding:16px;border-radius:8px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#0d6b5e;text-transform:uppercase;letter-spacing:0.05em;">Your Court's Contact Information</p>
      ${d.courthouseName ? `<p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#111827;">${d.courthouseName}</p>` : ""}
      ${d.courthouseAddress ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">📍 ${d.courthouseAddress}, ${d.courthouseCity || ""} ${d.courthouseZip || ""}</p>` : ""}
      ${d.courthousePhone ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">📞 <a href="tel:${d.courthousePhone}" style="color:#0d6b5e;font-weight:bold;">${d.courthousePhone}</a> — Call the clerk's office directly</p>` : ""}
      ${d.courthouseClerkEmail ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">✉️ <a href="mailto:${d.courthouseClerkEmail}" style="color:#0d6b5e;font-weight:bold;">${d.courthouseClerkEmail}</a> — Email the clerk's office</p>` : ""}
      ${d.courthouseWebsite ? `<p style="margin:0 0 4px;font-size:14px;"><a href="${d.courthouseWebsite}" style="color:#0d6b5e;font-weight:bold;">🌐 Visit Court Website →</a></p>` : ""}
      ${contactFormNote}
    </div>`;

  const html = baseLayout(subject, `
    <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${d.plaintiffName || "there"},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">It's been about two weeks since you filed your small claims case — <strong>${d.caseTitle}</strong>.</p>

    <div style="background:#fef9c3;border:1px solid #fbbf24;border-radius:8px;padding:14px;margin:0 0 20px;">
      <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#92400e;">📬 First — check your mail and email</p>
      <p style="margin:0;font-size:14px;color:#78350f;">California courts mail the <strong>Notice of Small Claims Hearing</strong> to the address you listed on your filing. Check your mailbox and any email account you provided — it may already be on its way or waiting in your inbox.</p>
    </div>

    <p style="margin:0 0 20px;font-size:15px;color:#374151;">If nothing has arrived yet, it's time to follow up with the court clerk directly. Use any of the contact methods below:</p>

    ${courtContactBlock}

    <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#111827;">When you reach the clerk, ask:</p>
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">• &nbsp;Was my small claims filing received and processed?</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">• &nbsp;Has a hearing date been assigned to my case?</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">• &nbsp;What is my case/claim number?</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">• &nbsp;Was the notice mailed to the correct address?</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">• &nbsp;What courtroom or department will my hearing be in?</td></tr>
    </table>

    <p style="margin:20px 0 16px;font-size:15px;color:#374151;">Once you have your hearing date, case number, and courtroom — enter them in Small Claims Genie so we can send you preparation reminders automatically.</p>

    <div style="text-align:center;margin:28px 0;">
      <a href="https://smallclaimsgenie.com/cases/${d.caseId}" style="background:#0d6b5e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;display:inline-block;">
        Enter My Hearing Date →
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:#6b7280;">Small Claims Genie is not a law firm and this is not legal advice.</p>
  `);

  return { subject, html };
}

export type HearingEmailData = {
  plaintiffName: string;
  caseTitle: string;
  caseNumber: string | null;
  hearingDate: string;
  hearingTime: string | null;
  hearingJudge: string | null;
  hearingCourtroom: string | null;
  courthouseName: string | null;
  courthouseAddress: string | null;
  courthouseCity: string | null;
  courthouseZip: string | null;
  courthouseWebsite: string | null;
  daysUntil: number;
  caseId: number;
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f0faf8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0faf8;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="background:#0d6b5e;padding:28px 32px;">
          <p style="margin:0;font-size:22px;font-weight:bold;color:#ffffff;">⚖️ Small Claims Genie</p>
          <p style="margin:6px 0 0;font-size:14px;color:#a7f3e4;">${title}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">${body}</td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fffe;padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            Small Claims Genie · Not a law firm · For informational purposes only<br/>
            <a href="https://smallclaimsgenie.com" style="color:#0d6b5e;">smallclaimsgenie.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function build14DayEmail(d: HearingEmailData): { subject: string; html: string } {
  const subject = `⏰ 2 Weeks to Your Hearing — Time to Prepare`;
  const courtBlock = d.courthouseName
    ? `<div style="background:#f0faf8;border-left:4px solid #14b8a6;padding:16px;border-radius:8px;margin:20px 0;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#0d6b5e;text-transform:uppercase;letter-spacing:0.05em;">Court Details</p>
        ${d.courthouseName ? `<p style="margin:0 0 4px;font-size:14px;color:#111827;font-weight:600;">${d.courthouseName}</p>` : ""}
        ${d.courthouseAddress ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">${d.courthouseAddress}, ${d.courthouseCity || ""} ${d.courthouseZip || ""}</p>` : ""}
        ${d.hearingCourtroom ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">Courtroom: <strong>${d.hearingCourtroom}</strong></p>` : ""}
        ${d.hearingJudge ? `<p style="margin:0;font-size:14px;color:#374151;">Judge: <strong>${d.hearingJudge}</strong></p>` : ""}
       </div>` : "";

  const html = baseLayout(subject, `
    <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${d.plaintiffName || "there"},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Your small claims hearing is <strong>2 weeks away</strong>. Now is the time to prepare so you walk in confident.</p>

    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:bold;color:#92400e;text-transform:uppercase;">Hearing Date &amp; Time</p>
      <p style="margin:0;font-size:18px;font-weight:bold;color:#111827;">${formatDate(d.hearingDate)}${d.hearingTime ? ` at ${d.hearingTime}` : ""}</p>
      ${d.caseNumber ? `<p style="margin:4px 0 0;font-size:13px;color:#374151;">Case No. <strong>${d.caseNumber}</strong></p>` : ""}
    </div>

    ${courtBlock}

    <p style="margin:20px 0 12px;font-size:15px;font-weight:bold;color:#111827;">✅ Your 2-week prep checklist:</p>
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">📁 &nbsp;Gather all your evidence — contracts, receipts, texts, photos</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">📄 &nbsp;Make 3 copies of every document (one for you, one for defendant, one for judge)</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">🤖 &nbsp;Use the AI Chat to build your oral statement — something you can print and bring</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">📬 &nbsp;Confirm the defendant was served (you'll need proof of service)</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">💵 &nbsp;Know your exact dollar amount and how you calculated it</td></tr>
    </table>

    <div style="text-align:center;margin:28px 0;">
      <a href="https://smallclaimsgenie.com/cases/${d.caseId}" style="background:#0d6b5e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;display:inline-block;">
        Open My Case &amp; Prepare →
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:#6b7280;">You're receiving this because you entered a hearing date in Small Claims Genie. Questions? Open your case and chat with the AI — it knows your full case.</p>
  `);

  return { subject, html };
}

export function build3DayEmail(d: HearingEmailData): { subject: string; html: string } {
  const subject = `🚨 Your Hearing is in 3 Days — Final Checklist + Parking Info`;

  const parkingBlock = d.courthouseWebsite
    ? `<div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#1e40af;text-transform:uppercase;">🅿️ Parking &amp; Directions</p>
        <p style="margin:0 0 8px;font-size:14px;color:#374151;">Check the courthouse website for current parking information, hours, and any security procedures.</p>
        <a href="${d.courthouseWebsite}" style="color:#1d4ed8;font-size:14px;font-weight:bold;">Visit Courthouse Website →</a>
       </div>`
    : d.courthouseAddress
    ? `<div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#1e40af;text-transform:uppercase;">📍 Courthouse Address</p>
        <p style="margin:0 0 8px;font-size:14px;color:#374151;">${d.courthouseAddress}, ${d.courthouseCity || ""} ${d.courthouseZip || ""}</p>
        <a href="https://www.google.com/maps/search/${encodeURIComponent((d.courthouseAddress || "") + " " + (d.courthouseCity || "") + " CA")}" style="color:#1d4ed8;font-size:14px;font-weight:bold;">Get Directions on Google Maps →</a>
       </div>` : "";

  const html = baseLayout(subject, `
    <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${d.plaintiffName || "there"},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Your hearing is <strong>3 days away</strong>. Here's everything you need to walk in ready.</p>

    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:bold;color:#92400e;text-transform:uppercase;">Your Hearing</p>
      <p style="margin:0;font-size:18px;font-weight:bold;color:#111827;">${formatDate(d.hearingDate)}${d.hearingTime ? ` at ${d.hearingTime}` : ""}</p>
      ${d.courthouseName ? `<p style="margin:4px 0 0;font-size:14px;color:#374151;">${d.courthouseName}${d.hearingCourtroom ? ` · Courtroom ${d.hearingCourtroom}` : ""}</p>` : ""}
      ${d.caseNumber ? `<p style="margin:4px 0 0;font-size:13px;color:#374151;">Case No. <strong>${d.caseNumber}</strong></p>` : ""}
    </div>

    ${parkingBlock}

    <p style="margin:20px 0 12px;font-size:15px;font-weight:bold;color:#111827;">📦 Bring to Court:</p>
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">✅ &nbsp;3 copies of all documents &amp; evidence (judge, defendant, yourself)</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">✅ &nbsp;Your printed case statement / talking points</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">✅ &nbsp;SC-100 form and any attachments</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">✅ &nbsp;Photo ID</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">✅ &nbsp;Proof of service (SC-104 or mailing proof)</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">✅ &nbsp;Any witnesses (they must appear in person)</td></tr>
    </table>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#166534;"><strong>💡 Tip:</strong> Arrive 30 minutes early — courthouse security lines can be long. Turn off your phone before entering the courtroom. When the judge speaks, address them as "Your Honor." Be brief, factual, and polite.</p>
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="https://smallclaimsgenie.com/cases/${d.caseId}" style="background:#0d6b5e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;display:inline-block;">
        Review My Case One More Time →
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:#6b7280;">Good luck — you've prepared well. Small Claims Genie is not a law firm and this is not legal advice.</p>
  `);

  return { subject, html };
}

// ─── Case Confirmation Email ───────────────────────────────────────────────────
export type CaseConfirmationEmailData = {
  plaintiffName: string;
  caseTitle: string;
  claimAmount: number | null;
  defendantName: string | null;
  countyId: string | null;
  courthouseName: string | null;
  courthouseAddress: string | null;
  courthouseCity: string | null;
  courthouseZip: string | null;
  courthousePhone: string | null;
  courthouseWebsite: string | null;
  courthouseClerkEmail: string | null;
  caseId: number;
};

export function buildCaseConfirmationEmail(d: CaseConfirmationEmailData): { subject: string; html: string } {
  const subject = `✅ Your Case Has Been Saved — Small Claims Genie`;

  const courtBlock = d.courthouseName ? `
    <div style="background:#f0faf8;border-left:4px solid #14b8a6;padding:16px;border-radius:8px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#0d6b5e;text-transform:uppercase;letter-spacing:0.05em;">Your Court</p>
      <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#111827;">${d.courthouseName}</p>
      ${d.courthouseAddress ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">📍 ${d.courthouseAddress}, ${d.courthouseCity || ""} ${d.courthouseZip || ""}</p>` : ""}
      ${d.courthousePhone ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">📞 <a href="tel:${d.courthousePhone}" style="color:#0d6b5e;font-weight:bold;">${d.courthousePhone}</a></p>` : ""}
      ${d.courthouseClerkEmail ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">✉️ <a href="mailto:${d.courthouseClerkEmail}" style="color:#0d6b5e;font-weight:bold;">${d.courthouseClerkEmail}</a></p>` : ""}
      ${d.courthouseWebsite ? `<p style="margin:0;font-size:14px;"><a href="${d.courthouseWebsite}" style="color:#0d6b5e;font-weight:bold;">🌐 Visit Court Website →</a></p>` : ""}
    </div>` : "";

  const html = baseLayout(subject, `
    <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${d.plaintiffName || "there"},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Your small claims case has been saved in Small Claims Genie. Here's a summary:</p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Case Summary</p>
      <p style="margin:0 0 6px;font-size:16px;font-weight:bold;color:#111827;">${d.caseTitle}</p>
      ${d.defendantName ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;"><strong>Defendant:</strong> ${d.defendantName}</p>` : ""}
      ${d.claimAmount ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;"><strong>Claim Amount:</strong> $${d.claimAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>` : ""}
      ${d.countyId ? `<p style="margin:0;font-size:14px;color:#374151;"><strong>County:</strong> ${d.countyId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>` : ""}
    </div>

    ${courtBlock}

    <p style="margin:0 0 16px;font-size:15px;color:#374151;"><strong>What happens next?</strong></p>
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">1. &nbsp;Complete your intake form if you haven't already</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">2. &nbsp;Download and file your SC-100 form at the courthouse</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">3. &nbsp;The court will mail you a hearing date — usually within 30–70 days</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">4. &nbsp;Enter your hearing date in Small Claims Genie to unlock prep reminders</td></tr>
    </table>

    <div style="text-align:center;margin:28px 0;">
      <a href="https://smallclaimsgenie.com/cases/${d.caseId}" style="background:#0d6b5e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;display:inline-block;">
        Open My Case →
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:#6b7280;">Small Claims Genie is not a law firm and this is not legal advice.</p>
  `);

  return { subject, html };
}

// ─── Weekly Check-In Email (no hearing date yet) ──────────────────────────────
export type WeeklyCheckInEmailData = {
  plaintiffName: string;
  caseTitle: string;
  weekNumber: number;
  countyId: string | null;
  courthouseName: string | null;
  courthousePhone: string | null;
  courthouseWebsite: string | null;
  courthouseClerkEmail: string | null;
  courthouseAddress: string | null;
  courthouseCity: string | null;
  courthouseZip: string | null;
  caseId: number;
};

export function buildWeeklyCheckInEmail(d: WeeklyCheckInEmailData): { subject: string; html: string } {
  const subject = `📬 Week ${d.weekNumber} Update — Have You Received Your Hearing Date?`;

  const contactFormNote = d.courthouseWebsite
    ? `<p style="margin:6px 0 0;font-size:13px;color:#374151;">💬 No direct email? Use the <a href="${d.courthouseWebsite}" style="color:#0d6b5e;font-weight:bold;">court's online contact form →</a></p>`
    : "";

  const courtBlock = `
    <div style="background:#f0faf8;border-left:4px solid #14b8a6;padding:16px;border-radius:8px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#0d6b5e;text-transform:uppercase;letter-spacing:0.05em;">Your Court's Contact Information</p>
      ${d.courthouseName ? `<p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#111827;">${d.courthouseName}</p>` : ""}
      ${d.courthouseAddress ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">📍 ${d.courthouseAddress}, ${d.courthouseCity || ""} ${d.courthouseZip || ""}</p>` : ""}
      ${d.courthousePhone ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">📞 <a href="tel:${d.courthousePhone}" style="color:#0d6b5e;font-weight:bold;">${d.courthousePhone}</a> — Call the clerk directly</p>` : ""}
      ${d.courthouseClerkEmail ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">✉️ <a href="mailto:${d.courthouseClerkEmail}" style="color:#0d6b5e;font-weight:bold;">${d.courthouseClerkEmail}</a></p>` : ""}
      ${d.courthouseWebsite ? `<p style="margin:0 0 4px;font-size:14px;"><a href="${d.courthouseWebsite}" style="color:#0d6b5e;font-weight:bold;">🌐 Visit Court Website →</a></p>` : ""}
      ${contactFormNote}
    </div>`;

  const html = baseLayout(subject, `
    <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${d.plaintiffName || "there"},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">This is your week ${d.weekNumber} check-in for your case — <strong>${d.caseTitle}</strong>.</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">We don't have a hearing date on file for your case yet. Here's what to do:</p>

    <div style="background:#fef9c3;border:1px solid #fbbf24;border-radius:8px;padding:14px;margin:0 0 20px;">
      <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#92400e;">📬 Step 1 — Check your physical mail</p>
      <p style="margin:0;font-size:14px;color:#78350f;">California courts mail the <strong>Notice of Small Claims Hearing</strong> to the address you listed when filing. Check your mailbox — the notice may already be there.</p>
    </div>

    <div style="background:#f0f9ff;border:1px solid #7dd3fc;border-radius:8px;padding:14px;margin:0 0 20px;">
      <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#0c4a6e;">📞 Step 2 — Contact the court if nothing has arrived</p>
      <p style="margin:0;font-size:14px;color:#075985;">If you haven't received anything, reach out to the clerk's office using the contact information below and ask about the status of your filing.</p>
    </div>

    ${courtBlock}

    <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#111827;">Ask the clerk:</p>
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">• Was my small claims filing received and processed?</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">• Has a hearing date been assigned to my case?</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">• What is my case/claim number?</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">• When can I expect to receive the hearing notice?</td></tr>
    </table>

    <p style="margin:20px 0 16px;font-size:15px;color:#374151;">Once you have your hearing date, enter it in Small Claims Genie so we can send you preparation reminders automatically.</p>

    <div style="text-align:center;margin:28px 0;">
      <a href="https://smallclaimsgenie.com/cases/${d.caseId}" style="background:#0d6b5e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;display:inline-block;">
        Enter My Hearing Date →
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:#6b7280;">You'll receive this weekly check-in until your hearing date is entered. Small Claims Genie is not a law firm and this is not legal advice.</p>
  `);

  return { subject, html };
}
