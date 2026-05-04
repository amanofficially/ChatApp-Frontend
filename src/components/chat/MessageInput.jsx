import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Send, Smile, Paperclip, X } from "lucide-react";
import useChatStore from "../../context/chatStore";
import { useTyping } from "../../hooks/useTyping";
import { useSound } from "../../context/SoundContext";
import toast from "react-hot-toast";

// Lazy-loaded emoji picker module (cached after first load)
let EmojiPickerModule = null;

export default function MessageInput() {
  const activeConversation = useChatStore((s) => s.activeConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);

  const { play } = useSound();

  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [EmojiPicker, setEmojiPicker] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const fileRef = useRef();
  const textRef = useRef();
  const typingTimeoutRef = useRef(null);

  const { startTyping, stopTyping } = useTyping(activeConversation?._id);

  // Enter-to-send preference (defaults to true)
  const enterSend = useMemo(
    () => localStorage.getItem("cf-enter-send") !== "false",
    [],
  );

  const previewRef = useRef(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  }, [text]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e) => {
      if (!e.target.closest(".emoji-zone")) setShowEmoji(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmoji]);

  // Reset input when switching conversations
  useEffect(() => {
    setText("");
    setShowEmoji(false);
    if (previewRef.current?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(previewRef.current.url);
    }
    setPreview(null);
    previewRef.current = null;
  }, [activeConversation?._id]);

  // Keep previewRef in sync with preview state
  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Lazy-load emoji picker on first use
  const loadEmojiPicker = async () => {
    if (!EmojiPickerModule) {
      const mod = await import("emoji-picker-react");
      EmojiPickerModule = mod.default;
    }
    setEmojiPicker(() => EmojiPickerModule);
    setShowEmoji((v) => !v);
  };

  // ── Send message ────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content && !preview) return;
    if (!activeConversation || isSending) return;

    stopTyping();
    setIsSending(true);

    const capturedText = content;
    const capturedPreview = preview;

    setText("");
    setPreview(null);
    setShowEmoji(false);
    textRef.current?.focus();

    try {
      if (capturedPreview) {
        await sendMessage(activeConversation._id, capturedPreview.url, "image");
      }
      if (capturedText) {
        await sendMessage(activeConversation._id, capturedText, "text");
      }
      // 🔊 Play send sound on success
      play("message_sent");
    } catch {
      toast.error("Failed to send message");
      if (capturedText) setText(capturedText);
    } finally {
      setIsSending(false);
    }
  }, [text, preview, activeConversation, sendMessage, stopTyping, isSending, play]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && enterSend) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);

    if (val) {
      startTyping();
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => stopTyping(), 2000);
    } else {
      stopTyping();
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview({ file, url, name: file.name, type: file.type });
    e.target.value = "";
  };

  const onEmojiClick = (emojiData) => {
    setText((t) => t + emojiData.emoji);
    textRef.current?.focus();
  };

  if (!activeConversation) return null;

  const canSend = !isSending && !!(text.trim() || preview);

  return (
    <div className="px-4 pb-4 pt-2 bg-[var(--bg-secondary)] flex-shrink-0 border-t border-[var(--border)]">
      {/* File / image preview */}
      {preview && (
        <div className="mb-3 relative inline-block animate-bounce-in">
          {preview.type?.startsWith("image/") ? (
            <img
              src={preview.url}
              alt="preview"
              className="h-24 w-24 object-cover rounded-xl border border-[var(--border)]"
            />
          ) : (
            <div className="h-14 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] flex items-center gap-2">
              <Paperclip size={15} className="text-brand-500" />
              <span className="text-xs text-[var(--text-secondary)] truncate max-w-[120px]">
                {preview.name}
              </span>
            </div>
          )}
          <button
            onClick={() => {
              URL.revokeObjectURL(preview.url);
              setPreview(null);
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Emoji picker (lazy loaded) */}
      {showEmoji && EmojiPicker && (
        <div className="mb-2 animate-slide-up emoji-zone">
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme="auto"
            height={300}
            width="100%"
            lazyLoadEmojis
            skinTonesDisabled
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attach file button */}
        <button
          onClick={() => fileRef.current?.click()}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                     bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-[var(--text-secondary)]
                     transition-all duration-200 active:scale-90"
          title="Attach file"
        >
          <Paperclip size={17} />
        </button>

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx"
          onChange={handleFile}
        />

        {/* Textarea + emoji */}
        <div
          className="flex-1 relative bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-2xl
                      focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:border-brand-500
                      transition-all duration-200 flex items-end"
        >
          <textarea
            ref={textRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)]
                       placeholder:text-[var(--text-muted)] resize-none outline-none
                       px-4 py-3 max-h-32 leading-relaxed"
            style={{ scrollbarWidth: "none", overflow: "hidden" }}
          />
          <button
            onClick={loadEmojiPicker}
            className={`emoji-zone p-2.5 mr-1 transition-colors ${
              showEmoji
                ? "text-brand-500"
                : "text-[var(--text-muted)] hover:text-brand-400"
            }`}
          >
            <Smile size={18} />
          </button>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                      transition-all duration-200 active:scale-90
                      ${
                        canSend
                          ? "bg-brand-500 hover:bg-brand-600 text-white shadow-glow"
                          : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed"
                      }`}
        >
          <Send size={17} className={canSend ? "translate-x-px" : ""} />
        </button>
      </div>
    </div>
  );
}
