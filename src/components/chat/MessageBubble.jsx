import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Check,
  CheckCheck,
  Copy,
  Trash2,
  SmilePlus,
  FileText,
  Download,
  X as XIcon,
  ZoomIn,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import { formatMessageTime } from "../../utils/helpers";
import Avatar from "../ui/Avatar";
import toast from "react-hot-toast";
import axios from "axios";
import useChatStore from "../../context/chatStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "👎"];
const LONG_PRESS_MS = 420;
const SCROLL_THRESHOLD = 8;

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useIsPhone() {
  const [phone, setPhone] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: none) and (pointer: coarse)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(hover: none) and (pointer: coarse)");
    const h = (e) => setPhone(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return phone;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function blobDownload(url, fallbackName = "file") {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const ext =
      blob.type.split("/")[1] || fallbackName.split(".").pop() || "bin";
    const name = fallbackName.includes(".")
      ? fallbackName
      : `${fallbackName}.${ext}`;
    const objectUrl = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: objectUrl,
      download: name,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// ─── EmojiBar ─────────────────────────────────────────────────────────────────
function EmojiBar({ currentReaction, onReact }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className={`text-xl w-9 h-9 flex items-center justify-center rounded-full transition
          ${
            currentReaction === emoji
              ? "bg-[var(--brand)]/20 scale-110"
              : "hover:bg-[var(--bg-tertiary)]"
          }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ─── ContextMenu (desktop) ────────────────────────────────────────────────────
function ContextMenu({
  isOwn,
  messageType,
  content,
  fileName,
  onCopy,
  onDelete,
  onClose,
}) {
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const isText = messageType === "text";
  const isFile = messageType === "file";

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 bg-[var(--bg-secondary)] border rounded-xl shadow z-50"
    >
      {isText && (
        <button onClick={onCopy} className="context-menu-item">
          <Copy size={14} /> Copy
        </button>
      )}
      {isFile && (
        <button
          onClick={() => blobDownload(content, fileName)}
          className="context-menu-item"
        >
          <Download size={14} /> Download
        </button>
      )}
      {isOwn && (
        <button onClick={onDelete} className="context-menu-item text-red-400">
          <Trash2 size={14} /> Delete
        </button>
      )}
    </div>
  );
}

// ─── TickIcon ─────────────────────────────────────────────────────────────────
function TickIcon({ status }) {
  if (status === "read")
    return <CheckCheck size={13} className="text-green-500" />;
  if (status === "delivered")
    return <CheckCheck size={13} className="text-gray-400" />;
  return <Check size={13} className="text-gray-400" />;
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
export default function MessageBubble({ message, isOwn, showAvatar, sender }) {
  const [activePanel, setActivePanel] = useState(null);
  const bubbleRef = useRef(null);
  const phone = useIsPhone();

  const reactions = message.reactions || {};
  const myUserId = JSON.parse(localStorage.getItem("chat_user") || "{}")._id;
  const myReaction = reactions[myUserId];

  // ── Actions ─────────────────────────────────────────
  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    toast.success("Copied!");
  };

  const handleDelete = async () => {
    await axios.delete(`/messages/${message._id}`);
    toast.success("Deleted");
  };

  const handleReact = async (emoji) => {
    setActivePanel(null);
    await axios.post(`/messages/${message._id}/react`, { emoji });
  };

  // ── Mobile tap ──────────────────────────────────────
  const onTouchEnd = () => {
    setActivePanel((prev) => (prev === "reactions" ? null : "reactions"));
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
      {!isOwn && showAvatar && <Avatar user={sender} size="xs" />}

      <div className="relative" ref={bubbleRef}>
        {/* ✅ Mobile Reaction Bar */}
        {phone && activePanel === "reactions" && (
          <div className="absolute bottom-full mb-2 z-50">
            <EmojiBar currentReaction={myReaction} onReact={handleReact} />
          </div>
        )}

        {/* Desktop hover */}
        {!phone && (
          <div className="absolute -top-8 opacity-0 group-hover:opacity-100">
            <button onClick={() => setActivePanel("reactions")}>
              <SmilePlus size={14} />
            </button>
            <button onClick={() => setActivePanel("menu")}>
              <MoreHorizontal size={14} />
            </button>
          </div>
        )}

        {/* Desktop reaction */}
        {!phone && activePanel === "reactions" && (
          <div className="absolute bottom-full mb-2">
            <EmojiBar currentReaction={myReaction} onReact={handleReact} />
          </div>
        )}

        {/* Desktop menu */}
        {!phone && activePanel === "menu" && (
          <ContextMenu
            isOwn={isOwn}
            messageType={message.type}
            content={message.content}
            fileName={message.fileName}
            onCopy={handleCopy}
            onDelete={handleDelete}
            onClose={() => setActivePanel(null)}
          />
        )}

        {/* Message bubble */}
        <div
          onTouchEnd={phone ? onTouchEnd : undefined}
          className={`px-3 py-2 rounded-xl ${
            isOwn ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          {message.content}
          <div className="text-[10px] mt-1 flex justify-end gap-1">
            {formatMessageTime(message.createdAt)}
            {isOwn && <TickIcon status={message.status} />}
          </div>
        </div>
      </div>
    </div>
  );
}
