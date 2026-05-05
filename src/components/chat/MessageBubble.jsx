import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Check,
  CheckCheck,
  Copy,
  Trash2,
  MoreHorizontal,
  SmilePlus,
  FileText,
  Download,
  X as XIcon,
  ExternalLink,
  ZoomIn,
} from "lucide-react";
import { formatMessageTime } from "../../utils/helpers";
import Avatar from "../ui/Avatar";
import toast from "react-hot-toast";
import axios from "axios";
import useChatStore from "../../context/chatStore";

const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "👎"];
const LONG_PRESS_MS = 480;

const isTouch = () =>
  window.matchMedia("(hover: none) and (pointer: coarse)").matches;

// ─────────────────────────────────────────────────────────
// Outside Click Hook
// ─────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────
// Lightbox (unchanged)
// ─────────────────────────────────────────────────────────
function ImageLightbox({ src, onClose }) {
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: "rgba(0,0,0,0.95)",
        backdropFilter: "blur(16px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <img
        src={src}
        onLoad={() => setLoaded(true)}
        onDoubleClick={() => setScale((s) => (s === 1 ? 2 : 1))}
        className="rounded-2xl object-contain"
        style={{
          maxWidth: "92vw",
          maxHeight: "82vh",
          transform: `scale(${scale})`,
          opacity: loaded ? 1 : 0,
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Context Menu
// ─────────────────────────────────────────────────────────
function ContextMenu({
  isOwn,
  hasText,
  onCopy,
  onDelete,
  onClose,
  anchorRef,
  position,
}) {
  const ref = useRef();
  useOutsideClick(ref, onClose, anchorRef);

  return (
    <div
      ref={ref}
      className={`absolute z-50 ${
        position === "above" ? "bottom-full mb-2" : "top-full mt-2"
      } ${isOwn ? "right-0" : "left-0"}`}
    >
      {hasText && (
        <button onMouseDown={(e) => e.preventDefault()} onClick={onCopy}>
          Copy
        </button>
      )}
      {isOwn && (
        <button onMouseDown={(e) => e.preventDefault()} onClick={onDelete}>
          Delete
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Reaction Bar
// ─────────────────────────────────────────────────────────
function ReactionBar({ onReact }) {
  return (
    <div className="absolute bottom-full mb-2 flex gap-1">
      {REACTIONS.map((e) => (
        <button key={e} onClick={() => onReact(e)}>
          {e}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────
export default function MessageBubble({ message, isOwn, sender }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [menuPosition, setMenuPosition] = useState("above");

  const bubbleRef = useRef();

  const longPressTimer = useRef();
  const longFired = useRef(false);
  const isPressing = useRef(false);

  const touch = isTouch();

  // ─────────────────────────────────────────────────────────
  // TOUCH HANDLERS
  // ─────────────────────────────────────────────────────────
  const handleTouchStart = useCallback(() => {
    isPressing.current = true;
    longFired.current = false;

    longPressTimer.current = setTimeout(() => {
      longFired.current = true;
      isPressing.current = false;

      if (bubbleRef.current) {
        const rect = bubbleRef.current.getBoundingClientRect();
        setMenuPosition(rect.top > 180 ? "above" : "below");
      }

      if (message.type === "image") {
        setShowMenu(true);
        setShowReactions(true);
      } else {
        setShowReactions(true);
      }
    }, LONG_PRESS_MS);
  }, [message.type]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);

    if (!longFired.current) {
      if (message.type === "image") return;

      if (bubbleRef.current) {
        const rect = bubbleRef.current.getBoundingClientRect();
        setMenuPosition(rect.top > 180 ? "above" : "below");
      }

      setShowMenu((p) => !p);
      setShowReactions(false);
    }

    longFired.current = false;
    isPressing.current = false;
  }, [message.type]);

  // ─────────────────────────────────────────────────────────
  // DESKTOP RIGHT CLICK
  // ─────────────────────────────────────────────────────────
  const handleContextMenu = useCallback(
    (e) => {
      if (touch) return;
      e.preventDefault();

      if (bubbleRef.current) {
        const rect = bubbleRef.current.getBoundingClientRect();
        setMenuPosition(rect.top > 180 ? "above" : "below");
      }

      setShowMenu(true);
      setShowReactions(false);
    },
    [touch],
  );

  // ─────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────
  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    toast.success("Copied");
    setShowMenu(false);
  };

  const handleDelete = async () => {
    await axios.delete(`/messages/${message._id}`);
    toast.success("Deleted");
    setShowMenu(false);
  };

  const handleReact = (emoji) => {
    console.log("React:", emoji);
    setShowReactions(false);
  };

  // ─────────────────────────────────────────────────────────
  return (
    <>
      {lightbox && (
        <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />
      )}

      <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
        {!isOwn && <Avatar user={sender} size="xs" />}

        <div className="relative" ref={bubbleRef}>
          <div
            className="p-2 rounded-xl bg-gray-200"
            onTouchStart={touch ? handleTouchStart : undefined}
            onTouchEnd={touch ? handleTouchEnd : undefined}
            onContextMenu={!touch ? handleContextMenu : undefined}
          >
            {message.type === "image" ? (
              <img
                src={message.content}
                className="rounded-xl max-w-[200px]"
                onClick={() => setLightbox(message.content)}
              />
            ) : (
              message.content
            )}
          </div>

          {showReactions && <ReactionBar onReact={handleReact} />}

          {showMenu && (
            <ContextMenu
              isOwn={isOwn}
              hasText={message.type === "text"}
              onCopy={handleCopy}
              onDelete={handleDelete}
              onClose={() => setShowMenu(false)}
              position={menuPosition}
            />
          )}
        </div>
      </div>
    </>
  );
}
