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

const LOGO_URL = "https://smallclaimsgenie.com/logo.jpg";
const CONTACT_EMAIL = "support@smallclaimsgenie.com";
const SITE_URL = "https://smallclaimsgenie.com";

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
        <!-- Logo Header -->
        <tr><td style="background:#ffffff;padding:24px 32px 0;text-align:center;">
          <a href="${SITE_URL}" style="display:inline-block;text-decoration:none;">
            <img src="${LOGO_URL}" alt="Small Claims Genie" width="220" height="104" style="display:block;width:220px;height:auto;border:0;" />
          </a>
        </td></tr>
        <!-- Teal accent bar + subject line -->
        <tr><td style="background:#0d6b5e;padding:12px 32px;margin-top:20px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;text-align:center;">${title}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">${body}</td></tr>
        <!-- Footer -->
        <tr><td style="background:#f0faf8;padding:24px 32px;border-top:1px solid #e5e7eb;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align:center;padding-bottom:12px;">
                <a href="${SITE_URL}" style="display:inline-block;text-decoration:none;">
                  <img src="${LOGO_URL}" alt="Small Claims Genie" width="140" height="66" style="display:block;width:140px;height:auto;border:0;margin:0 auto;" />
                </a>
              </td>
            </tr>
            <tr>
              <td style="text-align:center;padding-bottom:8px;">
                <p style="margin:0 0 4px;font-size:13px;color:#374151;">
                  Questions? Email us: <a href="mailto:${CONTACT_EMAIL}" style="color:#0d6b5e;font-weight:bold;">${CONTACT_EMAIL}</a>
                </p>
                <p style="margin:0;font-size:13px;color:#374151;">
                  <a href="${SITE_URL}" style="color:#0d6b5e;font-weight:bold;">${SITE_URL}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="text-align:center;padding-top:12px;border-top:1px solid #d1fae5;">
                <p style="margin:0;font-size:11px;color:#9ca3af;">
                  Small Claims Genie is not a law firm and this email is not legal advice.<br/>
                  You are receiving this because you created a case at smallclaimsgenie.com.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function build30DayEmail(d: HearingEmailData): { subject: string; html: string } {
  const subject = `📅 Your Hearing is 1 Month Away — Here's What to Do Now`;
  const html = baseLayout(subject, `
    <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${d.plaintiffName || "there"},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Great news — your small claims hearing is set! You have <strong>30 days to prepare</strong>, which is plenty of time to build a strong case.</p>

    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:bold;color:#92400e;text-transform:uppercase;">Your Hearing Date</p>
      <p style="margin:0;font-size:18px;font-weight:bold;color:#111827;">${formatDate(d.hearingDate)}${d.hearingTime ? ` at ${d.hearingTime}` : ""}</p>
      ${d.courthouseName ? `<p style="margin:4px 0 0;font-size:14px;color:#374151;">${d.courthouseName}${d.hearingCourtroom ? ` · Courtroom ${d.hearingCourtroom}` : ""}</p>` : ""}
      ${d.caseNumber ? `<p style="margin:4px 0 0;font-size:13px;color:#374151;">Case No. <strong>${d.caseNumber}</strong></p>` : ""}
    </div>

    <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#111827;">📋 Your 30-day game plan:</p>
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="padding:7px 0;font-size:14px;color:#374151;">✅ &nbsp;<strong>Week 1:</strong> Gather all your evidence — contracts, receipts, texts, photos, invoices</td></tr>
      <tr><td style="padding:7px 0;font-size:14px;color:#374151;">✅ &nbsp;<strong>Week 2:</strong> Make sure the defendant is properly served if you haven't already</td></tr>
      <tr><td style="padding:7px 0;font-size:14px;color:#374151;">✅ &nbsp;<strong>Week 3:</strong> Use the AI Chat and Hearing Prep Coach to practice your statement</td></tr>
      <tr><td style="padding:7px 0;font-size:14px;color:#374151;">✅ &nbsp;<strong>Week 4:</strong> Make copies of all documents and do a final review</td></tr>
    </table>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#166534;"><strong>💡 Did you know?</strong> Small Claims Genie has a <strong>Hearing Prep Coach</strong> that acts like a practice judge — it will ask you the same kinds of questions a real judge would ask, so you're not caught off guard on hearing day.</p>
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="https://smallclaimsgenie.com/cases/${d.caseId}" style="background:#0d6b5e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;display:inline-block;">
        Open My Case &amp; Start Preparing →
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:#6b7280;">Small Claims Genie is not a law firm and this is not legal advice.</p>
  `);
  return { subject, html };
}

export function build7DayEmail(d: HearingEmailData): { subject: string; html: string } {
  const subject = `📌 1 Week Until Your Hearing — Final Prep Checklist`;
  const courtBlock = d.courthouseName
    ? `<div style="background:#f0faf8;border-left:4px solid #14b8a6;padding:16px;border-radius:8px;margin:20px 0;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#0d6b5e;text-transform:uppercase;">Where to Go</p>
        ${d.courthouseName ? `<p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#111827;">${d.courthouseName}</p>` : ""}
        ${d.courthouseAddress ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">${d.courthouseAddress}, ${d.courthouseCity || ""} ${d.courthouseZip || ""}</p>` : ""}
        ${d.hearingCourtroom ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">Courtroom: <strong>${d.hearingCourtroom}</strong></p>` : ""}
        ${d.courthouseWebsite ? `<p style="margin:0;font-size:14px;"><a href="${d.courthouseWebsite}" style="color:#0d6b5e;font-weight:bold;">🌐 Get directions &amp; parking info →</a></p>` : ""}
       </div>` : "";

  const html = baseLayout(subject, `
    <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${d.plaintiffName || "there"},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Your hearing is <strong>one week away</strong>. This is the week to finalize everything — here's what you should do today.</p>

    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:bold;color:#92400e;text-transform:uppercase;">Hearing Info</p>
      <p style="margin:0;font-size:18px;font-weight:bold;color:#111827;">${formatDate(d.hearingDate)}${d.hearingTime ? ` at ${d.hearingTime}` : ""}</p>
      ${d.caseNumber ? `<p style="margin:4px 0 0;font-size:13px;color:#374151;">Case No. <strong>${d.caseNumber}</strong></p>` : ""}
    </div>

    ${courtBlock}

    <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#111827;">✅ This week — get these done:</p>
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">📁 &nbsp;Make <strong>3 printed copies</strong> of every document (judge, defendant, yourself)</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">🧠 &nbsp;Practice with the <strong>Hearing Prep Coach</strong> — answer the judge's practice questions</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">📝 &nbsp;Write out a 2–3 minute statement in plain words — practice saying it out loud</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">📬 &nbsp;Confirm you have <strong>proof of service</strong> showing the defendant was notified</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">🗺️ &nbsp;Look up parking and how long it takes to get to the courthouse — plan to arrive early</td></tr>
    </table>

    <div style="text-align:center;margin:28px 0;">
      <a href="https://smallclaimsgenie.com/cases/${d.caseId}" style="background:#0d6b5e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;display:inline-block;">
        Prep for My Hearing →
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:#6b7280;">You've got this! Small Claims Genie is not a law firm and this is not legal advice.</p>
  `);
  return { subject, html };
}

export function build1DayEmail(d: HearingEmailData): { subject: string; html: string } {
  const subject = `⚖️ Your Hearing is Tomorrow — You're Ready`;
  const mapsUrl = d.courthouseAddress
    ? `https://www.google.com/maps/search/${encodeURIComponent((d.courthouseAddress || "") + " " + (d.courthouseCity || "") + " CA")}`
    : null;

  const html = baseLayout(subject, `
    <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${d.plaintiffName || "there"},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;"><strong>Tomorrow is your day.</strong> You have prepared for this — now trust that preparation and walk in with confidence.</p>

    <div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:10px;padding:18px;margin:0 0 20px;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:bold;color:#92400e;text-transform:uppercase;">⏰ Your Hearing</p>
      <p style="margin:0;font-size:22px;font-weight:bold;color:#111827;">${formatDate(d.hearingDate)}${d.hearingTime ? ` at ${d.hearingTime}` : ""}</p>
      ${d.courthouseName ? `<p style="margin:8px 0 0;font-size:15px;color:#374151;">${d.courthouseName}${d.hearingCourtroom ? ` — Courtroom ${d.hearingCourtroom}` : ""}</p>` : ""}
      ${d.caseNumber ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Case No. ${d.caseNumber}</p>` : ""}
      ${mapsUrl ? `<p style="margin:12px 0 0;"><a href="${mapsUrl}" style="color:#0d6b5e;font-weight:bold;font-size:14px;">📍 Get directions →</a></p>` : ""}
    </div>

    <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#111827;">📦 Pack tonight — bring tomorrow:</p>
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">✅ &nbsp;Photo ID</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">✅ &nbsp;3 copies of all documents &amp; evidence</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">✅ &nbsp;Your printed statement / talking points</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">✅ &nbsp;SC-100 and any attachments</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#374151;">✅ &nbsp;Proof of service (SC-104 or certified mail receipt)</td></tr>
    </table>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#166534;">💡 3 things to remember in the courtroom:</p>
      <p style="margin:0 0 4px;font-size:14px;color:#166534;">1. Arrive 30 minutes early — security lines can be slow</p>
      <p style="margin:0 0 4px;font-size:14px;color:#166534;">2. Address the judge as <strong>"Your Honor"</strong></p>
      <p style="margin:0;font-size:14px;color:#166534;">3. Stick to the facts — amounts, dates, what happened, what you lost</p>
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="https://smallclaimsgenie.com/cases/${d.caseId}" style="background:#0d6b5e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;display:inline-block;">
        Review My Case One Last Time →
      </a>
    </div>

    <p style="margin:0 0 8px;font-size:14px;color:#374151;text-align:center;font-weight:bold;">Good luck, ${d.plaintiffName || ""}. You've got this! 🌟</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">Small Claims Genie is not a law firm and this is not legal advice.</p>
  `);
  return { subject, html };
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
