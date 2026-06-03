import React from "react";
import sc100pg1 from "../../assets/sc100_hq-1.png";
import sc100pg2 from "../../assets/sc100_hq-2.png";
import sc100pg3 from "../../assets/sc100_hq-3.png";
import sc100pg4 from "../../assets/sc100_hq-4.png";

const PAGE_IMGS: Record<number, string> = {
  1: sc100pg1,
  2: sc100pg2,
  3: sc100pg3,
  4: sc100pg4,
};

// ─── PDF coordinate system: 612×792 pt, y=0 at BOTTOM ───────────────────────
// CSS: container 612×792px, position absolute, left=pdf_x, bottom=pdf_y
// PNG 2550×3300 scaled to 612×792 = ×0.24 exactly.

const PW = 612;
const PH = 792;

type Label = {
  x: number;
  y: number;
  text: string;
  kind: "new" | "removed" | "moved" | "unchanged";
  note?: string;
};

function FormPage({
  page,
  labels,
  title,
}: {
  page: 1 | 2 | 3 | 4;
  labels: Label[];
  title: string;
}) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontFamily: "sans-serif", marginBottom: 8, fontSize: 16 }}>
        {title}
      </h2>
      <div
        style={{
          position: "relative",
          width: PW,
          height: PH,
          border: "2px solid #333",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* Form background */}
        <img
          src={PAGE_IMGS[page]}
          alt={`SC-100 Page ${page}`}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: PW,
            height: PH,
            objectFit: "fill",
          }}
        />

        {/* Coordinate overlays */}
        {labels.map((lbl, i) => {
          const bgColor =
            lbl.kind === "new"
              ? "rgba(0,160,0,0.85)"
              : lbl.kind === "removed"
                ? "rgba(200,0,0,0.85)"
                : lbl.kind === "moved"
                  ? "rgba(200,100,0,0.85)"
                  : "rgba(0,0,180,0.75)";

          return (
            <div
              key={i}
              title={lbl.note ?? `x=${lbl.x}, y=${lbl.y} • ${lbl.text}`}
              style={{
                position: "absolute",
                left: lbl.x,
                bottom: lbl.y,
                backgroundColor: bgColor,
                color: "#fff",
                fontSize: 7.5,
                fontFamily: "Helvetica, Arial, sans-serif",
                fontWeight: "bold",
                padding: "1px 3px",
                borderRadius: 2,
                whiteSpace: "nowrap",
                lineHeight: 1.2,
                cursor: "default",
                zIndex: 10,
                transform: "translateY(50%)", // centre vertically on the PDF y line
              }}
            >
              {lbl.text}
            </div>
          );
        })}
      </div>

      {/* Per-page label list */}
      <div style={{ fontFamily: "monospace", fontSize: 11, marginTop: 8, color: "#555" }}>
        {labels.map((lbl, i) => (
          <div key={i}>
            <span
              style={{
                color:
                  lbl.kind === "new"
                    ? "green"
                    : lbl.kind === "removed"
                      ? "red"
                      : lbl.kind === "moved"
                        ? "darkorange"
                        : "navy",
                fontWeight: "bold",
              }}
            >
              [{lbl.kind.toUpperCase()}]
            </span>{" "}
            x={lbl.x}, y={lbl.y} — {lbl.text}
            {lbl.note ? ` (${lbl.note})` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Proposed Page 1 labels ────────────────────────────────────────────────
const page1Labels: Label[] = [
  // ── Court name box (right side, "Fill in court name and street address") ──
  // "Superior Court of California, County of ___" — county goes inline after text
  { x: 420, y: 648, text: "San Diego ← county name (after 'County of')", kind: "new", note: "countyDisplay — right-side court box, inline with 'County of'" },
  // Courthouse name on the next blank line
  { x: 290, y: 630, text: "South County Division – Chula Vista Courthouse ← courthouseName", kind: "new", note: "courthouseName — line below 'County of' line" },
  // Street address
  { x: 290, y: 616, text: "500 3rd Ave ← courthouseAddress", kind: "new", note: "courthouseAddress" },
  // City / State / Zip
  { x: 290, y: 602, text: "Chula Vista CA 91910 ← courthouseCity + 'CA' + courthouseZip", kind: "new", note: "courthouseCity + CA + courthouseZip" },

  // ── Case number box (below court name box) ────────────────────────────────
  { x: 355, y: 556, text: "24SC012345 ← caseNumber", kind: "new", note: "caseNumber — after 'Case Number:' label" },
  // Case Name (plaintiff v. defendant)
  { x: 290, y: 534, text: "Paul Andrew v. ACME Auto Repair ← caseName", kind: "new", note: "plaintiffName + ' v. ' + defendantName" },

  // ── Trial Date table — row 1 (Order to Go to Court section) ──────────────
  { x: 163, y: 450, text: "04/15/2026 ← hearingDate", kind: "new", note: "hearingDate — Trial Date row 1, Date column" },
  { x: 268, y: 450, text: "9:00 AM ← hearingTime", kind: "new", note: "hearingTime — Time column" },
  { x: 382, y: 450, text: "D23 ← hearingCourtroom", kind: "new", note: "hearingCourtroom — Department column (if available)" },
];

// ─── Proposed Page 2 labels ────────────────────────────────────────────────
const page2Labels: Label[] = [
  // ── REMOVED: courthouse info that was incorrectly on page 2 ───────────────
  { x: 166, y: 779, text: "❌ San Diego — REMOVE (belongs on Page 1)", kind: "removed", note: "Was: countyDisplay at y=779 — overlapping 'Plaintiff (list names):' header" },
  { x: 60, y: 765, text: "❌ Courthouse name — REMOVE (belongs on Page 1)", kind: "removed", note: "Was: courthouseName at y=765" },
  { x: 60, y: 752, text: "❌ 500 3rd Ave — REMOVE (belongs on Page 1)", kind: "removed", note: "Was: courthouseAddress at y=752" },
  { x: 60, y: 739, text: "❌ Chula Vista CA 91910 — REMOVE (belongs on Page 1)", kind: "removed", note: "Was: courthouseCity+zip at y=739" },

  // ── Caption row — was y=725, move up to y=745 to match pages 3 & 4 ────────
  { x: 132, y: 725, text: "❌ 'Paul Andrew' caption WAS here (y=725)", kind: "removed", note: "Old caption position — too low, in street address area" },
  { x: 132, y: 745, text: "✅ 'Paul Andrew' caption PROPOSED (y=745)", kind: "moved", note: "New caption position — matches pages 3 & 4, sits in the Plaintiff list-names row" },
  { x: 515, y: 725, text: "❌ Case# WAS (y=725)", kind: "removed" },
  { x: 515, y: 745, text: "✅ Case# PROPOSED (y=745)", kind: "moved" },

  // ── Plaintiff section (keeping existing coordinates — review below) ────────
  { x: 95, y: 674, text: "Paul Andrew ← plaintiffName", kind: "unchanged", note: "Current: y=674 — verify this sits on 'Name:' line" },
  { x: 455, y: 674, text: "(555) 555-5555 ← phone", kind: "unchanged", note: "Current: y=674 — verify on 'Phone:' field" },
  { x: 133, y: 655, text: "1 Main St ← address", kind: "unchanged", note: "Current: y=655 — verify on 'Street address:' line" },
  { x: 373, y: 655, text: "Corte Madera ← city", kind: "unchanged", note: "Current: y=655 — verify on 'City' field" },
  { x: 476, y: 655, text: "CA", kind: "unchanged" },
  { x: 503, y: 655, text: "94925", kind: "unchanged" },
  { x: 191, y: 600, text: "email@example.com ← email", kind: "unchanged", note: "Current: y=600 — verify on 'Email address:' line" },

  // ── Defendant section ─────────────────────────────────────────────────────
  { x: 95, y: 390, text: "ACME AUTO REPAIR ← defendantName", kind: "unchanged", note: "Current: y=390 — verify on Defendant 'Name:' line" },
  { x: 455, y: 390, text: "(560) 555-5555 ← phone", kind: "unchanged" },
  { x: 133, y: 371, text: "1 Main St ← address", kind: "unchanged" },
  { x: 372, y: 371, text: "San Diego ← city", kind: "unchanged" },
  { x: 473, y: 371, text: "CA", kind: "unchanged" },
  { x: 500, y: 371, text: "94965", kind: "unchanged" },

  // ── Agent (corporation) ───────────────────────────────────────────────────
  { x: 95, y: 283, text: "JOE MCJOE ← agentName", kind: "unchanged", note: "Current: y=283 — verify on agent 'Name:' line" },
  { x: 413, y: 283, text: "Manager ← agentTitle", kind: "unchanged" },

  // ── Claim amount ──────────────────────────────────────────────────────────
  { x: 300, y: 194, text: "$1,542.42 ← claimAmount", kind: "unchanged", note: "Current: y=194 — verify on 'defendant owes $___' line" },

  // ── Description ──────────────────────────────────────────────────────────
  { x: 63, y: 163, text: "Because of negligent operation… ← claimDescription", kind: "unchanged", note: "Current: y=163 — verify on first 'Why?' answer line" },
];

// ─── Page 3 — no structural changes, showing existing coordinates ──────────
const page3Labels: Label[] = [
  { x: 132, y: 745, text: "Paul Andrew ← plaintiffName (caption)", kind: "unchanged" },
  { x: 515, y: 745, text: "24SC012345 ← caseNumber (caption)", kind: "unchanged" },
  { x: 217, y: 690, text: "01/15/2025 ← incidentDate", kind: "unchanged" },
  { x: 70, y: 492, text: "✓ ← priorDemandMade=Yes", kind: "unchanged" },
  { x: 90, y: 374, text: "✓ ← venue checkbox (where defendant lives)", kind: "unchanged" },
  { x: 415, y: 180, text: "94965 ← venueZip", kind: "unchanged" },
];

// ─── Page 4 — no structural changes ──────────────────────────────────────
const page4Labels: Label[] = [
  { x: 132, y: 745, text: "Paul Andrew ← plaintiffName (caption)", kind: "unchanged" },
  { x: 515, y: 745, text: "24SC012345 ← caseNumber (caption)", kind: "unchanged" },
  { x: 122, y: 673, text: "✓ ← filedMoreThan12Claims=No", kind: "unchanged" },
  { x: 331, y: 650, text: "✓ ← claimOver2500=No", kind: "unchanged" },
  { x: 65, y: 501, text: "04/08/2026 ← declarationDate", kind: "unchanged" },
  { x: 36, y: 476, text: "Paul Andrew ← plaintiff types/prints name", kind: "unchanged" },
  { x: 248, y: 482, text: "[signature image, 240×30]", kind: "unchanged", note: "Signature canvas drawing embedded here" },
];

// ─── Legend ───────────────────────────────────────────────────────────────
const LEGEND = [
  { color: "green", label: "NEW — field does not exist yet, will be added" },
  { color: "red", label: "REMOVED — currently wrong page / wrong position" },
  { color: "darkorange", label: "MOVED — same field, adjusted position" },
  { color: "navy", label: "UNCHANGED — keeping current coordinate (verify alignment)" },
];

// ─── Main component ───────────────────────────────────────────────────────
export default function SC100CoordsMockup() {
  return (
    <div style={{ padding: 24, background: "#f5f5f5", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>SC-100 Coordinate Mockup — Review Before Applying</h1>
      <p style={{ color: "#555", marginBottom: 16, maxWidth: 640 }}>
        This is a <strong>visual preview only</strong> — no production code has been changed.
        Hover any label to see its field name and coordinate.
        Approve this layout and I'll apply the changes; otherwise tell me what to adjust.
      </p>

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 32, background: "#fff", padding: 12, borderRadius: 6, border: "1px solid #ddd" }}>
        {LEGEND.map((l) => (
          <div key={l.color} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-block", width: 14, height: 14, background: l.color, borderRadius: 2 }} />
            <span style={{ fontSize: 13 }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Pages */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 48 }}>
        <FormPage
          page={1}
          labels={page1Labels}
          title="Page 1 — Notice page  •  PROPOSED: add court name box + case number + hearing date/time"
        />
        <FormPage
          page={2}
          labels={page2Labels}
          title="Page 2 — Plaintiff / Defendant / Claim  •  PROPOSED: remove courthouse block (red), fix caption y (orange), keep plaintiff/defendant as-is (blue — verify)"
        />
        <FormPage
          page={3}
          labels={page3Labels}
          title="Page 3 — Calculation / Venue  •  No changes proposed"
        />
        <FormPage
          page={4}
          labels={page4Labels}
          title="Page 4 — Declaration  •  No changes proposed"
        />
      </div>

      <p style={{ marginTop: 40, color: "#888", fontSize: 12 }}>
        Labels are positioned at the exact PDF coordinate points (left=x, bottom=y).
        The form image is rendered at 612×792px (same as the generated PDF).
        If a label appears misaligned with a form field, tell me and I'll adjust that coordinate.
      </p>
    </div>
  );
}
