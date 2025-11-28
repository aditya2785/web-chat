// context/ChatContext.jsx
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, _setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [autoScroll, setAutoScroll] = useState(true);

  // MOBILE NAV: "sidebar" | "chat" | "profile"
  const [mobileView, setMobileView] = useState("sidebar");

  // focus/visibility state for notifications
  const [windowFocused, setWindowFocused] = useState(true);

  // from AuthContext
  const { socket, axios, authUser, onlineUsers } = useContext(AuthContext);

  // keep latest selectedUser id in a ref for socket handlers
  const selectedUserIdRef = useRef(null);
  useEffect(() => {
    selectedUserIdRef.current = selectedUser?._id || null;
  }, [selectedUser]);

  // wrapper to set selectedUser + helpful mobile behaviour
  const setSelectedUser = (user) => {
    _setSelectedUser(user);
    // if on mobile, switch to chat view
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileView("chat");
    }
  };

  // ================= VISIBLE / FOCUS TRACKING (for notifications) =================
  useEffect(() => {
    const onVisibility = () => setWindowFocused(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", () => setWindowFocused(true));
    window.addEventListener("blur", () => setWindowFocused(false));
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", () => setWindowFocused(true));
      window.removeEventListener("blur", () => setWindowFocused(false));
    };
  }, []);

  // Request notification permission when authUser logs in (best-effort)
  useEffect(() => {
    if (!authUser) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [authUser]);

  // ================= GET USERS =================
  const getUsers = async () => {
    try {
      if (!authUser) return;

      const { data } = await axios.get("/api/users/users");

      if (data.success) {
        setUsers(data.users || []);
        setUnseenMessages(data.unseenMessages || {});
        // ensure mobile shows sidebar after loading users
        setMobileView("sidebar");
      } else {
        toast.error(data.message || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Fetch users error:", error);
      toast.error("Failed to fetch users");
    }
  };

  // ================= GET MESSAGES =================
  const getMessages = async (userId) => {
    try {
      if (!userId) return;
      const { data } = await axios.get(`/api/messages/${userId}`);

      if (data.success) {
        setMessages(data.messages || []);

        // Reset unseen count
        setUnseenMessages((prev) => ({
          ...prev,
          [userId]: 0,
        }));

        setAutoScroll(true); // scroll to bottom after loading chat
      } else {
        toast.error(data.message || "Failed to load messages");
      }
    } catch (error) {
      console.error("Get messages error:", error);
      toast.error("Failed to load messages");
    }
  };

  // ================= SEND MESSAGE (REST) =================
  const sendMessage = async (payload) => {
    try {
      if (!selectedUser?._id) return;

      const { data } = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        payload
      );

      if (data.success) {
        // append new message locally (optimistic)
        setMessages((prev) => [...prev, data.newMessage]);
        setAutoScroll(true);
      } else {
        toast.error(data.message || "Message send failed");
      }
    } catch (error) {
      console.error("Send message error:", error);
      toast.error("Message failed");
    }
  };

  // ================= TYPING EMIT =================
  const emitTyping = () => {
    if (!socket || !selectedUser || !authUser) return;

    socket.emit("typing", {
      senderId: authUser._id,
      receiverId: selectedUser._id,
    });
  };

  // ================= SOCKET LISTENERS =================
  useEffect(() => {
    // require both socket and authUser
    if (!socket || !authUser) return;

    // define handlers so we can remove them reliably
    const handleNewMessage = async (message) => {
      try {
        const openChatId = selectedUserIdRef.current;

        // If this is an incoming message from someone else
        const fromOther = message.senderId !== authUser._id;

        if (openChatId && message.senderId === openChatId) {
          // message belongs to currently open chat
          setMessages((prev) => [...prev, message]);

          // mark seen on server (best-effort)
          axios.put(`/api/messages/mark/${message._id}`).catch((e) => {
            console.error("Mark seen failed", e);
          });

          // ensure autoscroll to bottom
          setAutoScroll(true);
        } else {
          // increment unseen count
          setUnseenMessages((prev) => ({
            ...prev,
            [message.senderId]: (prev[message.senderId] || 0) + 1,
          }));
        }

        // Notification: show when message is from other user and user is not focused
        if (fromOther) {
          const showNotification = typeof window !== "undefined" && (!windowFocused || document.hidden);
          if (showNotification && "Notification" in window && Notification.permission === "granted") {
            try {
              const sender = users.find((u) => String(u._id) === String(message.senderId)) || {};
              const title = sender.fullName || "New message";
              const body = message.text ? message.text : message.image ? "📷 Photo" : message.file ? `📎 ${message.file.name}` : "New message";
              const notif = new Notification(title, {
                body,
                // tag to avoid stacking many notifications for same chat
                tag: `chat-${message.senderId}`,
                icon: sender.profilePic || undefined,
              });
              // clicking notification focuses the window (best-effort)
              notif.onclick = () => {
                window.focus();
                // open the chat with sender
                setSelectedUser(sender);
                setMobileView("chat");
              };
            } catch (err) {
              // swallow notification errors
              console.warn("Notification error:", err);
            }
          }
        }
      } catch (err) {
        console.error("handleNewMessage error:", err);
      }
    };

    const handleDelivered = (id) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === id ? { ...msg, delivered: true } : msg))
      );
    };

    const handleSeenUpdate = (id) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === id ? { ...msg, seen: true } : msg))
      );
    };

    const handleTyping = ({ senderId }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: true }));

      // clear after 2s
      setTimeout(() => {
        setTypingUsers((prev) => ({ ...prev, [senderId]: false }));
      }, 2000);
    };

    // register
    socket.on("newMessage", handleNewMessage);
    socket.on("messageDelivered", handleDelivered);
    socket.on("messageSeenUpdate", handleSeenUpdate);
    socket.on("typing", handleTyping);

    // cleanup
    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageDelivered", handleDelivered);
      socket.off("messageSeenUpdate", handleSeenUpdate);
      socket.off("typing", handleTyping);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, authUser, axios, users, windowFocused]);

  // ================= RELOAD USERS WHEN AUTH / ONLINE CHANGES =================
  useEffect(() => {
    if (authUser?._id) {
      getUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, onlineUsers]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        users,
        selectedUser,
        setSelectedUser,
        getUsers,
        getMessages,
        sendMessage,
        unseenMessages,
        setUnseenMessages,
        typingUsers,
        emitTyping,

        // auto-scroll control
        autoScroll,
        setAutoScroll,

        // mobile navigation
        mobileView,
        setMobileView,

        // helper (optional)
        openChat: setSelectedUser,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
