export default function TextColorComparison() {
  const examples = [
    {
      label: "Current",
      labelColor: "#64748b",
      textColor: "hsl(220, 15%, 45%)",
      note: "Too light — harder to read",
    },
    {
      label: "Option A — Slightly Darker",
      labelColor: "#2563eb",
      textColor: "hsl(220, 15%, 32%)",
      note: "Subtle change, noticeably easier",
    },
    {
      label: "Option B — Darker",
      labelColor: "#16a34a",
      textColor: "hsl(220, 20%, 22%)",
      note: "High contrast, very readable",
    },
  ];

  const content = {
    heading: "Contractors / Home Services",
    body: "Incomplete work, poor workmanship, delays, or payment disputes with contractors. We help you document scope, change requests, milestones, invoices, and the cost to finish or fix the work.",
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#f8fafc", minHeight: "100vh", padding: "40px 32px" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Body Text Color — Preview</h1>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 40 }}>
        Same heading, three different body text shades. Pick the one that feels right.
      </p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {examples.map((ex) => (
          <div
            key={ex.label}
            style={{
              flex: "1 1 280px",
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              padding: 28,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            {/* Option badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div
                style={{
                  background: ex.labelColor,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 20,
                  letterSpacing: "0.04em",
                }}
              >
                {ex.label}
              </div>
            </div>

            {/* Simulated card */}
            <div style={{ background: "#f8fafc", borderRadius: 8, padding: 20, border: "1px solid #e2e8f0" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 10, lineHeight: 1.3 }}>
                {content.heading}
              </h2>
              <p style={{ fontSize: 14, color: ex.textColor, lineHeight: 1.65, margin: 0 }}>
                {content.body}
              </p>
            </div>

            {/* Hex swatch */}
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: ex.textColor,
                  border: "1px solid #e2e8f0",
                  flexShrink: 0,
                }}
              />
              <div>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>{ex.textColor}</p>
                <p style={{ fontSize: 12, fontStyle: "italic", color: "#64748b", margin: 0 }}>{ex.note}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
