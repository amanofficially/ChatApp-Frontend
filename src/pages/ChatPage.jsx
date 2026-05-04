import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import ChatHeader from "../components/chat/ChatHeader";
import MessageList from "../components/chat/MessageList";
import MessageInput from "../components/chat/MessageInput";
import EmptyChat from "../components/chat/EmptyChat";
import useChatStore from "../context/chatStore";
import { useSocketEvents } from "../hooks/useSocketEvents";

export default function ChatPage() {
  const activeConversation = useChatStore((s) => s.activeConversation);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const fetchConversations = useChatStore((s) => s.fetchConversations);

  // On mobile:
  //   - mobileView="sidebar" → show sidebar full-width (default/home)
  //   - mobileView="chat"    → show chat panel full-width
  const [mobileView, setMobileView] = useState("sidebar");

  // Activate all real-time socket listeners
  useSocketEvents();

  // Fetch conversations once on mount
  const didFetch = useRef(false);
  useEffect(() => {
    if (!didFetch.current) {
      didFetch.current = true;
      fetchConversations();
    }
  }, [fetchConversations]);

  // Handle Android/iOS hardware back button & browser back gesture
  useEffect(() => {
    // Push an extra history entry so the first back press is caught here
    window.history.pushState({ chatPage: true }, "");

    const handlePopState = (e) => {
      if (mobileView === "chat") {
        // Back from chat → go to sidebar (home), NOT to /auth
        e.preventDefault?.();
        clearMessages();
        setActiveConversation(null);
        setMobileView("sidebar");
        // Re-push so next back press is also caught
        window.history.pushState({ chatPage: true }, "");
      } else {
        // Already on sidebar (home), re-push to prevent leaving the app
        window.history.pushState({ chatPage: true }, "");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [mobileView, clearMessages, setActiveConversation]);

  const openConversation = (conv) => {
    setMobileView("chat");
  };

  const handleBack = () => {
    clearMessages();
    setActiveConversation(null);
    setMobileView("sidebar");
    // Re-push history entry so next back is caught too
    window.history.pushState({ chatPage: true }, "");
  };

  return (
    <div className="flex h-full overflow-hidden bg-[var(--bg-primary)]">
      {/* ── Sidebar ──
          Desktop: always visible, fixed width
          Mobile: full-width when mobileView==="sidebar", hidden when mobileView==="chat"
      */}
      <div
        className={`
          flex-shrink-0
          md:w-80 md:flex md:flex-col
          ${
            mobileView === "sidebar"
              ? "flex flex-col w-full md:w-80"
              : "hidden md:flex md:flex-col"
          }
          h-full
        `}
      >
        <Sidebar
          onConversationSelect={openConversation}
          onGoHome={() => {
            setMobileView("sidebar");
          }}
        />
      </div>

      {/* ── Main chat area ──
          Desktop: always visible
          Mobile: full-width when mobileView==="chat", hidden otherwise
      */}
      <main
        className={`
          flex-1 flex flex-col min-w-0 h-full relative
          ${mobileView === "chat" ? "flex" : "hidden md:flex"}
        `}
      >
        {activeConversation ? (
          <>
            <ChatHeader conversation={activeConversation} onBack={handleBack} />
            <MessageList />
            <MessageInput />
          </>
        ) : (
          <>
            <EmptyChat />
          </>
        )}
      </main>
    </div>
  );
}
