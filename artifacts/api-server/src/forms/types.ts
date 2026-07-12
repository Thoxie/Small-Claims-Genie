/**
 * forms/types.ts
 *
 * Shared type definitions for the form generation engine.
 *
 * - `CaseData`  covers every field that form definitions may read from the `d`
 *   (case data) parameter — both raw database columns and the computed/enriched
 *   fields added by `enrichForSC100`, `aiEnrichForSC100`, and similar helpers.
 *   All fields are optional because individual forms only consume a subset.
 *
 * - `FormBody`  covers every field that form definitions may read from the `b`
 *   (request body) parameter.  Because each form expects a different subset,
 *   all fields are optional.  The field names here are the canonical keys
 *   clients must use when calling the form endpoints.
 */

// ─── Case data ────────────────────────────────────────────────────────────────

/** Raw database columns from `casesTable` plus enriched/computed fields. */
export interface CaseData {
  // ── Identity ────────────────────────────────────────────────────────────────
  id?: number;
  userId?: string | null;
  title?: string;
  status?: string | null;

  // ── Plaintiff ───────────────────────────────────────────────────────────────
  plaintiffName?: string | null;
  plaintiffPhone?: string | null;
  plaintiffAddress?: string | null;
  plaintiffCity?: string | null;
  plaintiffState?: string | null;
  plaintiffZip?: string | null;
  plaintiffEmail?: string | null;
  plaintiffMailingAddress?: string | null;
  plaintiffMailingCity?: string | null;
  plaintiffMailingState?: string | null;
  plaintiffMailingZip?: string | null;
  plaintiffIsBusiness?: boolean | null;
  plaintiffIsFictitious?: boolean | null;
  plaintiffTitle?: string | null;
  plaintiffOccupation?: string | null;
  plaintiffEmployer?: string | null;

  // ── Plaintiff DBA / FBN ─────────────────────────────────────────────────────
  plaintiffDbaName?: string | null;
  plaintiffDbaAddress?: string | null;
  plaintiffDbaCity?: string | null;
  plaintiffDbaState?: string | null;
  plaintiffDbaZip?: string | null;
  plaintiffDbaMailingAddress?: string | null;
  plaintiffBusinessType?: string | null;
  plaintiffBusinessTypeOther?: string | null;
  plaintiffFbnNumber?: string | null;
  plaintiffFbnExpiry?: string | null;
  plaintiffFbnSignDate?: string | null;
  plaintiffFbnCounty?: string | null;

  // ── Second plaintiff ────────────────────────────────────────────────────────
  hasAdditionalPlaintiff?: boolean | null;
  secondPlaintiffName?: string | null;
  secondPlaintiffPhone?: string | null;
  secondPlaintiffAddress?: string | null;
  secondPlaintiffCity?: string | null;
  secondPlaintiffState?: string | null;
  secondPlaintiffZip?: string | null;
  secondPlaintiffEmail?: string | null;
  secondPlaintiffMailingAddress?: string | null;
  secondPlaintiffMailingCity?: string | null;
  secondPlaintiffMailingState?: string | null;
  secondPlaintiffMailingZip?: string | null;
  secondPlaintiffTitle?: string | null;
  additionalPlaintiffName?: string | null;
  additionalPlaintiffIsFictitious?: boolean | null;
  moreThanFourPlaintiffs?: boolean | null;

  // ── Second plaintiff DBA / FBN ──────────────────────────────────────────────
  secondPlaintiffDbaName?: string | null;
  secondPlaintiffDbaAddress?: string | null;
  secondPlaintiffDbaCity?: string | null;
  secondPlaintiffDbaState?: string | null;
  secondPlaintiffDbaZip?: string | null;
  secondPlaintiffDbaMailingAddress?: string | null;
  secondPlaintiffBusinessType?: string | null;
  secondPlaintiffBusinessTypeOther?: string | null;
  secondPlaintiffFbnNumber?: string | null;
  secondPlaintiffFbnExpiry?: string | null;
  secondPlaintiffFbnSignDate?: string | null;
  secondPlaintiffFbnCounty?: string | null;

  // ── Defendant ───────────────────────────────────────────────────────────────
  defendantName?: string | null;
  defendantPhone?: string | null;
  defendantAddress?: string | null;
  defendantCity?: string | null;
  defendantState?: string | null;
  defendantZip?: string | null;
  defendantMailingAddress?: string | null;
  defendantMailingCity?: string | null;
  defendantMailingState?: string | null;
  defendantMailingZip?: string | null;
  defendantIsBusinessOrEntity?: boolean | null;
  defendantAgentName?: string | null;
  defendantAgentTitle?: string | null;
  defendantAgentStreet?: string | null;
  defendantAgentCity?: string | null;
  defendantAgentState?: string | null;
  defendantAgentZip?: string | null;
  moreThanTwoDefendants?: boolean | null;

  // ── Claim ───────────────────────────────────────────────────────────────────
  claimType?: string | null;
  claimAmount?: number | null;
  claimDescription?: string | null;
  incidentDate?: string | null;
  howAmountCalculated?: string | null;
  priorDemandMade?: boolean | null;
  priorDemandDate?: string | null;
  priorDemandMethod?: string | null;
  priorDemandDescription?: string | null;
  priorDemandWhyNot?: string | null;

  // ── Work Done / Materials Furnished claim-specific ───────────────────────────
  workDoneStartDate?: string | null;
  workDoneEndDate?: string | null;
  workDoneLaborMaterials?: string | null;

  // ── Goods Sold claim-specific (Form 7.331) ────────────────────────────────
  goodsSoldInterestStartDate?: string | null;
  goodsSoldFirstSaleDate?: string | null;
  goodsSoldLastSaleDate?: string | null;
  goodsSoldGoodsAndPrices?: string | null;

  // ── Auto Negligence claim-specific (Form 7.330) ───────────────────────────
  autoCollisionLocation?: string | null;
  autoHighwayName?: string | null;
  autoCollisionCounty?: string | null;

  // ── Promissory Note claim-specific (Form 7.334) ───────────────────────────
  noteInterestRate?: string | null;
  noteInterestDue?: string | null;
  noteAttorneyFees?: string | null;

  // ── Stolen Property from Pawnbroker claim-specific (Form 7.335) ──────────
  pawnbrokerLawEnforcementAgency?: string | null;
  pawnbrokerReportNumber?: string | null;
  pawnbrokerWrittenDemandDate?: string | null;

  // ── Return of Property from Government claim-specific (Form 7.336) ────────
  replevinSeizureReason?: string | null;
  replevinDemandDate?: string | null;

  // ── Venue / courthouse ──────────────────────────────────────────────────────
  countyId?: string | null;
  venueBasis?: string | null;
  venueReason?: string | null;
  courthouseId?: string | null;
  courthouseName?: string | null;
  courthouseAddress?: string | null;
  courthouseCity?: string | null;
  courthouseZip?: string | null;
  courthousePhone?: string | null;
  courthouseWebsite?: string | null;
  courthouseClerkEmail?: string | null;
  filingFee?: number | null;

  // ── Legal flags ─────────────────────────────────────────────────────────────
  isSuingPublicEntity?: boolean | null;
  publicEntityClaimFiledDate?: string | null;
  isAttyFeeDispute?: boolean | null;
  hadArbitration?: boolean | null;
  filedMoreThan12Claims?: boolean | null;
  claimOver2500?: boolean | null;

  // ── Case number / hearing ───────────────────────────────────────────────────
  caseNumber?: string | null;
  hearingDate?: string | null;
  hearingTime?: string | null;
  hearingJudge?: string | null;
  hearingCourtroom?: string | null;
  hearingNotes?: string | null;

  // ── MC-030 declaration ──────────────────────────────────────────────────────
  mc030DeclarationTitle?: string | null;
  mc030DeclarationText?: string | null;
  mc030ExhibitDocIds?: unknown;

  // ── Misc case fields ────────────────────────────────────────────────────────
  notifyMethod?: string | null;
  intakeStep?: number | null;
  intakeComplete?: boolean | null;
  documentCount?: number | null;
  readinessScore?: number | null;
  sc104Data?: unknown;

  // ── Enriched / computed fields (added by enrichForSC100 and similar) ─────────
  /** Formatted hearing date (MM/DD/YYYY). Added by enrichForSC100. */
  hearingDateFormatted?: string;
  /** Formatted hearing time (12-hour). Added by enrichForSC100. */
  hearingTimeFormatted?: string;
  /** Start of an incident date range (when incidentDate contains "–"). */
  dateStarted?: string;
  /** End of an incident date range. */
  dateThrough?: string;
  /** True when the incident date is a range. */
  hasDateRange?: boolean;
  /** Zip code used to determine venue. Defaults to defendantZip. */
  venueZip?: string | null;
  /** County name formatted for display ("los-angeles" → "Los Angeles"). */
  countyDisplay?: string;
  /** "PlaintiffName v. DefendantName" */
  caseNameDisplay?: string;
  /** "City, CA ZIP" courthouse location line. */
  courthouseLocation?: string;
  /** Second-plaintiff display name, possibly with title appended. */
  p2NameTitle?: string;
  /** Claim amount formatted as "1,234.56". */
  claimAmountFormatted?: string;
  /**
   * Claim description truncated/enhanced for the SC-100 form field.
   * May be replaced with AI-generated summary by aiEnrichForSC100.
   */
  claimDescriptionForForm?: string;
  /** True when description or how-calculated text exceeds form field limits. */
  needsMC031?: boolean;
  /** Single-letter venue-basis code for the SC-100 checkbox (a–e). */
  venueBasisLetter?: string;
  /** True when venueBasis is "other". */
  isVenueOther?: boolean | undefined;
  /** Agent name when defendant is a business with a known agent. */
  hasAgent?: string | undefined;
  /** True when claim is both an attorney-fee dispute AND arbitration occurred. */
  attyFeeAndArbitration?: boolean;
  /** True when suing a public entity AND the claim-filed date is known. */
  publicEntityHasDate?: boolean;
  /**
   * Declarant display name (second plaintiff when plaintiff is a business,
   * otherwise the primary plaintiff).
   */
  declarantName?: string | null;
  /** Declarant name with optional title appended. */
  declarantNameTitle?: string | null;
  /** Date the declaration was signed (falls back to today's date). */
  declarationDate?: string | null;
}

// ─── Form body ────────────────────────────────────────────────────────────────

/** Partial type for request body fields read by individual form definitions. */
export interface FormBody {
  // ── Auth / download tokens (stripped by SC-100 before use) ──────────────────
  token?: string;
  signatureDataUrl?: string;
  download?: boolean | string | number;

  // ── Declarant override fields (MC-030) ──────────────────────────────────────
  declarantName?: string;
  declarantAddress?: string;
  declarantCityLine?: string;
  declarantPhone?: string;
  declarantEmail?: string;
  courtCounty?: string;
  courtStreet?: string;
  courtCityZip?: string;
  branchName?: string;

  // ── Declaration content (MC-030) ────────────────────────────────────────────
  declarationTitle?: string;
  declarationText?: string;
  /** Array of document IDs (numbers) to include as exhibits. */
  exhibitDocIds?: unknown[];
  /** AI-determined exhibit ordering (array of 1-based document indices). */
  exhibitOrder?: unknown[];

  // ── Signature fields (SC-100A) ───────────────────────────────────────────────
  signature1DataUrl?: string;
  signature2DataUrl?: string;
  /** Extra plaintiff to appear on SC-100A. */
  extraPlaintiff?: {
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  /** Extra defendant to appear on SC-100A. */
  extraDefendant?: {
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    agentName?: string;
  };

  // ── SC-103 / DBA fields ──────────────────────────────────────────────────────
  /** "sc100" or "sc120" — which form this SC-103 is attached to. */
  attachedTo?: string;
  businessName?: string;
  businessAddress?: string;
  mailingAddress?: string;
  businessType?: string;
  businessTypeOther?: string;
  fbnCounty?: string;
  fbnNumber?: string | number;
  fbnExpiry?: string | number;
  signerName?: string;

  // ── SC-104 / service fields ──────────────────────────────────────────────────
  serviceStreet?: string;
  serviceCity?: string;
  serviceState?: string;
  serviceZip?: string;

  // ── SC-105 / court order fields ──────────────────────────────────────────────
  requestingPartyName?: string;
  requestingPartyAddress?: string;
  /** "plaintiff" or "defendant" */
  requestingPartyRole?: string;
  /** Array of { name, address } objects for parties to be served. */
  noticeParties?: Array<{ name: string; address: string }>;
  orderRequested?: string;
  orderReason?: string;

  // ── SC-112A / mail service fields ────────────────────────────────────────────
  serverName?: string;
  serverPhone?: string;
  serverAddress?: string;
  serverCity?: string;
  serverState?: string;
  serverZip?: string;
  isRegisteredProcessServer?: boolean;
  registrationCounty?: string;
  registrationNumber?: string;
  /** Which document was served (e.g. "sc105", "sc150", "other"). */
  documentServed?: string;
  documentServedOther?: string;
  /** Array of { name, address } objects for parties served by mail. */
  partiesServed?: Array<{ name: string; address: string }>;
  mailingDate?: string;
  mailingCity?: string;

  // ── SC-120 / counterclaim fields ─────────────────────────────────────────────
  counterClaimAmount?: number | string;
  counterClaimReason?: string;
  counterClaimDate?: string;
  counterClaimHowCalculated?: string;
  priorDemand?: boolean | string;
  attyFeeDispute?: boolean | string;
  suingPublicEntity?: boolean | string;
  moreThan12?: boolean | string;
  /** Second defendant name (no DB column — body-only). */
  def2Name?: string;
  def2Phone?: string;
  def2Address?: string;
  def2City?: string;
  def2State?: string;
  def2Zip?: string;
  def2MailingAddress?: string;
  def2MailingCity?: string;
  def2MailingState?: string;
  def2MailingZip?: string;
  /** Date the public-entity claim was filed (SC-120 body field). */
  publicEntityClaimDate?: string;
  /** True when more than 2 plaintiffs are suing. */
  moreThan2Plaintiffs?: boolean | string;
  /** True when more than 2 defendants are named. */
  moreThan2Defendants?: boolean | string;
  /** True when arbitration was completed (SC-120 sub-question). */
  arbitrationCompleted?: boolean | string;

  // ── SC-140 / appeal fields ───────────────────────────────────────────────────
  courtName?: string;
  /** "plaintiff" or "defendant" */
  appellantRole?: string;
  /** "judgment" or "motion_to_vacate" */
  appealType?: string;
  appealFiledDate?: string;
  appellantName?: string;

  // ── SC-150 / postponement fields ─────────────────────────────────────────────
  requestingPartyPhone?: string;
  currentTrialDate?: string;
  postponeUntilDate?: string;
  postponeReason?: string;
  withinTenDaysReason?: string;

  // ── Common signing fields ────────────────────────────────────────────────────
  signDate?: string;
  declarationDate?: string;
}
