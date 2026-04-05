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
