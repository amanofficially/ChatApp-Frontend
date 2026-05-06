import { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  LogOut,
  Settings,
  User,
  ChevronUp,
  Wifi,
  WifiOff,
  X,
  Camera,
  Bell,
  BellOff,
  Moon,
  Sun,
  CornerDownLeft,
  Check,
  Phone,
} from "lucide-react";
import Avatar from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// ── PROFILE MODAL ─────────────────────────────────────────────────────────────
function ProfileModal({ onClose }) {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    username: user?.username || "",
    email: user?.email || "",
    bio: user?.bio || "",
    mobile: user?.mobile || "",
  });
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarBase64, setAvatarBase64] = useState(null);
  const fileInputRef = useRef();

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target.result);
      setAvatarBase64(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }
    setSaving(true);
    try {
      let updatedForm = { ...form };
      if (avatarBase64) {
        toast.loading("Uploading photo...", { id: "avatar-upload" });
        const { data } = await axios.post("/upload/avatar", {
          image: avatarBase64,
        });
        toast.dismiss("avatar-upload");
        updatedForm.avatar = data.url;
      }
      await updateProfile(updatedForm);
      toast.success("Profile updated!");
      onClose();
    } catch (err) {
      toast.dismiss("avatar-upload");
      const msg = err?.response?.data?.message || "Failed to update profile";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6 animate-bounce-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[var(--text-primary)] text-lg">
            Edit Profile
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Avatar
              user={{ ...user, avatar: avatarPreview || user?.avatar }}
              size="xl"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-lg hover:bg-brand-600 transition-colors"
            >
              <Camera size={13} />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Tap to change photo
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
              Username
            </label>
            <input
              value={form.username}
              onChange={(e) =>
                setForm((f) => ({ ...f, username: e.target.value }))
              }
              className="input-field"
              placeholder="Your username"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
              Email
            </label>
            <input
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              className="input-field"
              placeholder="your@email.com"
              type="email"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1 inline-block items-center gap-1">
              <Phone size={11} className="inline" /> Mobile Number
            </label>
            <input
              value={form.mobile}
              onChange={(e) =>
                setForm((f) => ({ ...f, mobile: e.target.value }))
              }
              className="input-field"
              placeholder="+91 98765 43210"
              type="tel"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
              Bio
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              className="input-field resize-none"
              placeholder="Tell something about yourself..."
              rows={2}
              maxLength={200}
            />
            <p className="text-xs text-[var(--text-muted)] text-right mt-0.5">
              {form.bio.length}/200
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 btn-ghost border border-[var(--border)] py-2.5 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check size={15} /> Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SETTINGS MODAL ────────────────────────────────────────────────────────────
function SettingsModal({ onClose }) {
  const { theme, toggleTheme } = useTheme();
  const [notifs, setNotifs] = useState(
    () => localStorage.getItem("cf-notifs") !== "false",
  );
  const [sounds, setSounds] = useState(
    () => localStorage.getItem("cf-sounds") !== "false",
  );
  const [enterSend, setEnterSend] = useState(
    () => localStorage.getItem("cf-enter-send") !== "false",
  );

  const toggle = (key, val, setter) => {
    setter(val);
    localStorage.setItem(key, val);
    window.dispatchEvent(new Event("storage"));
    toast.success(`Setting ${val ? "enabled" : "disabled"}`);
  };

  const ToggleRow = ({ label, desc, value, onToggle, icon: Icon }) => (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--border)] last:border-0">
      <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-brand-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {label}
        </p>
        <p className="text-xs text-[var(--text-muted)]">{desc}</p>
      </div>
      <button
        onClick={onToggle}
        className={`w-11 h-6 rounded-full transition-all duration-200 relative flex-shrink-0 ${value ? "bg-brand-500" : "bg-[var(--border)]"}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${value ? "left-5" : "left-0.5"}`}
        />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6 animate-bounce-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[var(--text-primary)] text-lg">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Appearance
        </p>
        <div className="border-b border-[var(--border)] pb-3 mb-3">
          <ToggleRow
            label="Dark Mode"
            desc={theme === "dark" ? "Currently dark" : "Currently light"}
            value={theme === "dark"}
            onToggle={toggleTheme}
            icon={theme === "dark" ? Moon : Sun}
          />
        </div>

        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Notifications
        </p>
        <div className="mb-3">
          <ToggleRow
            label="Push Notifications"
            desc="Get notified for new messages"
            value={notifs}
            onToggle={() => toggle("cf-notifs", !notifs, setNotifs)}
            icon={notifs ? Bell : BellOff}
          />
          <ToggleRow
            label="Message Sounds"
            desc="Play sound on new message"
            value={sounds}
            onToggle={() => toggle("cf-sounds", !sounds, setSounds)}
            icon={Bell}
          />
        </div>

        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Chat
        </p>
        <ToggleRow
          label="Enter to Send"
          desc="Press Enter to send messages"
          value={enterSend}
          onToggle={() => toggle("cf-enter-send", !enterSend, setEnterSend)}
          icon={CornerDownLeft}
        />

        <button onClick={onClose} className="w-full btn-primary mt-5">
          Done
        </button>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef();

  // Close on outside click/touch
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  return (
    <>
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/*
        ★ FIX: `relative` is on this wrapper so the popup positions
        itself relative to the footer area, not the sidebar's scroll container.
        `mx-0` ensures no accidental horizontal margin shifts on mobile.
      */}
      <div ref={containerRef} className="relative">
        {/* ── Popup menu ───────────────────────────────────────────────────── */}
        {open && (
          <div
            className="absolute bottom-full left-0 right-0 mb-1.5 card py-1.5 z-50"
            style={{
              // ★ FIX: inline shadow + subtle origin so it animates from bottom
              boxShadow:
                "0 -4px 24px rgba(0,0,0,0.12), 0 0 0 1px var(--border)",
              transformOrigin: "bottom center",
              animation: "floatUp 0.18s cubic-bezier(0.34,1.4,0.64,1)",
            }}
          >
            <button
              onClick={() => {
                setOpen(false);
                setShowProfile(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left hover:bg-[var(--bg-tertiary)] transition-colors duration-150 active:scale-[0.98]"
              style={{ touchAction: "manipulation" }}
            >
              {/* ★ FIX: fixed icon width so text always starts at the same x */}
              <span className="w-5 flex items-center justify-center flex-shrink-0">
                <User size={15} className="text-[var(--text-muted)]" />
              </span>
              <span className="text-[var(--text-secondary)] font-medium">
                View Profile
              </span>
            </button>

            <button
              onClick={() => {
                setOpen(false);
                setShowSettings(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left hover:bg-[var(--bg-tertiary)] transition-colors duration-150 active:scale-[0.98]"
              style={{ touchAction: "manipulation" }}
            >
              <span className="w-5 flex items-center justify-center flex-shrink-0">
                <Settings size={15} className="text-[var(--text-muted)]" />
              </span>
              <span className="text-[var(--text-secondary)] font-medium">
                Settings
              </span>
            </button>

            <div className="mx-3 my-1 h-px bg-[var(--border)]" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left text-red-500 hover:bg-red-500/8 transition-colors duration-150 active:scale-[0.98]"
              style={{ touchAction: "manipulation" }}
            >
              <span className="w-5 flex items-center justify-center flex-shrink-0">
                <LogOut size={15} className="text-red-500" />
              </span>
              <span className="font-medium">Sign out</span>
            </button>
          </div>
        )}

        {/* ── Footer trigger button ─────────────────────────────────────── */}
        <div className="p-3">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-3 w-full rounded-xl px-2.5 py-2 hover:bg-[var(--bg-tertiary)] transition-all duration-200 group"
            style={{ touchAction: "manipulation" }}
          >
            {/* Avatar: fixed size, never shrinks */}
            <div className="flex-shrink-0">
              <Avatar user={user} size="sm" />
            </div>

            {/* User info: min-w-0 so text truncates instead of pushing chevron */}
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">
                {user?.username}
              </p>
              {/* ★ FIX: status row in its own flex line, items aligned */}
              <div className="flex items-center gap-1 mt-0.5">
                {isConnected ? (
                  <Wifi size={10} className="text-green-400 flex-shrink-0" />
                ) : (
                  <WifiOff
                    size={10}
                    className="text-[var(--text-muted)] flex-shrink-0"
                  />
                )}
                <span className="text-[10px] text-[var(--text-muted)] leading-none">
                  {isConnected ? "Online" : "Connecting..."}
                </span>
                {user?.mobile && (
                  <>
                    <span className="text-[var(--text-muted)] text-[10px] mx-0.5">
                      ·
                    </span>
                    <Phone
                      size={9}
                      className="text-[var(--text-muted)] flex-shrink-0"
                    />
                    <span className="text-[10px] text-[var(--text-muted)] truncate leading-none">
                      {user.mobile}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Chevron: fixed, never shrinks */}
            <div className="flex-shrink-0">
              <ChevronUp
                size={14}
                className={`text-[var(--text-muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* ★ FIX: keyframe defined inline so it works without a global CSS file */}
      <style>{`
        @keyframes floatUp {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </>
  );
}
