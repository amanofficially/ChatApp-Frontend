import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { useSound } from "./SoundContext";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const timerRefs = useRef({});
  const { play } = useSound();

  const addNotification = useCallback((notif) => {
    // Respect notification setting
    if (localStorage.getItem("cf-notifs") === "false") return;

    const id = `${notif.conversationId}-${Date.now()}`;
    const entry = { ...notif, id };

    let isNew = true;

    setNotifications((prev) => {
      const existing = prev.find(
        (n) => n.conversationId === notif.conversationId,
      );
      if (existing) {
        isNew = false; // already have one for this convo — don't re-play sound
        if (timerRefs.current[existing.id])
          clearTimeout(timerRefs.current[existing.id]);
        return prev.map((n) =>
          n.conversationId === notif.conversationId
            ? { ...entry, count: (n.count || 1) + 1, id: existing.id }
            : n,
        );
      }
      return [...prev, { ...entry, count: 1 }];
    });

    // 🔊 Play notification sound only for the first pop (not on count increment)
    if (isNew) {
      play("notification");
    }

    // Auto-dismiss after 4s
    timerRefs.current[id] = setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, [play]);

  const dismissNotification = useCallback((id) => {
    if (timerRefs.current[id]) clearTimeout(timerRefs.current[id]);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const dismissByConversation = useCallback((conversationId) => {
    setNotifications((prev) => {
      prev
        .filter((n) => n.conversationId === conversationId)
        .forEach((n) => {
          if (timerRefs.current[n.id]) clearTimeout(timerRefs.current[n.id]);
        });
      return prev.filter((n) => n.conversationId !== conversationId);
    });
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        dismissNotification,
        dismissByConversation,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
