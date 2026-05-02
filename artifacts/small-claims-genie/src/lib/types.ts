import type { Case, County, Document } from "@workspace/api-client-react";

export type { Case, County, Document };

export interface Courthouse {
  id: string;
  name: string;
  address: string;
  city: string;
  zip: string;
  phone?: string;
}

export interface ExtendedCounty extends County {
  clerkEmail?: string;
  courthouses?: Courthouse[];
}

export interface ExtendedCase extends Case {
  caseNumber?: string;
  hearingDate?: string;
  hearingTime?: string;
  hearingJudge?: string;
  hearingCourtroom?: string;
  hearingNotes?: string;
  filingFee?: number;
  evidenceChecklist?: { id: string; item: string; description: string; checked?: boolean }[];
  demandLetterText?: string;
  mc030DeclarationTitle?: string;
}

export interface DocumentWithMeta extends Document {
  description?: string;
}

export interface SpeechRecognitionResult {
  readonly length: number;
  [index: number]: { transcript: string; confidence: number };
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

export interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

export interface SpeechRecognitionWindow {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}
