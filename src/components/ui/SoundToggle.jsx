import { useState, useRef, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { useSound } from "../../context/SoundContext";

export default function SoundToggle() {
  const { muted, toggleMute, volume, setVolume } = useSound();
  const [showSlider, setShowSlider] = useState(false);
  const popoverRef = useRef(null);
  const btnRef = useRef(null);

  // Close popover on outside click
  useEffect(() => {
    if (!showSlider) return;
    const handler = (e) => {
      if (
        !popoverRef.current?.contains(e.target) &&
        !btnRef.current?.contains(e.target)
      ) {
        setShowSlider(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showSlider]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setShowSlider((v) => !v)}
        className={`sidebar-icon-btn ${muted ? "text-red-400" : ""}`}
        title={muted ? "Sound off" : "Sound on"}
      >
        {muted ? (
          <BellOff size={15} strokeWidth={2.5} />
        ) : (
          <Bell size={15} strokeWidth={2.5} />
        )}
      </button>

      {showSlider && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 z-50 w-48 p-3 rounded-2xl
                     bg-[var(--bg-secondary)] border border-[var(--border)]
                     shadow-xl animate-bounce-in"
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Sound
            </span>
            <button
              onClick={() => {
                toggleMute();
                setShowSlider(false);
              }}
              className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                muted
                  ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                  : "bg-brand-500/15 text-brand-500 hover:bg-brand-500/25"
              }`}
            >
              {muted ? "Unmute" : "Mute"}
            </button>
          </div>

          {/* Volume label + value */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-[var(--text-muted)]">Volume</span>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              {muted ? "—" : `${Math.round(volume * 100)}%`}
            </span>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            disabled={muted}
            className="w-full h-1.5 accent-[var(--brand)] rounded-full cursor-pointer
                       disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>
      )}
    </div>
  );
}
