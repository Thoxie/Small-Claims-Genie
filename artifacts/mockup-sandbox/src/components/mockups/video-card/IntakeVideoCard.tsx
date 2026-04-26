import { useState, useRef } from "react";
import { Play, X, BookOpen, ChevronRight } from "lucide-react";

function VideoTutorialCard({ onExpand }: { onExpand: () => void }) {
  return (
    <div
      onClick={onExpand}
      className="cursor-pointer group flex-shrink-0 w-[240px] rounded-xl overflow-hidden border-2 border-[#14b8a6] shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
      title="Watch the tutorial for this step"
    >
      {/* Video thumbnail area */}
      <div className="relative bg-[#0f2537] h-[132px] flex items-center justify-center">
        {/* Genie logo watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <BookOpen className="w-20 h-20 text-white" />
        </div>
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6]/30 via-transparent to-[#0f2537]" />
        {/* Play button */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-[#14b8a6] flex items-center justify-center shadow-lg group-hover:bg-[#0d9488] transition-colors">
            <Play className="w-6 h-6 text-white ml-1" fill="white" />
          </div>
          <span className="text-white text-xs font-semibold opacity-90">Watch Tutorial</span>
        </div>
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
          ~3 min
        </div>
        {/* Step badge */}
        <div className="absolute top-2 left-2 bg-[#14b8a6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          Step 1
        </div>
      </div>
      {/* Card footer */}
      <div className="bg-white px-3 py-2 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-800">Entering the Parties</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Who is suing whom?</p>
        </div>
        <ChevronRight className="w-4 h-4 text-[#14b8a6] shrink-0" />
      </div>
    </div>
  );
}

function VideoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-white rounded-2xl shadow-2xl overflow-hidden w-[720px] max-w-[95vw]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-[#f8fffe]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#14b8a6] flex items-center justify-center">
              <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Step 1 Tutorial — Entering the Parties</p>
              <p className="text-[10px] text-gray-500">Small Claims Genie Training Video</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Video player */}
        <div className="bg-black aspect-video">
          <video
            className="w-full h-full"
            controls
            autoPlay
            src="/intake-step1-tutorial.mp4"
          />
        </div>
        {/* Modal footer */}
        <div className="px-5 py-3 bg-[#f0fdf9] border-t flex items-center justify-between">
          <p className="text-xs text-gray-600">
            After watching, fill in your plaintiff and defendant information below.
          </p>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-[#14b8a6] hover:text-[#0d9488] transition-colors"
          >
            Close & Start Filling
          </button>
        </div>
      </div>
    </div>
  );
}

export function IntakeVideoCard() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Simulated workspace nav (trimmed) ── */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#0f2537] flex items-center justify-center">
            <span className="text-white text-[10px] font-black">SCG</span>
          </div>
          <span className="text-xs font-bold text-gray-500">Small Claims Genie</span>
        </div>
        <div className="flex items-center gap-1 ml-4">
          {["Tell Your Story", "My Evidence", "Ask Genie AI", "Send a Demand", "Create Court Forms"].map((label, i) => (
            <div key={i} className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold ${i === 0 ? "bg-[#1e293b] text-white" : "text-gray-400"}`}>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Step indicator ── */}
      <div className="flex items-center gap-0 p-1.5 bg-gray-100 mx-6 mt-4 rounded-xl">
        {[
          { n: 1, label: "The Parties", active: true },
          { n: 2, label: "What Happened", active: false },
          { n: 3, label: "Your Claim", active: false },
          { n: 4, label: "Review & File", active: false },
        ].map((step, idx) => (
          <div key={step.n} className="flex items-center flex-1">
            {idx > 0 && <div className="h-0.5 w-2 shrink-0 bg-gray-300 mx-0.5 rounded-full" />}
            <div className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg ${step.active ? "bg-[#14b8a6] border-2 border-black text-white shadow-md" : "text-gray-400"}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${step.active ? "bg-white text-[#14b8a6]" : "bg-gray-200 text-gray-500"}`}>
                {step.n}
              </span>
              <span className={`text-xs font-bold hidden sm:block ${step.active ? "text-white" : ""}`}>{step.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main content ── */}
      <div className="px-6 pt-5 pb-8 max-w-4xl">

        {/* ── Header row: title LEFT, video card RIGHT ── */}
        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#14b8a6] text-white flex items-center justify-center text-sm font-black shrink-0">1</span>
              The Parties
            </h2>
            <p className="text-sm text-gray-500 mt-1 ml-9">
              Enter the full legal name and contact details for both you (plaintiff) and the person or business you're suing (defendant).
            </p>
          </div>

          {/* ── VIDEO CARD — top right ── */}
          <VideoTutorialCard onExpand={() => setModalOpen(true)} />
        </div>

        {/* ── Plaintiff section ── */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-2">Plaintiff (You)</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Full Legal Name *", placeholder: "Jane Smith" },
              { label: "Phone Number", placeholder: "(555) 123-4567" },
              { label: "Street Address *", placeholder: "123 Main St" },
              { label: "City *", placeholder: "Los Angeles" },
            ].map(({ label, placeholder }) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50" placeholder={placeholder} readOnly />
              </div>
            ))}
          </div>
        </div>

        {/* ── Defendant section ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-2">Defendant (Who You're Suing)</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Full Legal Name *", placeholder: "John Doe" },
              { label: "Phone Number", placeholder: "(555) 987-6543" },
              { label: "Street Address *", placeholder: "456 Oak Ave" },
              { label: "City *", placeholder: "Los Angeles" },
            ].map(({ label, placeholder }) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50" placeholder={placeholder} readOnly />
              </div>
            ))}
          </div>
        </div>

        {/* ── Nav buttons ── */}
        <div className="flex justify-between items-center">
          <button className="text-sm text-gray-400 font-semibold px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            Save & Exit
          </button>
          <button className="text-sm font-bold px-6 py-2 rounded-lg bg-[#14b8a6] text-white border-2 border-black shadow hover:bg-[#0d9488] transition-colors">
            Next: What Happened →
          </button>
        </div>
      </div>

      {/* ── Video modal ── */}
      {modalOpen && <VideoModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
