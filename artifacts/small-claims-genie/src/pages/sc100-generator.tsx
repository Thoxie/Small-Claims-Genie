import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Case {
  id: number;
  title: string;
  plaintiffName: string | null;
  defendantName: string | null;
  claimAmount: number | null;
  claimType: string | null;
  claimDescription: string | null;
  incidentDate: string | null;
  countyId: string | null;
  intakeComplete: boolean;
  readinessScore: number | null;
  plaintiffAddress: string | null;
  plaintiffCity: string | null;
  plaintiffState: string | null;
  plaintiffZip: string | null;
  plaintiffPhone: string | null;
  plaintiffEmail: string | null;
  defendantAddress: string | null;
  defendantCity: string | null;
  defendantState: string | null;
  defendantZip: string | null;
  defendantPhone: string | null;
  defendantIsBusinessOrEntity: boolean | null;
  defendantAgentName: string | null;
  howAmountCalculated: string | null;
  priorDemandMade: boolean | null;
  priorDemandDescription: string | null;
  venueReason: string | null;
  venueBasis: string | null;
  isSuingPublicEntity: boolean | null;
  isAttyFeeDispute: boolean | null;
  filedMoreThan12Claims: boolean | null;
  claimOver2500: boolean | null;
}

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-semibold text-gray-500 w-48 shrink-0">{label}</span>
      <span className="text-xs text-gray-800">{value || <span className="text-gray-400 italic">Not provided</span>}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="bg-[#ddf6f3] px-3 py-1.5 rounded-t border-l-4 border-teal-500 mb-0">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="border border-t-0 border-gray-200 rounded-b px-3 py-1">
        {children}
      </div>
    </div>
  );
}

export default function SC100Generator() {
  const [downloading, setDownloading] = useState(false);

  const { data: cases, isLoading } = useQuery<Case[]>({
    queryKey: ["cases"],
    queryFn: () => fetch(`${API}/api/cases`).then(r => r.json()),
  });

  const selectedCase = cases?.find(c => c.intakeComplete) ?? cases?.[0];

  const handleDownloadWord = async () => {
    if (!selectedCase) return;
    setDownloading(true);
    try {
      const res = await fetch(`${API}/api/cases/${selectedCase.id}/forms/sc100-word`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SC100-Case-${selectedCase.id}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedCase) return;
    const res = await fetch(`${API}/api/cases/${selectedCase.id}/forms/sc100`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SC100-Case-${selectedCase.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!selectedCase) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">No Cases Found</h2>
        <p className="text-gray-500">Start a case first to generate your SC-100.</p>
      </div>
    );
  }

  const county = selectedCase.countyId?.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) ?? "";
  const plaintiffAddr = [selectedCase.plaintiffAddress, selectedCase.plaintiffCity, selectedCase.plaintiffState, selectedCase.plaintiffZip].filter(Boolean).join(", ");
  const defendantAddr = [selectedCase.defendantAddress, selectedCase.defendantCity, selectedCase.defendantState, selectedCase.defendantZip].filter(Boolean).join(", ");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-7 w-7 text-teal-600" />
          <h1 className="text-2xl font-bold text-gray-900">SC-100 Form Generator</h1>
          <Badge variant="outline" className="text-teal-700 border-teal-400 bg-[#ddf6f3]">
            Case #{selectedCase.id}
          </Badge>
        </div>
        <p className="text-gray-500 text-sm">
          Review the information below — this is exactly what will appear on your SC-100. Download as Word to edit, or PDF to print and file.
        </p>
      </div>

      {/* Download buttons */}
      <Card className="mb-8 border-2 border-[#ddf6f3]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Download Your SC-100</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            onClick={handleDownloadWord}
            disabled={downloading}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Download as Word (.docx)
          </Button>
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            className="border-2 border-gray-300 gap-2"
          >
            <FileDown className="h-4 w-4" />
            Download as PDF
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            {selectedCase.readinessScore != null && (
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle className={`h-4 w-4 ${selectedCase.readinessScore >= 80 ? "text-green-500" : "text-amber-500"}`} />
                <span className="font-medium">Readiness: {selectedCase.readinessScore}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form preview */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <div className="text-center mb-6 pb-4 border-b-2 border-gray-200">
          <p className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-1">Judicial Council of California</p>
          <h2 className="text-lg font-bold text-gray-900">SC-100 — Plaintiff's Claim and Order to Go to Small Claims Court</h2>
          <p className="text-xs text-gray-400 mt-1">Preview only — review before filing</p>
        </div>

        <Section title="Court Information">
          <FieldRow label="County" value={county} />
          <FieldRow label="Court" value={county ? `${county} County Superior Court — Small Claims Division` : null} />
        </Section>

        <Section title="Plaintiff (You)">
          <FieldRow label="Full Name" value={selectedCase.plaintiffName} />
          <FieldRow label="Phone" value={selectedCase.plaintiffPhone} />
          <FieldRow label="Email" value={selectedCase.plaintiffEmail} />
          <FieldRow label="Address" value={plaintiffAddr} />
        </Section>

        <Section title="Defendant (Who You Are Suing)">
          <FieldRow label="Full Name / Business" value={selectedCase.defendantName} />
          <FieldRow label="Phone" value={selectedCase.defendantPhone} />
          <FieldRow label="Address" value={defendantAddr} />
          <FieldRow label="Is Business/Entity?" value={selectedCase.defendantIsBusinessOrEntity ? "Yes" : "No"} />
          {selectedCase.defendantIsBusinessOrEntity && (
            <FieldRow label="Agent for Service" value={selectedCase.defendantAgentName} />
          )}
        </Section>

        <Section title="Claim Details">
          <FieldRow label="Type of Claim" value={selectedCase.claimType} />
          <FieldRow label="Date of Incident" value={selectedCase.incidentDate} />
          <FieldRow label="Amount Claimed" value={selectedCase.claimAmount ? `$${selectedCase.claimAmount.toFixed(2)}` : null} />
          <FieldRow label="Claim Over $2,500?" value={selectedCase.claimOver2500 ? "Yes" : "No"} />
          <FieldRow label="Description" value={selectedCase.claimDescription} />
        </Section>

        <Section title="How Amount Was Calculated">
          <FieldRow label="Calculation" value={selectedCase.howAmountCalculated} />
        </Section>

        <Section title="Prior Demand">
          <FieldRow label="Demand Made?" value={selectedCase.priorDemandMade === true ? "Yes" : selectedCase.priorDemandMade === false ? "No" : null} />
          <FieldRow label="Details" value={selectedCase.priorDemandDescription} />
        </Section>

        <Section title="Venue">
          <FieldRow label="Basis" value={selectedCase.venueBasis} />
          <FieldRow label="Reason" value={selectedCase.venueReason} />
        </Section>

        <Section title="Additional Disclosures">
          <FieldRow label="Suing a Public Entity?" value={selectedCase.isSuingPublicEntity ? "Yes" : "No"} />
          <FieldRow label="Attorney Fee Dispute?" value={selectedCase.isAttyFeeDispute ? "Yes" : "No"} />
          <FieldRow label="Filed 12+ Claims This Year?" value={selectedCase.filedMoreThan12Claims ? "Yes" : "No"} />
        </Section>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 italic text-center">
            I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.
          </p>
          <div className="flex gap-12 mt-4 px-8">
            <div className="flex-1 border-b border-gray-300 pb-1">
              <p className="text-xs text-gray-400 mt-1">Date</p>
            </div>
            <div className="flex-1 border-b border-gray-300 pb-1">
              <p className="text-xs text-gray-400 mt-1">Plaintiff Signature</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mt-4 italic">
        Small Claims Genie is not a law firm. This is not legal advice. Review all information carefully before filing.
      </p>
    </div>
  );
}
