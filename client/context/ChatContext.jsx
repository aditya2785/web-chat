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

  const [mobileView, setMobileView] = useState("sidebar");

  // track window focus for notifications
  const [windowFocused, setWindowFocused] = useState(true);

  const { socket, axios, authUser, onlineUsers } = useContext(AuthContext);

  const selectedUserIdRef = useRef(null);
  useEffect(() => {
    selectedUserIdRef.current = selectedUser?._id || null;
  }, [selectedUser]);

  const setSelectedUser = (user) => {
    _setSelectedUser(user);

    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileView("chat");
    }
  };

  // ======== Focus / Visibility Tracking ========
  useEffect(() => {
    const onVisibility = () => setWindowFocused(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    const onFocus = () => setWindowFocused(true);
    const onBlur = () => setWindowFocused(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // request notification permission
  useEffect(() => {
    if (!authUser) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [authUser]);

  // =============== GET USERS ===============
  const getUsers = async () => {
    try {
      if (!authUser) return;

      const { data } = await axios.get("/api/users/users");

      if (data.success) {
        setUsers(data.users || []);
        setUnseenMessages(data.unseenMessages || {});
        setMobileView("sidebar");
      } else {
        toast.error(data.message || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Fetch users error:", error);
      toast.error("Failed to fetch users");
    }
  };

  // =============== GET MESSAGES ===============
  const getMessages = async (userId) => {
    try {
      if (!userId) return;

      const { data } = await axios.get(`/api/messages/${userId}`);

      if (data.success) {
        setMessages(data.messages || []);
        setUnseenMessages((prev) => ({ ...prev, [userId]: 0 }));
        setAutoScroll(true);
      } else {
        toast.error(data.message || "Failed to load messages");
      }
    } catch (error) {
      console.error("Get messages error:", error);
      toast.error("Failed to load messages");
    }
  };

  // =============== SEND MESSAGE ===============
  const sendMessage = async (payload) => {
    try {
      if (!selectedUser?._id) return;

      const { data } = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        payload
      );

      if (data.success) {
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

  // =============== TYPING EVENT ===============
  const emitTyping = () => {
    if (!socket || !selectedUser || !authUser) return;

    socket.emit("typing", {
      senderId: authUser._id,
      receiverId: selectedUser._id,
    });
  };

  // =============== SOCKET LISTENERS ===============
  useEffect(() => {
    if (!socket || !authUser) return;

    const handleNewMessage = async (message) => {
      try {
        const openChatId = selectedUserIdRef.current;
        const fromOther = message.senderId !== authUser._id;

        if (openChatId && message.senderId === openChatId) {
          setMessages((prev) => [...prev, message]);

          axios.put(`/api/messages/mark/${message._id}`).catch(() => {});
          setAutoScroll(true);
        } else {
          setUnseenMessages((prev) => ({
            ...prev,
            [message.senderId]: (prev[message.senderId] || 0) + 1,
          }));
        }

        // Show notification only when NOT focused
        if (fromOther) {
          const showNotification =
            typeof window !== "undefined" &&
            (!windowFocused || document.hidden);

          if (
            showNotification &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            const sender =
              users.find(
                (u) => String(u._id) === String(message.senderId)
              ) || null;

            if (!sender) return; // FIX #3

            const title = sender.fullName || "New message";
            const body = message.text
              ? message.text
              : message.image
              ? "📷 Photo"
              : message.file
              ? `📎 ${message.file.name}`
              : "New message";

            const notif = new Notification(title, {
              body,
              tag: `chat-${message.senderId}`,
              icon: sender.profilePic || undefined,
            });

            notif.onclick = () => {
              window.focus();
              setSelectedUser(sender);

              // FIX #2 — Only mobile should switch to chat
              if (window.innerWidth < 768) {
                setMobileView("chat");
              }
            };
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
      setTimeout(() => {
        setTypingUsers((prev) => ({ ...prev, [senderId]: false }));
      }, 2000);
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messageDelivered", handleDelivered);
    socket.on("messageSeenUpdate", handleSeenUpdate);
    socket.on("typing", handleTyping);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageDelivered", handleDelivered);
      socket.off("messageSeenUpdate", handleSeenUpdate);
      socket.off("typing", handleTyping);
    };
  }, [socket, authUser, axios, windowFocused]); // FIX #1 → removed `users`

  // reload user list
  useEffect(() => {
    if (authUser?._id) {
      getUsers();
    }
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
        autoScroll,
        setAutoScroll,
        mobileView,
        setMobileView,
        openChat: setSelectedUser,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
