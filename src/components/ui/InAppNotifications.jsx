import { X, MessageCircle } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import useChatStore from "../../context/chatStore";

export default function InAppNotifications() {
  const { notifications, dismissNotification } = useNotifications();
  // Fix: use individual selectors instead of object destructuring
  const conversations = useChatStore((s) => s.conversations);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  if (!notifications.length) return null;

  const handleClick = async (notif) => {
    dismissNotification(notif.id);
    const conv = conversations.find((c) => c._id === notif.conversationId);
    if (conv) await setActiveConversation(conv);
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[320px] w-full pointer-events-none">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="pointer-events-auto flex items-start gap-3 p-3 rounded-2xl shadow-lg border border-[var(--border)] bg-[var(--bg-secondary)] backdrop-blur-md animate-slide-down cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
          onClick={() => handleClick(notif)}
        >
          <div className="flex-shrink-0 mt-0.5">
            {notif.senderAvatar ? (
              <img
                src={notif.senderAvatar}
                className="w-9 h-9 rounded-full object-cover"
                alt=""
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
                {notif.senderName?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <MessageCircle size={11} className="text-brand-500 flex-shrink-0" />
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                {notif.senderName}
              </p>
              {notif.count > 1 && (
                <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center font-semibold">
                  {notif.count > 99 ? "99+" : notif.count}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {notif.count > 1
                ? `${notif.count} new messages`
                : notif.content}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              dismissNotification(notif.id);
            }}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
          >
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}
