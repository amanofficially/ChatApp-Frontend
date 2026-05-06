import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Smile, Paperclip, X, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import useChatStore from "../../context/chatStore";
import { useTyping } from "../../hooks/useTyping";
import { useSound } from "../../context/SoundContext";
import axios from "axios";
import toast from "react-hot-toast";

let EmojiPickerModule = null;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export default function MessageInput() {
  const activeConversation = useChatStore((s) => s.activeConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const { play } = useSound();

  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [EmojiPicker, setEmojiPicker] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  const fileRef = useRef();
  const textRef = useRef();
  const typingTimeoutRef = useRef(null);
  const previewRef = useRef(null);
  const convIdRef = useRef(null);

  const { startTyping, stopTyping } = useTyping(activeConversation?._id);

  const [enterSend, setEnterSend] = useState(
    () => localStorage.getItem("cf-enter-send") !== "false",
  );

  // Stay in sync when user changes setting in another tab or from SettingsModal
  useEffect(() => {
    const handler = () =>
      setEnterSend(localStorage.getItem("cf-enter-send") !== "false");
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [text]);

  // Reset on conversation switch + fix placeholder visibility
  useEffect(() => {
    if (convIdRef.current === activeConversation?._id) return;
    convIdRef.current = activeConversation?._id ?? null;

    setText("");
    setShowEmoji(false);
    if (previewRef.current?.localUrl?.startsWith("blob:"))
      URL.revokeObjectURL(previewRef.current.localUrl);
    setPreview(null);
    previewRef.current = null;

    // Force placeholder to paint after mobile view transition animation
    const t = setTimeout(() => {
      const el = textRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
      // Trigger a tiny DOM repaint so placeholder is visible immediately
      el.style.opacity = "0.99";
      requestAnimationFrame(() => { el.style.opacity = ""; });
    }, 80);
    return () => clearTimeout(t);
  }, [activeConversation?._id]);

  useEffect(() => { previewRef.current = preview; }, [preview]);
  useEffect(() => () => clearTimeout(typingTimeoutRef.current), []);

  // Close emoji on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e) => {
      if (!e.target.closest(".emoji-zone")) setShowEmoji(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showEmoji]);

  const loadEmojiPicker = async () => {
    if (!EmojiPickerModule) {
      const mod = await import("emoji-picker-react");
      EmojiPickerModule = mod.default;
    }
    setEmojiPicker(() => EmojiPickerModule);
    setShowEmoji((v) => !v);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large (max 10 MB)"); return; }
    const localUrl = URL.createObjectURL(file);
    setPreview({ file, localUrl, name: file.name, mimeType: file.type });
  };

  const clearPreview = useCallback(() => {
    if (previewRef.current?.localUrl?.startsWith("blob:"))
      URL.revokeObjectURL(previewRef.current.localUrl);
    setPreview(null);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed && !preview) return;
    if (!activeConversation || isSending) return;

    stopTyping();
    setIsSending(true);
    setUploadPct(0);

    const capturedText = trimmed;
    const capturedPreview = preview;
    setText("");
    setPreview(null);
    setShowEmoji(false);
    setTimeout(() => textRef.current?.focus(), 10);

    try {
      if (capturedPreview) {
        const base64 = await fileToBase64(capturedPreview.file);
        if (capturedPreview.localUrl?.startsWith("blob:"))
          URL.revokeObjectURL(capturedPreview.localUrl);

        const { data: uploadData } = await axios.post(
          "/upload/chat-media",
          { file: base64, name: capturedPreview.name, mimeType: capturedPreview.mimeType },
          { onUploadProgress: (e) => { if (e.total) setUploadPct(Math.round((e.loaded / e.total) * 100)); } },
        );
        setUploadPct(100);
        await sendMessage(
          activeConversation._id,
          uploadData.url,
          uploadData.type,
          uploadData.type === "file" ? uploadData.originalName : null,
        );
      }
      if (capturedText) {
        await sendMessage(activeConversation._id, capturedText, "text", null);
      }
      play("message_sent");
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message;
      toast.error(detail ? `Failed: ${detail}` : "Failed to send message");
      if (capturedText) setText(capturedText);
    } finally {
      setIsSending(false);
      setUploadPct(0);
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

  const onEmojiClick = (emojiData) => {
    setText((t) => t + emojiData.emoji);
    textRef.current?.focus();
  };

  if (!activeConversation) return null;

  const isImage = preview?.mimeType?.startsWith("image/");
  const canSend = !isSending && !!(text.trim() || preview);

  return (
    <div className="msg-input-bar px-3 pt-2 flex-shrink-0">

      {/* Upload progress */}
      {isSending && uploadPct > 0 && uploadPct < 100 && (
        <div className="mb-2 h-[3px] w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{ width: `${uploadPct}%`, background: "var(--brand)" }}
          />
        </div>
      )}

      {/* File / image preview */}
      {preview && (
        <div className="mb-2 animate-bounce-in">
          {isImage ? (
            <div className="relative inline-flex group/prev">
              <img
                src={preview.localUrl}
                alt="preview"
                className="h-[76px] w-[76px] object-cover rounded-2xl shadow-md"
                style={{ border: "2px solid color-mix(in srgb, var(--brand) 50%, transparent)" }}
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              {!isSending && (
                <button
                  onClick={clearPreview}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full
                             flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-10"
                  style={{ touchAction: "manipulation" }}
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              )}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2.5 px-3 py-2 rounded-2xl max-w-[240px]"
              style={{ background: "color-mix(in srgb, var(--brand) 8%, var(--bg-tertiary))", border: "1px solid color-mix(in srgb, var(--brand) 25%, transparent)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "color-mix(in srgb, var(--brand) 15%, transparent)" }}>
                <FileText size={15} style={{ color: "var(--brand)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{preview.name}</p>
                <p className="text-[10px] text-[var(--text-muted)]">Ready to send</p>
              </div>
              {!isSending && (
                <button
                  onClick={clearPreview}
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)", touchAction: "manipulation" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#ef4444"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && EmojiPicker && (
        <div className="mb-2 animate-slide-up emoji-zone rounded-2xl overflow-hidden shadow-xl border border-[var(--border)]">
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme="auto"
            height={280}
            width="100%"
            lazyLoadEmojis
            skinTonesDisabled
          />
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Attach */}
        <button
          onClick={() => !isSending && fileRef.current?.click()}
          disabled={isSending}
          className="msg-input-action-btn flex-shrink-0"
          style={{ touchAction: "manipulation" }}
          title="Attach file or image"
        >
          <Paperclip size={18} strokeWidth={1.8} />
        </button>

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.mp4,.mp3"
          onChange={handleFile}
        />

        {/* Textarea + emoji */}
        <div className="msg-input-wrapper flex-1">
          <textarea
            ref={textRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            disabled={isSending}
            className="msg-input-textarea"
            style={{ scrollbarWidth: "none", overflow: "hidden" }}
          />
          <button
            onClick={loadEmojiPicker}
            className={`msg-emoji-btn emoji-zone${showEmoji ? " active" : ""}`}
            style={{ touchAction: "manipulation" }}
          >
            <Smile size={19} strokeWidth={1.8} />
          </button>
        </div>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`msg-send-btn flex-shrink-0${canSend ? " can-send" : ""}`}
          style={{ touchAction: "manipulation" }}
        >
          {isSending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} strokeWidth={1.8} className={canSend ? "translate-x-px -translate-y-px" : ""} />
          )}
        </button>
      </div>

      {text.length > 30 && (
        <p className="text-[10px] text-[var(--text-muted)] text-right mt-1 pr-1 hidden sm:block select-none">
          {enterSend ? "Shift+Enter for newline" : "Enter sends are off · use Send button"}
        </p>
      )}
    </div>
  );
}
