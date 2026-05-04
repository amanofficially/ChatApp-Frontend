// ============================================================
// useTyping.js — Typing indicator hook
// Fixed: correct event names, debounced stop, proper cleanup
// ============================================================

import { useRef, useCallback, useEffect } from "react";
import { useSocket } from "../context/SocketContext";

export function useTyping(conversationId) {
  const { getSocket } = useSocket();
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  // Keep convId in ref so cleanup closures have latest value
  const convIdRef = useRef(conversationId);

  useEffect(() => {
    convIdRef.current = conversationId;
  }, [conversationId]);

  // Stop typing when component unmounts or conversation changes
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      const socket = getSocket();
      if (socket && isTypingRef.current && convIdRef.current) {
        socket.emit("typingStop", { conversationId: convIdRef.current });
        isTypingRef.current = false;
      }
    };
  }, [conversationId, getSocket]);

  const stopTyping = useCallback(() => {
    clearTimeout(typingTimeoutRef.current);
    if (!isTypingRef.current) return;

    isTypingRef.current = false;
    const socket = getSocket();
    if (socket && convIdRef.current) {
      socket.emit("typingStop", { conversationId: convIdRef.current });
    }
  }, [getSocket]);

  const startTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket || !convIdRef.current) return;

    // Always emit typingStart (server debounces display)
    socket.emit("typingStart", { conversationId: convIdRef.current });
    isTypingRef.current = true;

    // Auto-stop after 2 seconds of no new keystrokes
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  }, [getSocket, stopTyping]);

  return { startTyping, stopTyping };
}
