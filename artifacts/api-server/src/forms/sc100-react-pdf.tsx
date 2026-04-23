import React from "react";
import {
  Document,
  Page,
  Text,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import * as path from "path";

const PW = 612;
const PH = 792;

// ── Coordinate conversion ──────────────────────────────────────────────────────
// pdf-lib uses y = baseline from BOTTOM of page.
// @react-pdf uses top = distance from TOP of page.
// Helvetica cap-height ≈ 72% of font size (ascender above baseline).
// Adjust GLOBAL_Y_SHIFT (positive = shift all text DOWN, negative = shift UP).
const GLOBAL_Y_SHIFT = 0;
const py = (y: number, size: number = 9): number =>
  PH - y - size * 0.72 + GLOBAL_Y_SHIFT;

// ── Shared styles ──────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page:  { width: PW, height: PH, position: "relative", backgroundColor: "#fff" },
  bg:    { position: "absolute", top: 0, left: 0, width: PW, height: PH },
  t9:    { position: "absolute", fontFamily: "Helvetica", fontSize: 9, color: "#000", lineHeight: 1 },
  t8:    { position: "absolute", fontFamily: "Helvetica", fontSize: 8, color: "#000", lineHeight: 1 },
  x:     { position: "absolute", fontFamily: "Helvetica", fontSize: 10, color: "#000", lineHeight: 1 },
  wrap:  { position: "absolute", fontFamily: "Helvetica", fontSize: 9, color: "#000" },
});

// ── Field helpers ──────────────────────────────────────────────────────────────
const T = ({
  x, y, size = 9, children,
}: { x: number; y: number; size?: number; children?: string | null | undefined }) => {
  if (!children) return null;
  return <Text style={[size === 8 ? S.t8 : S.t9, { left: x, top: py(y, size) }]}>{children}</Text>;
};

const X = ({ x, y, show }: { x: number; y: number; show?: boolean | null }) => {
  if (!show) return null;
  return <Text style={[S.x, { left: x, top: py(y, 10) }]}>X</Text>;
};

const W = ({
  x, y, maxW, lineH, size = 9, children,
}: { x: number; y: number; maxW: number; lineH: number; size?: number; children?: string | null | undefined }) => {
  if (!children) return null;
  return (
    <Text style={[S.wrap, { left: x, top: py(y, size), width: maxW, fontSize: size, lineHeight: lineH / size }]}>
      {children}
    </Text>
  );
};

// ── Data shape ─────────────────────────────────────────────────────────────────
export interface SC100Data {
  countyDisplay?: string;
  courthouseName?: string;
  courthouseAddress?: string;
  courthouseLocation?: string;
  caseNameDisplay?: string;
  caseNumber?: string;
  // Plaintiff 1
  plaintiffName?: string;
  plaintiffPhone?: string;
  plaintiffAddress?: string;
  plaintiffCity?: string;
  plaintiffState?: string;
  plaintiffZip?: string;
  plaintiffMailingAddress?: string;
  plaintiffMailingCity?: string;
  plaintiffMailingState?: string;
  plaintiffMailingZip?: string;
  plaintiffEmail?: string;
  // Plaintiff 2
  secondPlaintiffName?: string;
  p2NameTitle?: string;
  secondPlaintiffPhone?: string;
  secondPlaintiffAddress?: string;
  secondPlaintiffCity?: string;
  secondPlaintiffState?: string;
  secondPlaintiffZip?: string;
  secondPlaintiffMailingAddress?: string;
  secondPlaintiffMailingCity?: string;
  secondPlaintiffMailingState?: string;
  secondPlaintiffMailingZip?: string;
  secondPlaintiffEmail?: string;
  // Defendant
  defendantName?: string;
  defendantPhone?: string;
  defendantAddress?: string;
  defendantCity?: string;
  defendantState?: string;
  defendantZip?: string;
  defendantMailingAddress?: string;
  defendantMailingCity?: string;
  defendantMailingState?: string;
  defendantMailingZip?: string;
  // Agent
  hasAgent?: string;
  defendantAgentName?: string;
  defendantAgentTitle?: string;
  defendantAgentStreet?: string;
  defendantAgentCity?: string;
  defendantAgentState?: string;
  defendantAgentZip?: string;
  // Claim
  claimAmountFormatted?: string;
  claimDescriptionForForm?: string;
  needsMC031?: boolean;
  // Page 3
  incidentDate?: string;
  hasDateRange?: boolean;
  dateStarted?: string;
  dateThrough?: string;
  howAmountCalculated?: string;
  priorDemandMade?: boolean;
  priorDemandWhyNot?: string;
  venueBasisLetter?: string;
  venueReason?: string;
  isVenueOther?: boolean;
  venueZip?: string;
  isAttyFeeDispute?: boolean;
  attyFeeAndArbitration?: boolean;
  isSuingPublicEntity?: boolean;
  publicEntityHasDate?: boolean;
  publicEntityClaimFiledDate?: string;
  // Page 4
  filedMoreThan12Claims?: boolean;
  claimOver2500?: boolean;
  declarationDate?: string;
  declarantNameTitle?: string;
  [key: string]: unknown;
}

// ── Component ──────────────────────────────────────────────────────────────────
const SC100Pdf: React.FC<{ data: SC100Data; assetDir: string; signatureDataUrl?: string }> = ({
  data: d,
  assetDir,
  signatureDataUrl,
}) => {
  const bg = (n: number) => path.join(assetDir, `sc100_hq-${n}.png`);

  return (
    <Document>
      {/* ══════════════ PAGE 1 — Instructions + court info box ══════════════ */}
      <Page size={[PW, PH]} style={S.page}>
        <Image src={bg(1)} style={S.bg} />
        <T x={384} y={568}>{d.countyDisplay}</T>
        <T x={380} y={542} size={8}>{d.courthouseName}</T>
        <T x={380} y={528} size={8}>{d.courthouseAddress}</T>
        <T x={380} y={514} size={8}>{d.courthouseLocation}</T>
        <T x={362} y={442} size={8}>{d.caseNameDisplay}</T>
      </Page>

      {/* ══════════════ PAGE 2 — Plaintiff / Defendant / Claim ══════════════ */}
      <Page size={[PW, PH]} style={S.page}>
        <Image src={bg(2)} style={S.bg} />

        {/* Header row */}
        <T x={163} y={748}>{d.plaintiffName}</T>
        {d.caseNumber && <T x={440} y={748}>{d.caseNumber}</T>}

        {/* ── Plaintiff 1 ── */}
        <T x={95}  y={682}>{d.plaintiffName}</T>
        <T x={462} y={682}>{d.plaintiffPhone}</T>
        <T x={133} y={655}>{d.plaintiffAddress}</T>
        <T x={370} y={655}>{d.plaintiffCity}</T>
        <T x={472} y={655}>{d.plaintiffState ?? "CA"}</T>
        <T x={499} y={655}>{d.plaintiffZip}</T>
        {d.plaintiffMailingAddress && (
          <>
            <T x={197} y={628}>{d.plaintiffMailingAddress}</T>
            <T x={370} y={628}>{d.plaintiffMailingCity}</T>
            <T x={472} y={628}>{d.plaintiffMailingState ?? "CA"}</T>
            <T x={499} y={628}>{d.plaintiffMailingZip}</T>
          </>
        )}
        <T x={191} y={601}>{d.plaintiffEmail}</T>

        {/* ── Plaintiff 2 ── */}
        {d.secondPlaintiffName && (
          <>
            <T x={95}  y={566}>{d.p2NameTitle}</T>
            {d.secondPlaintiffPhone && <T x={462} y={566}>{d.secondPlaintiffPhone}</T>}
            {d.secondPlaintiffAddress && (
              <>
                <T x={133} y={550}>{d.secondPlaintiffAddress}</T>
                <T x={370} y={550}>{d.secondPlaintiffCity}</T>
                <T x={472} y={550}>{d.secondPlaintiffState ?? "CA"}</T>
                <T x={499} y={550}>{d.secondPlaintiffZip}</T>
              </>
            )}
            {d.secondPlaintiffMailingAddress && (
              <>
                <T x={197} y={521}>{d.secondPlaintiffMailingAddress}</T>
                <T x={370} y={521}>{d.secondPlaintiffMailingCity}</T>
                <T x={472} y={521}>{d.secondPlaintiffMailingState ?? "CA"}</T>
                <T x={499} y={521}>{d.secondPlaintiffMailingZip}</T>
              </>
            )}
            {d.secondPlaintiffEmail && <T x={191} y={490}>{d.secondPlaintiffEmail}</T>}
          </>
        )}

        {/* ── Defendant ── */}
        <T x={95}  y={400}>{d.defendantName}</T>
        <T x={462} y={400}>{d.defendantPhone}</T>
        <T x={133} y={385}>{d.defendantAddress}</T>
        <T x={370} y={385}>{d.defendantCity}</T>
        <T x={472} y={385}>{d.defendantState ?? "CA"}</T>
        <T x={499} y={385}>{d.defendantZip}</T>
        {d.defendantMailingAddress && (
          <>
            <T x={215} y={356}>{d.defendantMailingAddress}</T>
            <T x={370} y={356}>{d.defendantMailingCity}</T>
            <T x={472} y={356}>{d.defendantMailingState ?? "CA"}</T>
            <T x={499} y={356}>{d.defendantMailingZip}</T>
          </>
        )}

        {/* ── Registered agent (business defendants) ── */}
        {d.hasAgent && (
          <>
            <T x={95}  y={283}>{d.defendantAgentName}</T>
            <T x={413} y={283}>{d.defendantAgentTitle}</T>
            <T x={124} y={268}>{d.defendantAgentStreet}</T>
            <T x={341} y={268}>{d.defendantAgentCity}</T>
            <T x={441} y={268}>{d.defendantAgentState ?? "CA"}</T>
            <T x={469} y={268}>{d.defendantAgentZip}</T>
          </>
        )}

        {/* ── Claim ── */}
        <T x={370} y={193}>{d.claimAmountFormatted}</T>
        <W x={63} y={163} maxW={480} lineH={14}>{d.claimDescriptionForForm}</W>
      </Page>

      {/* ══════════════ PAGE 3 — Claim details ══════════════ */}
      <Page size={[PW, PH]} style={S.page}>
        <Image src={bg(3)} style={S.bg} />

        {/* Header row */}
        <T x={163} y={748}>{d.plaintiffName}</T>
        {d.caseNumber && <T x={440} y={748}>{d.caseNumber}</T>}

        {/* Section 3 — when / how calculated */}
        <T x={217} y={689}>{d.incidentDate}</T>
        {d.hasDateRange && (
          <>
            <T x={335} y={673}>{d.dateStarted}</T>
            <T x={470} y={673}>{d.dateThrough}</T>
          </>
        )}
        <W x={63} y={641} maxW={480} lineH={13}>{d.howAmountCalculated}</W>
        <X x={36}  y={586} show={d.needsMC031} />

        {/* Section 4 — prior demand */}
        <X x={64}  y={489} show={d.priorDemandMade === true} />
        <X x={116} y={489} show={d.priorDemandMade === false} />
        {d.priorDemandWhyNot && (
          <W x={63} y={457} maxW={490} lineH={14}>{d.priorDemandWhyNot}</W>
        )}

        {/* Section 5 — venue */}
        {d.venueBasisLetter === "a" && <X x={79} y={373} show />}
        {d.venueBasisLetter === "b" && <X x={79} y={317} show />}
        {d.venueBasisLetter === "c" && <X x={79} y={276} show />}
        {d.venueBasisLetter === "d" && <X x={79} y={249} show />}
        {d.venueBasisLetter === "e" && <X x={79} y={220} show />}
        {d.isVenueOther && <T x={167} y={217}>{d.venueReason}</T>}

        {/* Section 6 — venue zip */}
        <T x={415} y={194}>{d.venueZip}</T>

        {/* Section 7 — attorney fee dispute */}
        <X x={358} y={153} show={d.isAttyFeeDispute === true} />
        <X x={409} y={153} show={!d.isAttyFeeDispute} />
        <X x={503} y={138} show={d.attyFeeAndArbitration === true} />

        {/* Section 8 — public entity */}
        <X x={244} y={118} show={d.isSuingPublicEntity === true} />
        <X x={295} y={118} show={!d.isSuingPublicEntity} />
        {d.publicEntityHasDate && (
          <T x={453} y={121}>{d.publicEntityClaimFiledDate}</T>
        )}
      </Page>

      {/* ══════════════ PAGE 4 — Declaration ══════════════ */}
      <Page size={[PW, PH]} style={S.page}>
        <Image src={bg(4)} style={S.bg} />

        {/* Header row */}
        <T x={163} y={748}>{d.plaintiffName}</T>
        {d.caseNumber && <T x={440} y={748}>{d.caseNumber}</T>}

        {/* 12+ claims filed this year */}
        <X x={64}  y={675} show={d.filedMoreThan12Claims === true} />
        <X x={113} y={675} show={!d.filedMoreThan12Claims} />

        {/* Claim over $2,500 */}
        <X x={276} y={657} show={d.claimOver2500 === true} />
        <X x={322} y={657} show={!d.claimOver2500} />

        {/* Declaration */}
        <T x={65}  y={506}>{d.declarationDate}</T>
        <T x={36}  y={488}>{d.declarantNameTitle}</T>

        {/* Signature image (drawn-to-sign) — sits between date line and print name */}
        {signatureDataUrl && (
          <Image
            src={signatureDataUrl}
            style={{ position: "absolute", left: 248, top: py(558, 30), width: 240, height: 30 }}
          />
        )}
      </Page>
    </Document>
  );
};

// ── Public render function ─────────────────────────────────────────────────────
export async function buildSC100Pdf(
  data: SC100Data,
  assetDir: string,
  signaturePngBytes?: Buffer
): Promise<Buffer> {
  const sigDataUrl = signaturePngBytes
    ? `data:image/png;base64,${signaturePngBytes.toString("base64")}`
    : undefined;

  const doc = <SC100Pdf data={data} assetDir={assetDir} signatureDataUrl={sigDataUrl} />;
  return renderToBuffer(doc);
}
