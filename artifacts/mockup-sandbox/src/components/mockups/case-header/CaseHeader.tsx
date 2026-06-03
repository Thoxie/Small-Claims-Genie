import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type Score = { value: number; label: string; color: "green" | "yellow" | "red" };

const SCORES: Score[] = [
  { value: 85, label: "Intake Complete", color: "green" },
  { value: 62, label: "In Progress", color: "yellow" },
  { value: 38, label: "Needs Info", color: "red" },
];

const borderColor = (c: Score["color"]) =>
  c === "green" ? "border-emerald-400" : c === "yellow" ? "border-amber-400" : "border-red-400";

const bgTint = (c: Score["color"]) =>
  c === "green" ? "bg-emerald-50/60" : c === "yellow" ? "bg-amber-50/60" : "bg-red-50/40";

const badgeStyle = (c: Score["color"]) =>
  c === "green"
    ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
    : c === "yellow"
    ? "bg-amber-100 text-amber-700 border border-amber-300"
    : "bg-red-100 text-red-700 border border-red-300";

const scoreColor = (c: Score["color"]) =>
  c === "green" ? "text-emerald-600" : c === "yellow" ? "text-amber-600" : "text-red-600";

interface Item { text: string; done: boolean }

const ITEMS_BY_SCORE: Record<Score["color"], Item[]> = {
  green: [
    { text: "Plaintiff name & address", done: true },
    { text: "Defendant name & address", done: true },
    { text: "Claim amount entered", done: true },
    { text: "County selected", done: true },
    { text: "Claim description written", done: true },
    { text: "Incident date set", done: true },
  ],
  yellow: [
    { text: "Plaintiff name & address", done: true },
    { text: "Defendant name & address", done: true },
    { text: "Claim amount entered", done: true },
    { text: "County selected", done: true },
    { text: "Claim description written", done: false },
    { text: "Incident date set", done: false },
  ],
  red: [
    { text: "Plaintiff name & address", done: true },
    { text: "Defendant name & address", done: false },
    { text: "Claim amount entered", done: false },
    { text: "County selected", done: false },
    { text: "Claim description written", done: false },
    { text: "Incident date set", done: false },
  ],
};

const DEFENDANTS: Record<Score["color"], string> = {
  green: "ACME Auto Repair LLC",
  yellow: "Harbor View Properties",
  red: "[Not entered]",
};

function HeaderTile({ score }: { score: Score }) {
  const items = ITEMS_BY_SCORE[score.color];
  const done = items.filter((i) => i.done);
  const missing = items.filter((i) => !i.done);

  return (
    <div
      className={`rounded-xl border-2 shadow-sm px-4 py-3 flex gap-4 items-start ${borderColor(score.color)} ${bgTint(score.color)}`}
    >
      {/* LEFT — Legal caption */}
      <div className="min-w-[200px] max-w-[210px] shrink-0">
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-0.5">
              Plaintiff
            </p>
            <p className="text-sm font-bold text-slate-800 leading-snug">Paul A. Andrews</p>
          </div>
          <span className="text-sm text-slate-400 pb-0.5">v.</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-0.5">
              Defendant
            </p>
            <p
              className={`text-sm font-bold leading-snug ${DEFENDANTS[score.color] === "[Not entered]" ? "text-slate-400 italic" : "text-slate-800"}`}
            >
              {DEFENDANTS[score.color]}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 mt-1.5">
          <span className="text-[11px] text-slate-500">
            Claim:{" "}
            <span className="font-semibold text-slate-700">
              {score.color === "red" ? "Not set" : "$4,200.00"}
            </span>
          </span>
          <span className="text-[11px] text-slate-500">
            {score.color === "red" ? "No county" : "Los Angeles Co."}
          </span>
        </div>
      </div>

      {/* DIVIDER */}
      <div className="w-px self-stretch bg-slate-200 shrink-0" />

      {/* MIDDLE — Checklist */}
      <div className="flex-1 min-w-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {items.map((item) => (
            <div key={item.text} className="flex items-center gap-1.5">
              {item.done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              )}
              <span
                className={`text-[11px] leading-tight ${item.done ? "text-slate-600" : "text-slate-400"}`}
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>
        {missing.length > 0 && (
          <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {missing.length} item{missing.length > 1 ? "s" : ""} still needed
          </p>
        )}
      </div>

      {/* DIVIDER */}
      <div className="w-px self-stretch bg-slate-200 shrink-0" />

      {/* RIGHT — Score */}
      <div className="shrink-0 flex flex-col items-center justify-center gap-1 min-w-[72px]">
        <p className={`text-3xl font-black leading-none ${scoreColor(score.color)}`}>
          {score.value}%
        </p>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${badgeStyle(score.color)}`}
        >
          {score.label}
        </span>
      </div>
    </div>
  );
}

export function CaseHeader() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-8 gap-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
        Case Header — 3 Score States
      </p>
      {SCORES.map((s) => (
        <div key={s.color} className="w-full max-w-3xl">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
            {s.color === "green" ? "≥ 80% — Green border" : s.color === "yellow" ? "50–79% — Yellow border" : "< 50% — Red border"}
          </p>
          <HeaderTile score={s} />
        </div>
      ))}
    </div>
  );
}
