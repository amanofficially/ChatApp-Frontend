import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Check,
  CheckCheck,
  Copy,
  Trash2,
  MoreHorizontal,
  SmilePlus,
} from "lucide-react";
import { formatMessageTime } from "../../utils/helpers";
import Avatar from "../ui/Avatar";
import toast from "react-hot-toast";
import axios from "axios";
import useChatStore from "../../context/chatStore";

const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "👎"];
const LONG_PRESS_MS = 450;
const isTouch = window.matchMedia("(hover: none)").matches;

// ─────────────────────────────────────────────────────────────
// useOutsideClick — closes a floating panel when user clicks
// outside both the panel ref and an optional anchor ref
// ─────────────────────────────────────────────────────────────
function useOutsideClick(ref, onClose, anchorRef = null) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
      onClose();
    };
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handler);
      document.addEventListener("touchstart", handler);
    }, 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [ref, anchorRef, onClose]);
}

// ─────────────────────────────────────────────────────────────
// ReactionBar — emoji picker floating above bubble
// ─────────────────────────────────────────────────────────────
function ReactionBar({ isOwn, currentReaction, onReact, onClose }) {
  const ref = useRef();
  useOutsideClick(ref, onClose);

  return (
    <div
      ref={ref}
      className={`absolute z-30 bottom-full mb-2 flex items-center gap-1 px-2 py-1.5
        rounded-2xl shadow-xl border border-[var(--border)] bg-[var(--bg-secondary)] backdrop-blur-md
        ${isOwn ? "right-0" : "left-0"}`}
      style={{
        animation: "reactionBarIn 0.18s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onReact(emoji);
            onClose();
          }}
          className={`text-xl w-9 h-9 flex items-center justify-center rounded-xl
            transition-all duration-150 select-none
            ${
              currentReaction === emoji
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

// ─────────────────────────────────────────────────────────────
// ContextMenu — copy / delete floating above bubble
// ─────────────────────────────────────────────────────────────
function ContextMenu({ isOwn, onCopy, onDelete, onClose, anchorRef }) {
  const ref = useRef();
  useOutsideClick(ref, onClose, anchorRef);

  return (
    <div
      ref={ref}
      className={`absolute bottom-full mb-1 z-40 card py-1 min-w-[130px] shadow-xl
        ${isOwn ? "right-0" : "left-0"}`}
      style={{ animation: "slideUp 0.15s ease-out" }}
    >
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCopy();
        }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm
          text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors rounded-t-xl"
      >
        <Copy size={14} className="text-[var(--text-muted)]" />
        <span>Copy</span>
      </button>
      {isOwn && (
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm
            text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-b-xl"
        >
          <Trash2 size={14} />
          <span>Delete</span>
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ReactionSummary — pills shown below bubble
// clicking a pill opens the reaction bar to change / remove
// ─────────────────────────────────────────────────────────────
function ReactionSummary({ reactions, isOwn, onPillClick }) {
  if (!reactions || Object.keys(reactions).length === 0) return null;

  const counts = {};
  Object.values(reactions).forEach((emoji) => {
    counts[emoji] = (counts[emoji] || 0) + 1;
  });

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
          onClick={(e) => {
            e.stopPropagation();
            onPillClick();
          }}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs
            bg-[var(--bg-secondary)] border border-[var(--border)] shadow-md
            hover:border-brand-500/50 active:scale-95 transition-all cursor-pointer select-none"
        >
          <span style={{ fontSize: 13 }}>{emoji}</span>
          {count > 1 && (
            <span className="text-[10px] text-[var(--text-muted)] font-semibold">
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TickIcon
// ─────────────────────────────────────────────────────────────
function TickIcon({ status }) {
  if (status === "read")
    return <CheckCheck size={13} className="text-green-500 flex-shrink-0" />;
  if (status === "delivered")
    return (
      <CheckCheck
        size={13}
        className="text-[var(--text-muted)] flex-shrink-0"
      />
    );
  return <Check size={13} className="text-[var(--text-muted)] flex-shrink-0" />;
}

// ─────────────────────────────────────────────────────────────
// MessageBubble
//
// DESKTOP  : hover → emoji + ⋯ buttons appear beside bubble
//            click emoji btn  → reaction bar
//            click ⋯ btn      → action menu (copy/delete)
//
// MOBILE   : tap bubble       → action menu (copy/delete)
//            hold bubble      → reaction bar  (+vibrate)
//            tap reaction pill→ reaction bar  (change/remove)
//            any action       → everything closes automatically
// ─────────────────────────────────────────────────────────────
export default function MessageBubble({ message, isOwn, showAvatar, sender }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // refs for touch gesture tracking
  const longPressTimer = useRef(null);
  const isLongPressing = useRef(false);
  const longPressFired = useRef(false);

  // ref so ContextMenu outside-click handler can ignore clicks on the ⋯ button
  const menuBtnRef = useRef();

  // ── store ─────────────────────────────────────────────────
  const activeConversationId = useChatStore((s) => s.activeConversation?._id);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const storeMessages = useChatStore((s) =>
    activeConversationId ? s.messagesByConv[activeConversationId] || [] : [],
  );

  const storeMessage = storeMessages.find((m) => m._id === message._id);
  const reactions = storeMessage?.reactions || message.reactions || {};

  const myUserId = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("chat_user") || "{}")._id ?? null;
    } catch {
      return null;
    }
  }, []);

  const myReaction = reactions[myUserId];
  const hasReactions = Object.keys(reactions).length > 0;

  // ── shared helpers ────────────────────────────────────────
  const closeAll = useCallback(() => {
    setShowMenu(false);
    setShowReactions(false);
  }, []);
  const openReactions = useCallback(() => {
    setShowReactions(true);
    setShowMenu(false);
  }, []);
  const openMenu = useCallback(() => {
    setShowMenu(true);
    setShowReactions(false);
  }, []);

  // ── copy ──────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    closeAll();
    if (!message.content || message.type === "image") {
      toast("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Copied!");
    } catch {
      try {
        const el = Object.assign(document.createElement("textarea"), {
          value: message.content,
          style: "position:fixed;opacity:0",
        });
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        toast.success("Copied!");
      } catch {
        toast.error("Copy failed");
      }
    }
  }, [message.content, message.type, closeAll]);

  // ── delete ────────────────────────────────────────────────
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

  // ── react ─────────────────────────────────────────────────
  const handleReact = useCallback(
    async (emoji) => {
      if (!myUserId) return;
      const { updateReaction } = useChatStore.getState();
      const isToggle = reactions[myUserId] === emoji;
      updateReaction(message._id, myUserId, isToggle ? null : emoji);
      try {
        await axios.post(`/messages/${message._id}/react`, {
          emoji: isToggle ? null : emoji,
        });
      } catch {
        updateReaction(message._id, myUserId, reactions[myUserId] || null);
        toast.error("Reaction failed");
      }
    },
    [message._id, myUserId, reactions],
  );

  // ── touch handlers (mobile only) ──────────────────────────
  const handleTouchStart = useCallback(
    (e) => {
      if (e.target.tagName === "IMG") return;
      longPressFired.current = false;
      isLongPressing.current = true;
      longPressTimer.current = setTimeout(() => {
        longPressFired.current = true;
        isLongPressing.current = false;
        window.getSelection()?.removeAllRanges();
        if (navigator.vibrate) navigator.vibrate(30);
        openReactions();
      }, LONG_PRESS_MS);
    },
    [openReactions],
  );

  const handleTouchMove = useCallback(() => {
    if (!isLongPressing.current) return;
    clearTimeout(longPressTimer.current);
    isLongPressing.current = false;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (e.target.tagName === "IMG") return;
    const wasPressAndHold = longPressFired.current;
    clearTimeout(longPressTimer.current);
    isLongPressing.current = false;
    e.preventDefault(); // stop browser generating a synthetic click
    if (wasPressAndHold) return; // reaction bar already open — done
    // short tap → toggle action menu
    setShowMenu((prev) => {
      if (prev) return false;
      setShowReactions(false);
      return true;
    });
  }, []);

  // ─────────────────────────────────────────────────────────
  if (isDeleting) return null;

  // ── optimistic (sending…) ─────────────────────────────────
  if (message._isOptimistic) {
    return (
      <div className="flex flex-col items-end mb-0.5">
        <div className="flex items-end gap-2 w-full flex-row-reverse">
          <div className="flex flex-col gap-0.5 items-end min-w-0">
            <div className="message-bubble-out max-w-[75vw] break-words whitespace-pre-wrap opacity-70 relative pb-4">
              <span>{message.content}</span>
              <span className="absolute bottom-1 right-2 text-[9px] text-white/50 leading-none select-none">
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

  // ── main render ───────────────────────────────────────────
  return (
    <div
      className={`flex flex-col ${isOwn ? "items-end" : "items-start"} mb-0.5`}
      style={{ marginBottom: hasReactions ? "0.875rem" : undefined }}
    >
      <div
        className={`flex items-end gap-2 group w-full ${isOwn ? "flex-row-reverse" : ""}`}
      >
        {/* Avatar (other user only) */}
        {!isOwn && (
          <div
            className={`flex-shrink-0 ${showAvatar ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <Avatar user={sender} size="xs" />
          </div>
        )}

        <div
          className={`flex flex-col gap-0.5 min-w-0 ${isOwn ? "items-end" : "items-start"}`}
        >
          <div className="relative flex items-center gap-1 max-w-full">
            {/* ── DESKTOP ONLY: hover controls ── */}
            {!isTouch && (
              <div
                className={`flex items-center gap-0.5 transition-opacity duration-150 flex-shrink-0
                  ${isOwn ? "order-first" : "order-last"}
                  opacity-0 group-hover:opacity-100
                  ${showMenu || showReactions ? "!opacity-100" : ""}`}
              >
                {/* Emoji react button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    showReactions ? closeAll() : openReactions();
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center
                    hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-brand-500 transition-colors"
                  title="React"
                >
                  {myReaction ? (
                    <span className="text-base leading-none">{myReaction}</span>
                  ) : (
                    <SmilePlus size={14} />
                  )}
                </button>

                {/* Three-dots button */}
                <button
                  ref={menuBtnRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    showMenu ? closeAll() : openMenu();
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center
                    hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors"
                  title="More"
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>
            )}

            {/* ── BUBBLE ── */}
            <div className="relative">
              <div
                className={`relative ${isOwn ? "message-bubble-out" : "message-bubble-in"}
                  max-w-[75vw] break-words whitespace-pre-wrap animate-slide-up select-text cursor-default`}
                style={{ paddingBottom: "1.25rem", minWidth: "80px" }}
                onTouchStart={isTouch ? handleTouchStart : undefined}
                onTouchMove={isTouch ? handleTouchMove : undefined}
                onTouchEnd={isTouch ? handleTouchEnd : undefined}
              >
                {message.type === "image" ? (
                  <img
                    src={message.content}
                    className="rounded-xl max-h-64 cursor-pointer"
                    onClick={() => window.open(message.content)}
                    alt="shared"
                    loading="lazy"
                  />
                ) : (
                  message.content
                )}

                {/* Timestamp */}
                <span
                  className={`absolute bottom-1 text-[9px] leading-none select-none pointer-events-none
                    ${isOwn ? "right-2 text-white/50" : "left-4 text-[var(--text-muted)]"}`}
                >
                  {formatMessageTime(message.createdAt)}
                </span>

                {/* Reaction bar — above bubble */}
                {showReactions && (
                  <ReactionBar
                    isOwn={isOwn}
                    currentReaction={myReaction}
                    onReact={handleReact}
                    onClose={closeAll}
                  />
                )}

                {/* Action menu — above bubble */}
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

              {/* Reaction pills — below bubble, tap to change/remove */}
              <ReactionSummary
                reactions={reactions}
                isOwn={isOwn}
                onPillClick={openReactions}
              />
            </div>
          </div>

          {/* Read/delivered tick */}
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
  );
}
