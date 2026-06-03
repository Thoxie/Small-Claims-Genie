import { Mail, Clock, CalendarDays, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";

type EmailRow = {
  icon: React.ReactNode;
  name: string;
  trigger: string;
  timing: string;
  subject: string;
  sentOnce: boolean;
  requires: string;
};

const PRE_HEARING: EmailRow[] = [
  {
    icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    name: "Case Confirmation",
    trigger: "Intake marked complete",
    timing: "Within 1 hour of completion",
    subject: "✅ Your Small Claims Case Is Set Up",
    sentOnce: true,
    requires: "Plaintiff email + intake complete",
  },
  {
    icon: <RefreshCw className="w-4 h-4 text-blue-500" />,
    name: "Weekly Check-In",
    trigger: "No hearing date entered",
    timing: "Every 7 days until a hearing date is added",
    subject: "📋 Week [N] Update — Your Case Is Waiting for a Hearing Date",
    sentOnce: false,
    requires: "Plaintiff email + intake complete + no hearing date",
  },
  {
    icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
    name: "No Hearing Date Follow-Up",
    trigger: "14 days after intake, still no hearing date",
    timing: "Once, ~14 days after case created",
    subject: "📋 Have You Received Your Hearing Notice Yet?",
    sentOnce: true,
    requires: "Plaintiff email + intake complete + no hearing date + 14 days elapsed",
  },
];

const HEARING_REMINDERS: EmailRow[] = [
  {
    icon: <CalendarDays className="w-4 h-4 text-purple-500" />,
    name: "30-Day Reminder",
    trigger: "Hearing date is 29–31 days away",
    timing: "~30 days before hearing",
    subject: "📅 Your Hearing is 1 Month Away — Here's What to Do Now",
    sentOnce: true,
    requires: "Hearing date set + plaintiff email",
  },
  {
    icon: <CalendarDays className="w-4 h-4 text-purple-500" />,
    name: "14-Day Reminder",
    trigger: "Hearing date is 13–15 days away",
    timing: "~14 days before hearing",
    subject: "⏰ 2 Weeks to Your Hearing — Time to Prepare",
    sentOnce: true,
    requires: "Hearing date set + plaintiff email",
  },
  {
    icon: <CalendarDays className="w-4 h-4 text-orange-500" />,
    name: "7-Day Reminder",
    trigger: "Hearing date is 6–8 days away",
    timing: "~7 days before hearing",
    subject: "📌 1 Week Until Your Hearing — Final Prep Checklist",
    sentOnce: true,
    requires: "Hearing date set + plaintiff email",
  },
  {
    icon: <CalendarDays className="w-4 h-4 text-red-500" />,
    name: "3-Day Reminder",
    trigger: "Hearing date is 2–4 days away",
    timing: "~3 days before hearing",
    subject: "🚨 Your Hearing is in 3 Days — Final Checklist + Parking Info",
    sentOnce: true,
    requires: "Hearing date set + plaintiff email",
  },
  {
    icon: <CalendarDays className="w-4 h-4 text-red-700" />,
    name: "Day-Before Reminder",
    trigger: "Hearing date is 0–1 days away",
    timing: "The day before (or day of) the hearing",
    subject: "⚖️ Your Hearing is Tomorrow — You're Ready",
    sentOnce: true,
    requires: "Hearing date set + plaintiff email",
  },
];

function EmailTable({ rows }: { rows: EmailRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#f0faf8] border-b border-gray-200">
            <th className="text-left px-4 py-3 font-bold text-[#0d6b5e] whitespace-nowrap">Email</th>
            <th className="text-left px-4 py-3 font-bold text-[#0d6b5e] whitespace-nowrap">Trigger</th>
            <th className="text-left px-4 py-3 font-bold text-[#0d6b5e] whitespace-nowrap">Timing</th>
            <th className="text-left px-4 py-3 font-bold text-[#0d6b5e]">Subject Line</th>
            <th className="text-left px-4 py-3 font-bold text-[#0d6b5e] whitespace-nowrap">Sent</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2 font-semibold text-[#20304f] whitespace-nowrap">
                  {row.icon}
                  {row.name}
                </div>
                <div className="mt-1 text-[11px] text-[#8a96a8] leading-snug max-w-[200px]">
                  Requires: {row.requires}
                </div>
              </td>
              <td className="px-4 py-4 text-[#5a6478] max-w-[180px]">{row.trigger}</td>
              <td className="px-4 py-4 text-[#5a6478] whitespace-nowrap">{row.timing}</td>
              <td className="px-4 py-4 text-[#20304f] font-mono text-[12px] max-w-[260px]">{row.subject}</td>
              <td className="px-4 py-4">
                {row.sentOnce ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                    ✓ Once only
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap">
                    ↻ Repeating
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EmailSchedule() {
  return (
    <div className="min-h-screen bg-[#f5fdfb] px-4 py-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-7 h-7 text-[#0d6b5e]" />
            <h1 className="text-2xl font-black text-[#20304f]">Email Schedule</h1>
          </div>
          <p className="text-[#5a6478] text-sm max-w-2xl">
            All emails are sent automatically by the system. The scheduler runs every hour and checks
            all active cases. Each one-time email has a database flag to prevent duplicates.
          </p>
        </div>

        {/* How the scheduler works */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-8 flex flex-col sm:flex-row gap-5">
          <div className="flex items-start gap-3 flex-1">
            <Clock className="w-5 h-5 text-[#0d6b5e] mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-[#20304f] text-sm mb-0.5">Runs every hour</p>
              <p className="text-[#5a6478] text-[13px]">The scheduler fires on server startup and then every 60 minutes — it scans all cases and sends any emails that are due.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 flex-1">
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-[#20304f] text-sm mb-0.5">No duplicate sends</p>
              <p className="text-[#5a6478] text-[13px]">Each one-time email sets a flag in the database after sending. The system checks the flag before sending — so even if the scheduler runs 100 times, the email only goes out once.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 flex-1">
            <Mail className="w-5 h-5 text-[#5a6478] mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-[#20304f] text-sm mb-0.5">Sent from</p>
              <p className="text-[#5a6478] text-[13px]">reminders@smallclaimsgenie.com via Resend. Reply-to and support contact is support@smallclaimsgenie.com.</p>
            </div>
          </div>
        </div>

        {/* Track 1 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-[#0d6b5e] text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">Track 1</span>
            <h2 className="text-base font-black text-[#20304f]">Pre-Hearing / Engagement Emails</h2>
          </div>
          <p className="text-[13px] text-[#5a6478] mb-4">
            These go out after intake is complete regardless of whether a hearing date has been set. They keep users engaged and remind them to file.
          </p>
          <EmailTable rows={PRE_HEARING} />
        </div>

        {/* Track 2 */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-purple-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">Track 2</span>
            <h2 className="text-base font-black text-[#20304f]">Hearing Countdown Reminders</h2>
          </div>
          <p className="text-[13px] text-[#5a6478] mb-4">
            Only sent once a hearing date is entered. Each email fires in a window around the target day (e.g. 29–31 days for the 30-day email) to account for the hourly scheduler not running at exactly midnight.
          </p>
          <EmailTable rows={HEARING_REMINDERS} />
        </div>

        {/* Timeline visual */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-black text-[#20304f] mb-5">Hearing Countdown Timeline</h2>
          <div className="relative">
            {/* Line */}
            <div className="absolute left-0 right-0 top-5 h-0.5 bg-gray-200" />
            <div className="relative flex justify-between">
              {[
                { label: "30 days", color: "bg-purple-500", day: "D-30" },
                { label: "14 days", color: "bg-purple-500", day: "D-14" },
                { label: "7 days",  color: "bg-orange-500", day: "D-7" },
                { label: "3 days",  color: "bg-red-500",    day: "D-3" },
                { label: "Day before", color: "bg-red-700", day: "D-1" },
                { label: "HEARING", color: "bg-[#0d6b5e]",  day: "⚖️" },
              ].map((point) => (
                <div key={point.day} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full ${point.color} flex items-center justify-center text-white text-[11px] font-bold z-10 shadow`}>
                    {point.day}
                  </div>
                  <span className="text-[11px] text-[#5a6478] font-semibold text-center">{point.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[12px] text-[#adb5c5] text-center">
          This page is for internal reference only. All emails are sent automatically — no manual action required.
        </p>

      </div>
    </div>
  );
}
