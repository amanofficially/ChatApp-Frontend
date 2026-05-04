import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Check, CheckCheck, Copy, Trash2,
  MoreHorizontal, SmilePlus,
  FileText, Download, X as XIcon, ExternalLink,
} from "lucide-react";
import { formatMessageTime } from "../../utils/helpers";
import Avatar from "../ui/Avatar";
import toast from "react-hot-toast";
import axios from "axios";
import useChatStore from "../../context/chatStore";

const REACTIONS   = ["❤️", "😂", "😮", "😢", "👍", "👎"];
const LONG_PRESS_MS = 500;
const isTouch = () => window.matchMedia("(hover: none) and (pointer: coarse)").matches;

// ── useOutsideClick ─────────────────────────────────────────────────────────
function useOutsideClick(ref, onClose, anchorRef = null) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
      onClose();
    };
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handler);
      document.addEventListener("touchstart", handler, { passive: true });
    }, 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [ref, anchorRef, onClose]);
}

// ── Image Lightbox ─────────────────────────────────────────────────────────
function ImageLightbox({ src, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    // Prevent body scroll while lightbox is open
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center
                   rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors z-10"
        onClick={onClose}
        style={{ touchAction: "manipulation" }}
      >
        <XIcon size={20} />
      </button>

      {/* Download button */}
      <a
        href={src}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center
                   rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors z-10"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: "manipulation" }}
      >
        <Download size={18} />
      </a>

      <img
        src={src}
        alt="full size"
        className="max-w-[95vw] max-h-[88vh] rounded-xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
        style={{ WebkitTouchCallout: "default" }}
      />
    </div>
  );
}

// ── PDF/File Viewer ──────────────────────────────────────────────────────────
function FileActionMenu({ url, fileName, onClose }) {
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) onClose();
    };
    setTimeout(() => {
      document.addEventListener("mousedown", handler);
      document.addEventListener("touchstart", handler, { passive: true });
    }, 50);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [onClose]);

  const isPdf = fileName?.toLowerCase().endsWith(".pdf") ||
                url?.includes("/upload/") && url?.includes(".pdf");

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 z-50 card py-1.5 min-w-[180px] shadow-xl rounded-2xl"
      style={{ animation: "slideUp 0.15s ease-out" }}
    >
      {isPdf && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm
            text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <ExternalLink size={14} className="text-[var(--text-muted)]" />
          <span>Open PDF</span>
        </a>
      )}
      <a
        href={url}
        download={fileName || true}
        onClick={onClose}
        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm
          text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors rounded-b-2xl"
      >
        <Download size={14} className="text-[var(--text-muted)]" />
        <span>Download</span>
      </a>
    </div>
  );
}

// ── ReactionBar ───────────────────────────────────────────────────────────────
function ReactionBar({ isOwn, currentReaction, onReact, onClose }) {
  const ref = useRef();
  useOutsideClick(ref, onClose);
  return (
    <div
      ref={ref}
      className={`absolute z-30 bottom-full mb-2 flex items-center gap-1 px-2 py-1.5
        rounded-2xl shadow-xl border border-[var(--border)] bg-[var(--bg-secondary)] backdrop-blur-md
        ${isOwn ? "right-0" : "left-0"}`}
      style={{ animation: "reactionBarIn 0.18s cubic-bezier(0.34,1.56,0.64,1)" }}
    >
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { onReact(emoji); onClose(); }}
          style={{ touchAction: "manipulation" }}
          className={`text-xl w-10 h-10 flex items-center justify-center rounded-xl
            transition-all duration-150
            ${currentReaction === emoji
              ? "bg-brand-500/20 scale-110 ring-2 ring-brand-500/40"
              : "hover:bg-[var(--bg-tertiary)] hover:scale-125 active:scale-110"
            }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ── ContextMenu ───────────────────────────────────────────────────────────────
function ContextMenu({ isOwn, onCopy, onDelete, onClose, anchorRef }) {
  const ref = useRef();
  useOutsideClick(ref, onClose, anchorRef);
  return (
    <div
      ref={ref}
      className={`absolute bottom-full mb-1 z-40 card py-1 min-w-[140px] shadow-xl rounded-2xl
        ${isOwn ? "right-0" : "left-0"}`}
      style={{ animation: "slideUp 0.15s ease-out" }}
    >
      {onCopy && (
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onCopy(); }}
          style={{ touchAction: "manipulation" }}
          className="flex items-center gap-2.5 w-full px-4 py-3 text-sm
            text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <Copy size={14} className="text-[var(--text-muted)]" />
          <span>Copy</span>
        </button>
      )}
      {isOwn && (
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
          style={{ touchAction: "manipulation" }}
          className="flex items-center gap-2.5 w-full px-4 py-3 text-sm
            text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={14} />
          <span>Delete</span>
        </button>
      )}
    </div>
  );
}

// ── ReactionSummary ───────────────────────────────────────────────────────────
function ReactionSummary({ reactions, isOwn, onPillClick }) {
  if (!reactions || Object.keys(reactions).length === 0) return null;
  const counts = {};
  Object.values(reactions).forEach((e) => { counts[e] = (counts[e] || 0) + 1; });
  return (
    <div
      className={`absolute -bottom-4 flex items-center gap-0.5 z-10
        ${isOwn ? "right-2" : "left-2"}`}
      style={{ animation: "reactionPop 0.2s ease-out" }}
    >
      {Object.entries(counts).map(([emoji, count]) => (
        <button
          key={emoji}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => { e.stopPropagation(); onPillClick(); }}
          style={{ touchAction: "manipulation" }}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs
            bg-[var(--bg-secondary)] border border-[var(--border)] shadow-md
            hover:border-brand-500/50 active:scale-95 transition-all cursor-pointer"
        >
          <span style={{ fontSize: 13 }}>{emoji}</span>
          {count > 1 && (
            <span className="text-[10px] text-[var(--text-muted)] font-semibold">{count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── TickIcon ──────────────────────────────────────────────────────────────────
function TickIcon({ status }) {
  if (status === "read")
    return <CheckCheck size={13} className="text-green-500 flex-shrink-0" />;
  if (status === "delivered")
    return <CheckCheck size={13} className="text-[var(--text-muted)] flex-shrink-0" />;
  return <Check size={13} className="text-[var(--text-muted)] flex-shrink-0" />;
}

// ── MessageContent ─────────────────────────────────────────────────────────────
function MessageContent({ message, isOwn, onImageClick }) {
  const [showFileActions, setShowFileActions] = useState(false);

  if (message.type === "image") {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onImageClick(message.content); }}
        style={{ touchAction: "manipulation", display: "block" }}
        className="rounded-xl overflow-hidden focus:outline-none active:opacity-80"
      >
        <img
          src={message.content}
          alt="shared image"
          loading="lazy"
          className="rounded-xl max-h-64 w-full object-cover cursor-zoom-in"
          style={{ maxWidth: "240px", display: "block" }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      </button>
    );
  }

  if (message.type === "file") {
    const fileName = message.fileName || "File";
    const url = message.content;

    return (
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowFileActions((v) => !v); }}
          style={{ touchAction: "manipulation" }}
          className={`flex items-center gap-3 min-w-[180px] max-w-[240px] p-1 rounded-lg
            hover:opacity-80 transition-opacity group/file text-left w-full
            ${isOwn ? "text-white" : "text-[var(--text-primary)]"}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
            ${isOwn ? "bg-white/20" : "bg-brand-500/15"}`}>
            <FileText size={20} className={isOwn ? "text-white" : "text-brand-500"} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileName}</p>
            <p className={`text-[11px] ${isOwn ? "text-white/60" : "text-[var(--text-muted)]"}`}>
              Tap to open / download
            </p>
          </div>
          <Download size={15} className="flex-shrink-0 opacity-60" />
        </button>

        {showFileActions && (
          <FileActionMenu
            url={url}
            fileName={fileName}
            onClose={() => setShowFileActions(false)}
          />
        )}
      </div>
    );
  }

  // text
  return <span>{message.content}</span>;
}

// ── MessageBubble ─────────────────────────────────────────────────────────────
export default function MessageBubble({ message, isOwn, showAvatar, sender }) {
  const [showMenu, setShowMenu]           = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isDeleting, setIsDeleting]       = useState(false);
  const [lightboxSrc, setLightboxSrc]     = useState(null);

  const longPressTimer   = useRef(null);
  const isLongPressing   = useRef(false);
  const longPressFired   = useRef(false);
  const touchStartPos    = useRef(null);
  const menuBtnRef       = useRef();

  const activeConversationId = useChatStore((s) => s.activeConversation?._id);
  const removeMessage        = useChatStore((s) => s.removeMessage);
  const storeMessages        = useChatStore((s) =>
    activeConversationId ? s.messagesByConv[activeConversationId] || [] : []
  );

  const storeMessage = storeMessages.find((m) => m._id === message._id);
  const reactions    = storeMessage?.reactions || message.reactions || {};

  const myUserId = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("chat_user") || "{}")._id ?? null; }
    catch { return null; }
  }, []);

  const myReaction  = reactions[myUserId];
  const hasReactions = Object.keys(reactions).length > 0;

  const closeAll      = useCallback(() => { setShowMenu(false); setShowReactions(false); }, []);
  const openReactions = useCallback(() => { setShowReactions(true); setShowMenu(false); }, []);
  const openMenu      = useCallback(() => { setShowMenu(true); setShowReactions(false); }, []);

  // ── copy (text only) ─────────────────────────────────────────────────────
  const handleCopy = message.type === "text"
    ? useCallback(async () => {
        closeAll();
        try {
          await navigator.clipboard.writeText(message.content);
          toast.success("Copied!");
        } catch {
          try {
            const el = Object.assign(document.createElement("textarea"), {
              value: message.content, style: "position:fixed;opacity:0",
            });
            document.body.appendChild(el);
            el.focus(); el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            toast.success("Copied!");
          } catch { toast.error("Copy failed"); }
        }
      }, [message.content, closeAll])
    : null;

  // ── delete ───────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    closeAll();
    setIsDeleting(true);
    try {
      await axios.delete(`/messages/${message._id}`);
      removeMessage(message._id, activeConversationId);
      toast.success("Message deleted");
    } catch {
      setIsDeleting(false);
      toast.error("Could not delete message");
    }
  }, [message._id, activeConversationId, removeMessage, closeAll]);

  // ── react ────────────────────────────────────────────────────────────────
  const handleReact = useCallback(async (emoji) => {
    if (!myUserId) return;
    const { updateReaction } = useChatStore.getState();
    const isToggle = reactions[myUserId] === emoji;
    updateReaction(message._id, myUserId, isToggle ? null : emoji);
    try {
      await axios.post(`/messages/${message._id}/react`, { emoji: isToggle ? null : emoji });
    } catch {
      updateReaction(message._id, myUserId, reactions[myUserId] || null);
      toast.error("Reaction failed");
    }
  }, [message._id, myUserId, reactions]);

  // ── touch handlers (long-press → reactions, tap → toggle menu) ───────────
  const handleTouchStart = useCallback((e) => {
    // Let taps on IMG / A / BUTTON flow normally
    if (["IMG", "A", "BUTTON"].includes(e.target.tagName)) return;
    longPressFired.current = false;
    isLongPressing.current = true;
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      isLongPressing.current = false;
      // Kill any accidental selection
      window.getSelection()?.removeAllRanges();
      if (navigator.vibrate) navigator.vibrate(25);
      openReactions();
    }, LONG_PRESS_MS);
  }, [openReactions]);

  const handleTouchMove = useCallback((e) => {
    if (!isLongPressing.current || !touchStartPos.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (dx > 8 || dy > 8) {
      clearTimeout(longPressTimer.current);
      isLongPressing.current = false;
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (["IMG", "A", "BUTTON"].includes(e.target.tagName)) return;
    const wasPressAndHold = longPressFired.current;
    clearTimeout(longPressTimer.current);
    isLongPressing.current = false;
    touchStartPos.current = null;
    if (wasPressAndHold) return;
    // Short tap: toggle menu
    setShowMenu((prev) => { if (prev) return false; setShowReactions(false); return true; });
  }, []);

  if (isDeleting) return null;

  // ── Optimistic bubble ────────────────────────────────────────────────────
  if (message._isOptimistic) {
    return (
      <div className="flex flex-col items-end mb-0.5">
        <div className="flex items-end gap-2 w-full flex-row-reverse">
          <div className="flex flex-col gap-0.5 items-end min-w-0">
            <div className="message-bubble-out break-words whitespace-pre-wrap opacity-70 relative pb-4">
              {message.type === "image" ? (
                <img src={message.content} alt="sending..." className="rounded-xl max-h-48" loading="lazy" style={{ maxWidth: "200px" }} />
              ) : message.type === "file" ? (
                <div className="flex items-center gap-2 min-w-[160px]">
                  <FileText size={18} className="text-white/70 flex-shrink-0" />
                  <span className="text-sm truncate max-w-[160px]">{message.fileName || "File"}</span>
                </div>
              ) : (
                <span>{message.content}</span>
              )}
              <span className="absolute bottom-1 right-2 text-[9px] text-white/50 leading-none">
                {formatMessageTime(message.createdAt)}
              </span>
            </div>
            <div className="px-1">
              <div className="w-3 h-3 border-[1.5px] border-[var(--text-muted)]/40 border-t-[var(--text-muted)] rounded-full animate-spin" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const touch = isTouch();

  // ── Main bubble ──────────────────────────────────────────────────────────
  return (
    <>
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}

      <div
        className={`flex flex-col ${isOwn ? "items-end" : "items-start"} mb-0.5`}
        style={{ marginBottom: hasReactions ? "0.875rem" : undefined }}
      >
        <div className={`flex items-end gap-2 group w-full ${isOwn ? "flex-row-reverse" : ""}`}>

          {/* Avatar */}
          {!isOwn && (
            <div className={`flex-shrink-0 ${showAvatar ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
              <Avatar user={sender} size="xs" />
            </div>
          )}

          <div className={`flex flex-col gap-0.5 min-w-0 ${isOwn ? "items-end" : "items-start"}`}>
            <div className="relative flex items-center gap-1 max-w-full">

              {/* Desktop hover controls */}
              {!touch && (
                <div
                  className={`flex items-center gap-0.5 transition-opacity duration-150 flex-shrink-0
                    ${isOwn ? "order-first" : "order-last"}
                    opacity-0 group-hover:opacity-100
                    ${showMenu || showReactions ? "!opacity-100" : ""}`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); showReactions ? closeAll() : openReactions(); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center
                      hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-brand-500 transition-colors"
                    title="React"
                  >
                    {myReaction
                      ? <span className="text-base leading-none">{myReaction}</span>
                      : <SmilePlus size={14} />
                    }
                  </button>
                  <button
                    ref={menuBtnRef}
                    onClick={(e) => { e.stopPropagation(); showMenu ? closeAll() : openMenu(); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center
                      hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors"
                    title="More"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              )}

              {/* Bubble */}
              <div className="relative">
                <div
                  className={`relative ${isOwn ? "message-bubble-out" : "message-bubble-in"}
                    break-words whitespace-pre-wrap animate-slide-up`}
                  style={{
                    paddingBottom: "1.25rem",
                    minWidth: message.type === "file" ? "180px" : "60px",
                  }}
                  onTouchStart={touch ? handleTouchStart : undefined}
                  onTouchMove={touch ? handleTouchMove : undefined}
                  onTouchEnd={touch ? handleTouchEnd : undefined}
                >
                  <MessageContent
                    message={storeMessage || message}
                    isOwn={isOwn}
                    onImageClick={setLightboxSrc}
                  />

                  {/* Timestamp */}
                  <span
                    className={`absolute bottom-1 text-[9px] leading-none pointer-events-none
                      ${isOwn ? "right-2 text-white/50" : "left-4 text-[var(--text-muted)]"}`}
                  >
                    {formatMessageTime(message.createdAt)}
                  </span>

                  {/* Reaction bar */}
                  {showReactions && (
                    <ReactionBar
                      isOwn={isOwn}
                      currentReaction={myReaction}
                      onReact={handleReact}
                      onClose={closeAll}
                    />
                  )}

                  {/* Action menu */}
                  {showMenu && (
                    <ContextMenu
                      isOwn={isOwn}
                      onCopy={handleCopy}
                      onDelete={handleDelete}
                      onClose={closeAll}
                      anchorRef={menuBtnRef}
                    />
                  )}
                </div>

                <ReactionSummary
                  reactions={reactions}
                  isOwn={isOwn}
                  onPillClick={openReactions}
                />
              </div>
            </div>

            {/* Delivery tick */}
            {isOwn && (
              <div
                className="px-1 flex justify-end"
                style={{ marginTop: hasReactions ? "0.625rem" : undefined }}
              >
                <TickIcon status={storeMessage?.status || message.status} />
              </div>
            )}
          </div>

          {!isOwn && <div className="w-5 flex-shrink-0" />}
        </div>
      </div>
    </>
  );
}
