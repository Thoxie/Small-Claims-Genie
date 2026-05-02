export default function Download() {
  return (
    <div className="min-h-screen bg-[#f0faf8] flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl shadow-lg border border-[#14b8a6]/40 p-10 flex flex-col items-center gap-6 max-w-md w-full text-center">
        <div className="text-5xl">📦</div>
        <div>
          <h1 className="text-2xl font-black text-[#0d6b5e] mb-2">Source Code Download</h1>
          <p className="text-sm text-gray-500">Complete project source — all code, configs, and assets (22 MB zip)</p>
        </div>
        <a
          href="/small-claims-genie-source.zip"
          download
          className="flex items-center justify-center gap-2 w-full rounded-full bg-[#0d6b5e] hover:bg-[#0a5a4f] text-white text-[16px] font-black min-h-[56px] px-6 shadow transition-colors no-underline"
        >
          ⬇ Download small-claims-genie-source.zip
        </a>
        <p className="text-xs text-gray-400">Click the button above — your browser will save the file automatically.</p>
      </div>
    </div>
  );
}
