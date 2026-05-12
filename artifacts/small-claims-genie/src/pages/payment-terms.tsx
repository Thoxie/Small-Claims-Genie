export default function PaymentTerms() {
  return (
    <div className="flex flex-col w-full bg-white">
      <section className="px-6 pt-10 pb-16 bg-white">
        <div className="max-w-3xl mx-auto">

          <h1 className="text-2xl sm:text-3xl font-black text-primary mb-1">Payment Terms</h1>
          <p className="text-xs text-muted-foreground mb-2">SMALL CLAIMS GENIE · Payment Authorization, Paralegal Support, and Pay-Only-If-You-Win Terms</p>
          <p className="text-xs text-muted-foreground mb-8">Website Payment Page / Terms Insert</p>

          <div className="mb-8 p-5 bg-amber-50 border border-amber-200 rounded-xl">
            <h2 className="text-sm font-bold text-primary mb-2">Important Payment Notice</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pay-only-if-you-win applies only to the success fee. Paralegal support, if selected, is a separate charge and is owed whether you win or lose, subject to any refund or cancellation rights expressly stated at checkout or in these Terms. The success fee is based on the case result, not collection of money.
            </p>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            These Payment Authorization, Paralegal Support, and Pay-Only-If-You-Win Terms (the "Payment Terms") apply when a customer selects a Small Claims Genie plan, product, case type, support option, paralegal support option, or pay-only-if-you-win option displayed at checkout.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            These Payment Terms are incorporated into and form part of Small Claims Genie's Terms and Conditions, Privacy Policy, checkout disclosures, and any plan-specific terms shown to the customer before purchase. If there is a conflict between these Payment Terms and a general website description, these Payment Terms control with respect to payment authorization, paralegal support charges, success fees, case-outcome reporting, and payment disputes.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            By selecting a plan, choosing any paid support option, entering payment information, checking the required authorization box, and completing checkout, you agree to these Payment Terms and authorize Small Claims Genie and its payment processor to charge your payment method as described below.
          </p>

          <Section num="1" title="Plans, Case Types, and Charges">
            <p>Small Claims Genie may offer different case types, plans, support levels, document-preparation options, paralegal support options, success-fee arrangements, or other paid services. The specific items selected by you at checkout, including the applicable price, fee, or success fee, will control your payment obligations.</p>
            <p>Your checkout page may identify one or more of the following charges: (a) a paralegal support charge; (b) a success fee; (c) a document-preparation or platform-access charge; (d) a case-type-specific charge; or (e) any other charge disclosed before checkout. Each charge is governed by the terms shown at checkout and by these Payment Terms.</p>
            <p>No statement that a plan is "pay-only-if-you-win" eliminates or reduces any separate paralegal support charge, administrative support charge, document-preparation charge, platform charge, or other non-success-fee charge that is expressly disclosed at checkout.</p>
          </Section>

          <Section num="2" title="Paralegal Support Charge Is Separate and Owed Regardless of Outcome">
            <p>If you select paralegal support, the paralegal support charge is separate from the success fee. Paralegal support is not contingent on whether you win, lose, settle, dismiss, withdraw, continue, postpone, abandon, or otherwise resolve your case.</p>
            <p>You agree that the paralegal support charge is owed whether your case results in a Favorable Case Outcome or not, because the charge pays for support services ordered, reserved, started, made available, reviewed, prepared, scheduled, or provided in connection with your matter.</p>
            <p>Unless a different refund or cancellation policy is expressly displayed at checkout, the paralegal support charge becomes earned when paralegal support is ordered, scheduled, reserved, started, made available through the platform, or provided, even if you later do not use all available support, discontinue the case, settle privately, lose, win, fail to appear, or decide not to proceed.</p>
            <p>Paralegal support means non-attorney support services, which may include document-preparation assistance, form-organization support, evidence-organization support, filing-readiness assistance, procedural support, customer-support guidance, and case-material organization. Paralegal support does not include legal advice, legal representation, attorney-client representation, court appearance, or a guarantee of outcome.</p>
          </Section>

          <Section num="3" title="Pay-Only-If-You-Win Applies Only to the Success Fee">
            <p>Under a pay-only-if-you-win plan, Small Claims Genie does not charge the success fee at the time you begin using the service. Instead, you authorize Small Claims Genie and its payment processor to store your payment method and charge your stored payment method later if your small claims matter results in a Favorable Case Outcome or if another payment-triggering event described in these Payment Terms occurs.</p>
            <p>The success fee is tied to the result of the case or dispute. It is not dependent on whether you have actually collected money from the opposing party.</p>
            <p>The success fee amount will be displayed at checkout before you authorize payment. By selecting the pay-only-if-you-win plan, you agree to pay that stated success fee if a payment-triggering event occurs under these Payment Terms.</p>
          </Section>

          <Section num="4" title="Favorable Case Outcome">
            <p>A "Favorable Case Outcome" means any result in your small claims matter that is materially in your favor, whether in whole or in part.</p>
            <p>A Favorable Case Outcome includes, without limitation: (a) a judgment in your favor; (b) a default judgment in your favor; (c) a stipulated judgment; (d) a court order awarding money, property, possession, dismissal of the other party's claim, reduction of the other party's claim, waiver of a claim against you, or other relief; (e) a settlement agreement; (f) a written payment agreement; (g) a written agreement to return property, repair property, replace property, cancel a debt, reduce a debt, or provide other value; (h) a voluntary payment or delivery of value from the opposing party after the claim was filed; (i) a dismissal filed after any agreement, payment, settlement, or resolution benefiting you; or (j) any other resolution that provides some or all of the relief you sought in connection with the matter.</p>
            <p>A Favorable Case Outcome does not require collection of money. The success fee is based on the case result, not on whether the opposing party has paid, whether you have collected a judgment, or whether collection efforts are successful.</p>
          </Section>

          <Section num="5" title="No Collection Requirement">
            <p>You understand and agree that the success fee is triggered by a Favorable Case Outcome, not by actual collection of money.</p>
            <p>If you receive a judgment, default judgment, stipulated judgment, settlement agreement, payment agreement, property-return agreement, dismissal after settlement, claim reduction, claim waiver, or other favorable result, the success fee may be charged even if the opposing party has not yet paid you.</p>
            <p>Collection of a judgment, settlement, or payment agreement is a separate process. Unless your selected plan expressly states otherwise, Small Claims Genie's pay-only-if-you-win plan does not include collection services.</p>
          </Section>

          <Section num="6" title="Required Outcome Documentation">
            <p>You agree to notify Small Claims Genie of the outcome or status of your case and submit documentation within ten (10) calendar days after any judgment, settlement, dismissal, stipulation, payment agreement, hearing result, private resolution, continuance, postponement, appeal, vacated judgment, or other case outcome or status event.</p>
            <p>Acceptable documentation may include, without limitation: Notice of Entry of Judgment; court judgment form; court minute order; default judgment; stipulated judgment; settlement agreement; signed payment agreement; dismissal or withdrawal filed after settlement or agreement; written communication from the opposing party confirming settlement, payment, agreement, dismissal, waiver, reduction, property return, or resolution; proof that the opposing party agreed to pay, return property, cancel a debt, reduce a debt, or provide other value; or other documentation reasonably demonstrating the case outcome or status.</p>
            <p>Small Claims Genie may request additional documentation if the submitted materials are incomplete, unclear, inconsistent, illegible, or insufficient to verify the case outcome.</p>
          </Section>

          <Section num="7" title="Customer Duty to Report Accurately">
            <p>You agree to truthfully, accurately, and promptly report the outcome and current status of your case.</p>
            <p>This duty applies to all outcomes and case-status events, including court judgments, default judgments, stipulated judgments, settlements, private agreements, payment agreements, dismissals after settlement, pre-hearing resolutions, continuances, postponements, appeals, vacated judgments, unresolved matters, and any other result or status reached inside or outside of court.</p>
            <p>You may not avoid the success fee by settling privately, dismissing the case after receiving an agreement, failing to disclose a settlement, payment agreement, claim waiver, claim reduction, or property-return agreement, delaying notice to Small Claims Genie, failing to provide outcome documents, failing to respond to reasonable verification requests, claiming no fee is owed because payment has not yet been collected, mischaracterizing a favorable result, or otherwise attempting to circumvent these Payment Terms.</p>
          </Section>

          <Section num="8" title="Authorization to Store and Charge Payment Method">
            <p>By selecting a plan, entering payment information, and completing checkout, you expressly authorize Small Claims Genie and its payment processor to securely store your payment method and charge the amounts disclosed at checkout as described in these Payment Terms.</p>
            <p>You authorize Small Claims Genie and its payment processor to charge any selected paralegal support charge according to the checkout terms, regardless of whether you win or lose the case.</p>
            <p>You authorize Small Claims Genie and its payment processor to charge the stated success fee if: (a) your case results in a Favorable Case Outcome; (b) you submit documentation showing a Favorable Case Outcome; (c) Small Claims Genie verifies a Favorable Case Outcome through court records, customer-submitted documents, opposing-party communications, payment records, public records, docket records, account activity, or other reasonably available information; or (d) you fail to submit required outcome documentation by the applicable deadline.</p>
            <p>This authorization applies to future charges that may occur after initial checkout, including charges made when you are not actively using the website or app, provided that a payment-triggering event has occurred under these Payment Terms. This authorization remains in effect until your case outcome has been reported, verified, and all applicable charges have been paid, waived, refunded, or determined not to be owed.</p>
          </Section>

          <Section num="9" title="Separate Checkout Acknowledgments">
            <p>Small Claims Genie may require separate affirmative acknowledgments before checkout is completed.</p>
            <SubHeading>Paralegal Support Acknowledgment</SubHeading>
            <p>"I understand that paralegal support is separate from the success fee and is owed whether I win or lose, if I select paralegal support. Paralegal support does not include legal advice, legal representation, court appearance, attorney-client representation, or a guarantee of outcome."</p>
            <SubHeading>Success Fee Authorization</SubHeading>
            <p>"I authorize Small Claims Genie and its payment processor to securely store my payment method and charge the stated success fee if my case results in a Favorable Case Outcome or if I fail to submit required case outcome documentation by the deadline stated in the Payment Terms. I understand that the success fee is based on the case outcome, not collection of money."</p>
            <p>By checking the required boxes, selecting a plan, entering payment information, and completing checkout, you provide express written authorization for Small Claims Genie and its payment processor to store your payment method and charge the amounts described in these Payment Terms.</p>
          </Section>

          <Section num="10" title="Failure to Submit Outcome Documentation">
            <p>If you do not submit required outcome documentation within ten (10) calendar days after the case outcome or status event, or if you do not respond to Small Claims Genie's reasonable requests for outcome verification, Small Claims Genie may treat the matter as having resulted in a Favorable Case Outcome and may charge the agreed success fee to your stored payment method.</p>
            <p>Failure to submit required documentation by the stated deadline may create a rebuttable presumption, for payment purposes only, that a Favorable Case Outcome occurred. You may rebut that presumption by submitting documentation showing that the case was lost, dismissed without settlement or benefit, withdrawn without agreement, payment, waiver, reduction, property return, or other value, continued, postponed, appealed, vacated, still pending, resolved entirely against you, or otherwise did not result in a Favorable Case Outcome.</p>
            <p>If you later provide documentation showing that no Favorable Case Outcome occurred, Small Claims Genie will review the documentation under the Incorrect Charge Review process described below.</p>
          </Section>

          <Section num="11" title="Pre-Charge Notice and Reminder Process">
            <p>Before charging a success fee based on failure to submit required outcome documentation, Small Claims Genie may send one or more reminders by email, text message, in-app notice, account notice, or other reasonable communication method.</p>
            <p>Small Claims Genie may also send a final pre-charge notice identifying the success fee amount to be charged, the reason the charge may be made, the deadline to submit documentation showing that no Favorable Case Outcome occurred or that the case is still pending, and the method for submitting documentation or contacting Small Claims Genie.</p>
            <p>If you do not submit documentation or respond by the deadline stated in the pre-charge notice, Small Claims Genie may charge the success fee under your prior authorization.</p>
          </Section>

          <Section num="12" title="Good-Faith Review Before Charge">
            <p>Before charging a success fee based on failure to submit documentation, Small Claims Genie may conduct a good-faith review of available information, including account records, user activity, submitted case information, court records, docket information, notices, communications, and other reasonably available materials.</p>
            <p>Small Claims Genie may delay, waive, or cancel the success fee if available information shows that the case did not result in a Favorable Case Outcome, remains pending, was continued, was postponed, was vacated, or otherwise does not yet support charging the success fee.</p>
            <p>Nothing in this section limits Small Claims Genie's right to charge a paralegal support charge or other non-success-fee charge that is owed regardless of outcome, or to charge the success fee if a payment-triggering event has occurred under these Payment Terms.</p>
          </Section>

          <Section num="13" title="Pending, Continued, Postponed, Appealed, or Vacated Cases">
            <p>If your case is continued, postponed, appealed, vacated, unresolved, or otherwise remains pending, you must notify Small Claims Genie and provide documentation or a written explanation before the outcome documentation deadline.</p>
            <p>If Small Claims Genie determines that no final or operative case outcome has occurred, Small Claims Genie may defer the success fee until the case results in a Favorable Case Outcome or another payment-triggering event occurs under these Payment Terms.</p>
            <p>You remain responsible for promptly updating Small Claims Genie when a final or operative outcome occurs.</p>
          </Section>

          <Section num="14" title="Private Settlements and Pre-Hearing Resolutions">
            <p>The success fee applies even if the case is resolved without a court hearing.</p>
            <p>A Favorable Case Outcome includes private settlements, pre-hearing settlements, payment agreements, informal agreements, written promises to pay, property-return agreements, repair agreements, replacement agreements, claim reductions, claim waivers, dismissals after agreement, or any other resolution that provides some or all of the relief sought in connection with the matter.</p>
            <p>You agree that resolving the matter privately, before a hearing, or outside the courtroom does not eliminate your obligation to pay the success fee if the result is materially in your favor.</p>
          </Section>

          <Section num="15" title="Verification Rights">
            <p>You authorize Small Claims Genie to verify the case outcome and case status using customer-submitted documents, court records, public docket information, judgment records, settlement communications, payment communications, opposing-party communications, account activity, user-provided case information, and other reasonably available information.</p>
            <p>You agree to cooperate with reasonable verification requests, including requests for case number, court name, hearing date, judgment documents, settlement documents, dismissal documents, payment-agreement documents, or other outcome-related materials.</p>
            <p>Small Claims Genie is not required to independently monitor every case. You remain responsible for reporting the case outcome and submitting documentation by the deadline required by these Payment Terms.</p>
          </Section>

          <Section num="16" title="Payment Method Responsibility">
            <p>You agree to keep a valid payment method on file until your case outcome has been reported, verified, and all applicable charges have been paid, waived, refunded, or determined not to be owed.</p>
            <p>If your payment method is declined, expired, canceled, unavailable, or otherwise invalid, you authorize Small Claims Genie to request updated payment information and to charge any replacement payment method you provide.</p>
            <p>Failure to maintain a valid payment method does not cancel your payment obligation if any paralegal support charge, success fee, or other disclosed charge is owed under these Payment Terms.</p>
          </Section>

          <Section num="17" title="Authorization Records and Payment Dispute Evidence">
            <p>You agree that Small Claims Genie may create, retain, and use records relating to your payment authorization, account activity, selected plan, selected case type, selected support options, case status, and case outcome.</p>
            <p>These records may include, without limitation: your name and account information; selected plan; selected case type; selected support options; paralegal support selection and amount; stated success fee amount; checkout page records; payment authorization records; consent checkbox records; IP address; device, browser, and session information; date and time stamps; Terms version accepted; payment processor records; email notices; in-app notices; uploaded documents; customer communications; case number, court name, hearing date, and case-status information; court records; pre-charge notices; charge records; and post-charge communications or dispute records.</p>
            <p>You agree that Small Claims Genie may submit these records to its payment processor, acquiring bank, card network, issuing bank, payment dispute provider, fraud-prevention provider, legal advisor, or other appropriate entity in response to any chargeback, payment dispute, fraud claim, unauthorized-charge claim, services-not-as-described claim, or similar challenge.</p>
          </Section>

          <Section num="18" title="Incorrect Charge Review">
            <p>If you believe Small Claims Genie charged your payment method incorrectly, you must notify Small Claims Genie in writing within fourteen (14) calendar days after the charge and provide documentation supporting your position.</p>
            <p>Small Claims Genie will review the documentation in good faith.</p>
            <p>If the documentation shows that no Favorable Case Outcome occurred and that the success fee was not otherwise authorized under these Payment Terms, Small Claims Genie will refund the success fee.</p>
            <p>If the documentation shows that a Favorable Case Outcome occurred, the success fee charge will remain valid even if you have not collected payment from the opposing party.</p>
            <p>A success-fee refund determination does not automatically require a refund of any separate paralegal support charge, document-preparation charge, platform charge, or other non-success-fee charge that was owed regardless of outcome.</p>
          </Section>

          <Section num="19" title="Chargebacks, Payment Disputes, and Misrepresentation">
            <p>If you dispute a valid charge after authorizing payment, receiving paralegal support, selecting a paid support option, or receiving a Favorable Case Outcome, Small Claims Genie may rely on these Payment Terms, your selected plan, your payment authorization, court records, submitted documents, public records, communications, and account records to respond to the dispute.</p>
            <p>Providing false, misleading, incomplete, delayed, or inaccurate information about the outcome or status of your case may result in suspension or termination of your account and may affect your eligibility for future services.</p>
            <p>Small Claims Genie reserves the right to pursue any amounts owed under these Payment Terms to the fullest extent permitted by law.</p>
          </Section>

          <Section num="20" title="No Guarantee; No Legal Representation">
            <p>Small Claims Genie does not guarantee that you will win, settle, collect money, obtain a judgment, obtain payment, or receive any particular case result.</p>
            <p>Unless expressly stated in a separate written agreement, Small Claims Genie is not a law firm, does not act as your attorney, does not create an attorney-client relationship, does not provide legal representation, and does not appear in court for you.</p>
            <p>You are responsible for reviewing your documents, verifying the accuracy of all information, meeting court deadlines, filing required papers, serving required documents, attending hearings, and deciding how to proceed in your case.</p>
          </Section>

        </div>
      </section>
    </div>
  );
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-bold text-primary mb-3 pb-2 border-b border-gray-100">
        {num}. {title}
      </h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="font-semibold text-primary/80 mt-4 mb-1">{children}</p>;
}
