import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import promoImage from "@/assets/BOGO_OFFER.jpeg";

const STORAGE_KEY = "promo_popup_dismissed";

const PromoPopup = () => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    sessionStorage.setItem(STORAGE_KEY, "1");
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText("BOGO");
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = "BOGO";
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => close(), 1200);
  }, [close]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) close();
    },
    [close]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
      style={{ animation: "fadeIn .3s ease" }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(.95) } to { opacity: 1; transform: scale(1) } }
        @keyframes popIn { from { opacity: 0; transform: scale(.9) } to { opacity: 1; transform: scale(1) } }
      `}</style>

      <div
        className="relative w-full max-w-md"
        style={{ animation: "zoomIn .3s ease" }}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute -top-3 -right-3 z-10 rounded-full p-1.5 transition-colors"
          style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Clickable image */}
        <button
          onClick={handleCopy}
          className="block w-full rounded-2xl overflow-hidden cursor-pointer focus:outline-none"
          style={{
            boxShadow: "0 25px 50px -12px rgba(0, 191, 255, 0.2)",
            border: "1px solid rgba(255,255,255,0.1)",
            transition: "all .2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.border = "1px solid rgba(0,191,255,0.4)";
            e.currentTarget.style.transform = "scale(1.01)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <img
            src={promoImage}
            alt="BOGO Offer — Buy 1 Account Get 1 Free, Use code BOGO +25% OFF"
            className="w-full h-auto block"
            draggable={false}
          />
        </button>

        {/* Copied toast */}
        {copied && (
          <div
            className="absolute bottom-4 left-1/2 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg whitespace-nowrap"
            style={{
              transform: "translateX(-50%)",
              background: "#10b981",
              animation: "popIn .2s ease",
            }}
          >
            BOGO copied!
          </div>
        )}

        {/* Hint text */}
        {!copied && (
          <p className="text-center text-xs mt-3 select-none" style={{ color: "rgba(255,255,255,0.5)" }}>
            Tap the image to copy discount code
          </p>
        )}
      </div>
    </div>
  );
};

export default PromoPopup;
