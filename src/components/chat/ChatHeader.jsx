import { useState, useMemo, useRef, useEffect } from "react";
import {
  ArrowLeft,
  X,
  Mail,
  User,
  Phone,
  PhoneCall,
  Video,
  MoreVertical,
  Trash2,
  Info,
} from "lucide-react";
import Avatar from "../ui/Avatar";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import useChatStore from "../../context/chatStore";
import { formatLastSeen } from "../../utils/helpers";
import toast from "react-hot-toast";
import axios from "axios";

/* ── Single row in contact info card ── */
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
      <Icon size={15} className="mt-1 text-[var(--text-muted)] flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p className="text-sm font-medium text-[var(--text-primary)] break-words">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ── Contact info modal ── */
function ChatInfoPanel({ other, isOnline, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="card w-full max-w-md rounded-2xl p-5 sm:p-6 animate-bounce-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Contact Info
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <Avatar user={other} size="xl" showStatus={false} />
          <div className="w-full">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] truncate">
              {other.username || "Unknown"}
            </h3>
            <span
              className={`inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                isOnline
                  ? "bg-green-500/10 text-green-500"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
              }`}
            >
              {isOnline ? "Online" : formatLastSeen(other.lastSeen)}
            </span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <InfoRow icon={Mail} label="Email" value={other.email || "Not set"} />
          <InfoRow icon={Phone} label="Mobile" value={other.mobile || "Not set"} />
          <InfoRow icon={User} label="Bio" value={other.bio || "Hey! there i'm using ChatFlow"} />
        </div>

        <button onClick={onClose} className="w-full btn-primary">
          Close
        </button>
      </div>
    </div>
  );
}

/* ── Delete Confirm Modal ── */
function DeleteChatModal({ username, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5 shadow-2xl"
        style={{ animation: "slideUp 0.2s ease" }}
      >
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-400" />
        </div>

        <h3 className="text-base font-bold text-[var(--text-primary)] text-center mb-1">
          Delete conversation?
        </h3>
        <p className="text-sm text-[var(--text-muted)] text-center mb-5">
          Your chat with <span className="font-semibold text-[var(--text-secondary)]">{username}</span> and all messages will be permanently removed.
        </p>

        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl text-sm font-medium border border-[var(--border)]
              text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-10 rounded-xl text-sm font-semibold
              bg-red-500 hover:bg-red-600 text-white transition-colors active:scale-95"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Typing indicator — clean minimal dots ── */
function TypingStatus() {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex items-center gap-[3px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-[var(--brand)]"
            style={{
              animation: "typingBounce 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </span>
      <span className="text-[11px] text-[var(--brand)] font-medium tracking-wide">
        typing
      </span>
    </span>
  );
}

/* ── ChatHeader ── */
export default function ChatHeader({ conversation, onBack }) {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const typingUsers = useChatStore((s) => s.typingUsers);
  const [showInfo, setShowInfo] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef(null);

  const other = useMemo(
    () => conversation?.participants?.find((p) => p._id !== user?._id) || {},
    [conversation, user],
  );

  const isOnline = onlineUsers.includes(other._id);
  const currentUserId = user?._id?.toString();
  const isOtherTyping = (typingUsers[conversation?._id] || []).some(
    (id) => id !== currentUserId,
  );

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleDemoCall = (type) => {
    toast.success(
      type === "voice"
        ? `Calling ${other.username || "user"}…`
        : `Starting video call with ${other.username || "user"}…`,
    );
  };

  const handleDeleteChat = async () => {
    setShowDeleteConfirm(false);
    try {
      await axios.delete(`/conversations/${conversation._id}`);
      useChatStore.setState((s) => ({
        conversations: s.conversations.filter((c) => c._id !== conversation._id),
        activeConversation: null,
      }));
      toast.success("Chat deleted");
    } catch {
      toast.error("Could not delete chat");
    }
  };

  return (
    <>
      {showInfo && (
        <ChatInfoPanel
          other={other}
          isOnline={isOnline}
          onClose={() => setShowInfo(false)}
        />
      )}

      {showDeleteConfirm && (
        <DeleteChatModal
          username={other.username}
          onConfirm={handleDeleteChat}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      <header className="h-16 px-3 sm:px-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-between flex-shrink-0">
        {/* Left: back + avatar + name */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="md:hidden btn-ghost w-9 h-9 p-0 flex items-center justify-center flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Avatar + name — clicking opens info */}
          <button
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-90 transition"
          >
            <Avatar user={other} size="md" showStatus isOnline={isOnline} />

            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-[var(--text-primary)] text-sm sm:text-base truncate leading-tight">
                {other.username || "Unknown"}
              </h2>

              {/* Status row */}
              <div className="flex items-center h-4 mt-0.5">
                {isOtherTyping ? (
                  <TypingStatus />
                ) : (
                  <p
                    className={`text-[11px] truncate font-medium ${
                      isOnline ? "text-green-400" : "text-[var(--text-muted)]"
                    }`}
                  >
                    {isOnline ? "Online" : formatLastSeen(other.lastSeen)}
                  </p>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Right: call buttons + 3-dot menu */}
        <div className="flex items-center gap-1 sm:gap-1.5 ml-2">
          <button
            onClick={() => handleDemoCall("voice")}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition active:scale-95"
            title="Voice call"
          >
            <PhoneCall size={17} />
          </button>
          <button
            onClick={() => handleDemoCall("video")}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition active:scale-95"
            title="Video call"
          >
            <Video size={17} />
          </button>

          {/* ── 3-dot vertical menu ── */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition active:scale-95
                ${menuOpen
                  ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                  : "hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                }`}
              title="More options"
            >
              <MoreVertical size={17} />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 min-w-[180px] rounded-xl overflow-hidden
                  shadow-xl border border-[var(--border)] bg-[var(--bg-secondary)] py-1 z-50"
                style={{ animation: "fadeIn 0.12s ease" }}
              >
                <button
                  onClick={() => { setShowInfo(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5
                    text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                >
                  <Info size={15} className="text-[var(--text-muted)]" />
                  Profile info
                </button>

                <div className="my-1 border-t border-[var(--border)] mx-2" />

                <button
                  onClick={() => { setShowDeleteConfirm(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5
                    text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                >
                  <Trash2 size={15} />
                  Delete chat
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

