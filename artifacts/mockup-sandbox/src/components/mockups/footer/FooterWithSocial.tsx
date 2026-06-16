export function FooterWithSocial() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1" />
      <footer className="w-full border-t py-4" style={{ backgroundColor: "#ddf6f3" }}>
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">

            {/* Copyright */}
            <span className="text-xs text-primary/50">
              © {new Date().getFullYear()} Small Claims Genie. All rights reserved.
            </span>

            {/* Social media */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-primary/60">Follow us:</span>

              {/* Instagram */}
              <a
                href="https://instagram.com/Small.Claims.Genie"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex items-center justify-center w-8 h-8 rounded-full transition-opacity hover:opacity-80"
                style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}
              >
                <svg viewBox="0 0 24 24" fill="white" width="15" height="15">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="https://tiktok.com/@smallclaimscourtgenie"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-black transition-opacity hover:opacity-80"
              >
                <svg viewBox="0 0 24 24" fill="white" width="15" height="15">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.75a4.85 4.85 0 01-1.02-.06z"/>
                </svg>
              </a>

              {/* YouTube */}
              <a
                href="https://youtube.com/@smallclaimsgenieAI"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FF0000] transition-opacity hover:opacity-80"
              >
                <svg viewBox="0 0 24 24" fill="white" width="15" height="15">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>

            {/* Links */}
            <div className="flex items-center gap-3">
              <a href="/terms" className="text-xs text-primary/50 hover:text-primary underline underline-offset-2 transition-colors">
                Terms of Service
              </a>
              <a href="/payment-terms" className="text-xs text-primary/50 hover:text-primary underline underline-offset-2 transition-colors">
                Payment Terms
              </a>
              <a href="/contact" className="text-xs text-primary/50 hover:text-primary underline underline-offset-2 transition-colors">
                Contact
              </a>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}
