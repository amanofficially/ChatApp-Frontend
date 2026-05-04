import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

const SoundContext = createContext();

const SOUNDS = {
  message_sent: "/sounds/message_sent.mp3",
  notification: "/sounds/notification.mp3",
};

// Same key as ProfileMenu SettingsModal "Message Sounds" toggle
const STORAGE_SOUNDS_KEY = "cf-sounds";
const STORAGE_VOL_KEY = "cf-sound-volume";

// Helper — is sound enabled right now?
const isSoundEnabled = () =>
  localStorage.getItem(STORAGE_SOUNDS_KEY) !== "false";

export function SoundProvider({ children }) {
  // muted = true when cf-sounds === "false"
  const [muted, setMuted] = useState(() => !isSoundEnabled());

  const [volume, setVolumeState] = useState(() => {
    const v = parseFloat(localStorage.getItem(STORAGE_VOL_KEY));
    return isNaN(v) ? 0.7 : Math.min(1, Math.max(0, v));
  });

  const audioRefs = useRef({});
  const unlockedRef = useRef(false);

  // ── Pre-load sounds ──────────────────────────────────────────
  useEffect(() => {
    Object.entries(SOUNDS).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = muted ? 0 : volume;
      audioRefs.current[key] = audio;
    });

    // Unlock audio on first user interaction (mobile autoplay policy)
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      Object.values(audioRefs.current).forEach((a) => {
        a.play()
          .then(() => a.pause())
          .catch(() => {});
        a.currentTime = 0;
      });
    };

    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("mousedown", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });

    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("mousedown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Watch localStorage for Settings modal changes ────────────
  // Settings modal writes directly to localStorage without going through
  // SoundContext, so we listen for storage events + poll on focus.
  useEffect(() => {
    const sync = () => {
      const shouldMute = !isSoundEnabled();
      setMuted(shouldMute);
    };

    // Cross-tab: storage event fires when another tab changes the key
    window.addEventListener("storage", sync);
    // Same-tab: when user returns focus after changing settings
    window.addEventListener("focus", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  // ── Sync volume to audio objects ─────────────────────────────
  useEffect(() => {
    Object.values(audioRefs.current).forEach((a) => {
      a.volume = muted ? 0 : volume;
    });
  }, [volume, muted]);

  // ── Core play ────────────────────────────────────────────────
  const play = useCallback(
    (soundKey) => {
      // Always re-check localStorage so Settings toggle is instant
      if (muted || !isSoundEnabled()) return;
      const audio = audioRefs.current[soundKey];
      if (!audio) return;
      audio.currentTime = 0;
      audio.volume = volume;
      audio.play().catch(() => {});
    },
    [muted, volume],
  );

  // ── toggleMute — also writes cf-sounds so Settings stays in sync ──
  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      // Write the same key Settings modal reads
      localStorage.setItem(STORAGE_SOUNDS_KEY, String(!next)); // sounds ON = !muted
      return next;
    });
  }, []);

  // ── Volume setter ─────────────────────────────────────────────
  const setVolume = useCallback((val) => {
    const clamped = Math.min(1, Math.max(0, val));
    setVolumeState(clamped);
    localStorage.setItem(STORAGE_VOL_KEY, String(clamped));
  }, []);

  return (
    <SoundContext.Provider
      value={{ play, muted, toggleMute, volume, setVolume }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export const useSound = () => useContext(SoundContext);
