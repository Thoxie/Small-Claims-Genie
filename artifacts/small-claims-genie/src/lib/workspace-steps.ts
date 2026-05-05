import { CalendarDays } from "lucide-react";

export const WORKSPACE_STEPS = [
  { n: 1, label: "Enter The\nParties",  tab: "intake",        icon: null        },
  { n: 2, label: "Make Your\nClaim",    tab: "intake",        icon: null        },
  { n: 3, label: "Upload My\nEvidence", tab: "documents",     icon: null        },
  { n: 4, label: "Send Demand\nLetter", tab: "demand-letter", icon: null        },
  { n: 5, label: "AI Genie\nCase Review", tab: "chat",          icon: null        },
  { n: 6, label: "Create Court\nForms", tab: "forms",         icon: null        },
  { n: 7, label: "Prep for\nHearing",   tab: "prep",          icon: null        },
  { n: 8, label: "Deadlines",           tab: "deadlines",     icon: CalendarDays },
] as const;

export const WORKSPACE_TABS = WORKSPACE_STEPS.map((s) => ({
  value: s.tab,
  label: s.label,
}));

export type WorkspaceTab = (typeof WORKSPACE_STEPS)[number]["tab"];
