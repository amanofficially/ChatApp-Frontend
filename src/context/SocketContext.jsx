// ============================================================
// SocketContext.jsx — Socket.IO connection management
// Fixed: socket reconnects properly on user change (login/logout)
// Fixed: WebSocket upgrade race condition on Render cold starts
// ============================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("chat_token");

    // No user or no token — disconnect any existing socket
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setOnlineUsers([]);
      return;
    }

    // Disconnect stale socket before creating a new one
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const serverUrl = import.meta.env.VITE_SERVER_URL || "/";

    const socket = io(serverUrl, {
      auth: { token },
      // Start with polling ONLY — this avoids the "WebSocket closed before
      // connection established" error that happens when Render's server is
      // waking up from sleep and the HTTP upgrade request races the WS handshake.
      // Socket.IO will automatically upgrade to WebSocket once polling is stable.
      transports: ["polling", "websocket"],
      upgrade: true,
      // Give a generous timeout for Render free-tier cold starts (~30s wake time)
      timeout: 30000,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 8000,
      randomizationFactor: 0.5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("connect_error", () => {
      setIsConnected(false);
      // connect_error is normal during Render cold-start — Socket.IO
      // will keep retrying automatically via reconnectionAttempts above.
    });

    socket.on("onlineUsers", setOnlineUsers);

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [user]); // Re-run when user changes (login / logout)

  const getSocket = useCallback(() => socketRef.current, []);

  return (
    <SocketContext.Provider value={{ getSocket, onlineUsers, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
