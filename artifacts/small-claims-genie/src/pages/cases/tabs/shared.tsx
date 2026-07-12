import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { z } from "zod";

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatZip(value: string): string {
  return value.replace(/\D/g, "").slice(0, 5);
}

export function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function DatePicker({ value, onChange, placeholder = "Select date", disableFuture = false }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disableFuture?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const date = (() => {
    if (!value) return undefined;
    const d = new Date(value);
    return !isNaN(d.getTime()) ? d : undefined;
  })();

  const handleSelect = (d: Date | undefined) => {
    if (d) {
      onChange(format(d, "MM/dd/yyyy"));
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`w-full justify-start text-left font-normal ${!date ? "text-muted-foreground" : ""}`}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {date ? format(date, "MMM d, yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={disableFuture ? (d) => d > new Date() : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export function DateRangePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(() => {
    if (!value) return undefined;
    const parts = value.split(" – ");
    const from = parts[0] ? new Date(parts[0]) : undefined;
    const to = parts[1] ? new Date(parts[1]) : undefined;
    return from && !isNaN(from.getTime()) ? { from, to: to && !isNaN(to.getTime()) ? to : undefined } : undefined;
  });

  const handleSelect = (r: DateRange | undefined) => {
    setRange(r);
    if (r?.from && r?.to) {
      onChange(`${format(r.from, "MM/dd/yyyy")} – ${format(r.to, "MM/dd/yyyy")}`);
      setOpen(false);
    } else if (r?.from && !r?.to) {
      onChange(format(r.from, "MM/dd/yyyy"));
    }
  };

  const label = range?.from
    ? range.to
      ? `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`
      : format(range.from, "MMM d, yyyy")
    : "Select date or date range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-start text-left font-normal ${!range?.from ? "text-muted-foreground" : ""}`}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={2}
          disabled={(date) => date > new Date()}
        />
      </PopoverContent>
    </Popover>
  );
}

export const intakeStep1Schema = z.object({
  countyId: z.string().min(1, "County is required"),
  courthouseId: z.string().optional(),
  plaintiffName: z.string().min(2, "Name is required"),
  plaintiffIsBusiness: z.boolean().default(false),
  plaintiffIsFictitious: z.boolean().default(false),
  plaintiffDbaName: z.string().optional().or(z.literal("")),
  plaintiffDbaAddress: z.string().optional().or(z.literal("")),
  plaintiffDbaCity: z.string().optional().or(z.literal("")),
  plaintiffDbaState: z.string().optional().or(z.literal("")),
  plaintiffDbaZip: z.string().optional().or(z.literal("")),
  plaintiffDbaMailingAddress: z.string().optional().or(z.literal("")),
  plaintiffBusinessType: z.string().optional().or(z.literal("")),
  plaintiffBusinessTypeOther: z.string().optional().or(z.literal("")),
  plaintiffFbnNumber: z.string().optional().or(z.literal("")),
  plaintiffFbnExpiry: z.string().optional().or(z.literal("")),
  plaintiffFbnSignDate: z.string().optional().or(z.literal("")),
  plaintiffFbnCounty: z.string().optional().or(z.literal("")),
  secondPlaintiffName: z.string().optional().or(z.literal("")),
  plaintiffTitle: z.string().optional().or(z.literal("")),
  plaintiffPhone: z.string().min(10, "Phone is required"),
  plaintiffAddress: z.string().min(5, "Address is required"),
  plaintiffCity: z.string().min(2, "City is required"),
  plaintiffState: z.string().min(2, "State is required"),
  plaintiffZip: z.string().min(5, "ZIP is required"),
  plaintiffEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  plaintiffMailingAddress: z.string().optional().or(z.literal("")),
  plaintiffMailingCity: z.string().optional().or(z.literal("")),
  plaintiffMailingState: z.string().optional().or(z.literal("")),
  plaintiffMailingZip: z.string().optional().or(z.literal("")),
  secondPlaintiffPhone: z.string().optional().or(z.literal("")),
  secondPlaintiffAddress: z.string().optional().or(z.literal("")),
  secondPlaintiffCity: z.string().optional().or(z.literal("")),
  secondPlaintiffState: z.string().optional().or(z.literal("")),
  secondPlaintiffZip: z.string().optional().or(z.literal("")),
  secondPlaintiffEmail: z.string().optional().or(z.literal("")),
  secondPlaintiffMailingAddress: z.string().optional().or(z.literal("")),
  secondPlaintiffMailingCity: z.string().optional().or(z.literal("")),
  secondPlaintiffMailingState: z.string().optional().or(z.literal("")),
  secondPlaintiffMailingZip: z.string().optional().or(z.literal("")),
  hasAdditionalPlaintiff: z.boolean().default(false),
  additionalPlaintiffName: z.string().optional().or(z.literal("")),
  additionalPlaintiffIsFictitious: z.boolean().default(false),
  secondPlaintiffDbaName: z.string().optional().or(z.literal("")),
  secondPlaintiffDbaAddress: z.string().optional().or(z.literal("")),
  secondPlaintiffDbaCity: z.string().optional().or(z.literal("")),
  secondPlaintiffDbaState: z.string().optional().or(z.literal("")),
  secondPlaintiffDbaZip: z.string().optional().or(z.literal("")),
  secondPlaintiffDbaMailingAddress: z.string().optional().or(z.literal("")),
  secondPlaintiffBusinessType: z.string().optional().or(z.literal("")),
  secondPlaintiffBusinessTypeOther: z.string().optional().or(z.literal("")),
  secondPlaintiffFbnNumber: z.string().optional().or(z.literal("")),
  secondPlaintiffFbnExpiry: z.string().optional().or(z.literal("")),
  secondPlaintiffFbnSignDate: z.string().optional().or(z.literal("")),
  secondPlaintiffFbnCounty: z.string().optional().or(z.literal("")),
  secondPlaintiffTitle: z.string().optional().or(z.literal("")),
  moreThanTwoDefendants: z.boolean().default(false),
  defendantIsBusinessOrEntity: z.boolean().default(false),
  defendantName: z.string().min(2, "Defendant name is required"),
  defendantAgentName: z.string().optional(),
  defendantAgentTitle: z.string().optional().or(z.literal("")),
  defendantAgentStreet: z.string().optional().or(z.literal("")),
  defendantAgentCity: z.string().optional().or(z.literal("")),
  defendantAgentState: z.string().optional().or(z.literal("")),
  defendantAgentZip: z.string().optional().or(z.literal("")),
  defendantPhone: z.string().optional(),
  defendantAddress: z.string().min(5, "Address is required"),
  defendantCity: z.string().min(2, "City is required"),
  defendantState: z.string().min(2, "State is required"),
  defendantZip: z.string().min(5, "ZIP is required"),
  defendantMailingAddress: z.string().optional().or(z.literal("")),
  defendantMailingCity: z.string().optional().or(z.literal("")),
  defendantMailingState: z.string().optional().or(z.literal("")),
  defendantMailingZip: z.string().optional().or(z.literal("")),
});

export const intakeStep2Schema = z.object({
  claimType: z.string().min(1, "Claim type is required"),
  claimAmount: z.coerce.number().min(1, "Amount must be greater than 0"),
  claimDescription: z.string().min(10, "Please describe what happened"),
  incidentDate: z.string().min(1, "Date is required"),
  howAmountCalculated: z.string().min(5, "Please explain how you calculated the amount"),
  workDoneStartDate: z.string().optional().or(z.literal("")),
  workDoneEndDate: z.string().optional().or(z.literal("")),
  workDoneLaborMaterials: z.string().optional(),
  goodsSoldInterestStartDate: z.string().optional().or(z.literal("")),
  goodsSoldFirstSaleDate: z.string().optional().or(z.literal("")),
  goodsSoldLastSaleDate: z.string().optional().or(z.literal("")),
  goodsSoldGoodsAndPrices: z.string().optional(),
  autoCollisionLocation: z.string().optional().or(z.literal("")),
  autoHighwayName: z.string().optional().or(z.literal("")),
  autoCollisionCounty: z.string().optional().or(z.literal("")),
});

// Step 3 is now the Demand Letter tool — no form fields to validate.
export const intakeStep3Schema = z.object({});

export const intakeStep4Schema = z.object({
  priorDemandMade: z.boolean(),
  priorDemandDate: z.string().optional().or(z.literal("")),
  priorDemandMethod: z.string().optional().or(z.literal("")),
  priorDemandDescription: z.string().optional(),
  priorDemandWhyNot: z.string().optional().or(z.literal("")),
  venueBasis: z.string().min(1, "Please select a reason"),
  venueReason: z.string().optional(),
  isSuingPublicEntity: z.boolean(),
  publicEntityClaimFiledDate: z.string().optional(),
  isAttyFeeDispute: z.boolean(),
  hadArbitration: z.boolean(),
  filedMoreThan12Claims: z.boolean(),
  claimOver2500: z.boolean(),
});
