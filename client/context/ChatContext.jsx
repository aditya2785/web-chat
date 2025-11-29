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

  const [windowFocused, setWindowFocused] = useState(true);

  const { socket, axios, authUser } = useContext(AuthContext);

  // ---------------------------------------
  // 🔥 ALWAYS store latest users in ref to avoid stale closure bugs
  // ---------------------------------------
  const usersRef = useRef([]);
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  // ---------------------------------------
  // 🔥 store selectedUserId in ref (stable)
  // ---------------------------------------
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

  // ---------------------------------------
  // Focus tracking
  // ---------------------------------------
  useEffect(() => {
    const onVis = () => setWindowFocused(!document.hidden);
    const onFocus = () => setWindowFocused(true);
    const onBlur = () => setWindowFocused(false);

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // ---------------------------------------
  // Request notification permission
  // ---------------------------------------
  useEffect(() => {
    if (!authUser) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [authUser]);

  // ---------------------------------------
  // GET USERS
  // ---------------------------------------
  const getUsers = async () => {
    try {
      if (!authUser) return;

      const { data } = await axios.get("/api/users/users");

      if (data.success) {
        setUsers(data.users || []);
        setUnseenMessages(data.unseenMessages || {});
      } else {
        toast.error(data.message || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Fetch users error:", error);
      toast.error("Failed to fetch users");
    }
  };

  // ---------------------------------------
  // GET MESSAGES
  // ---------------------------------------
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

  // ---------------------------------------
  // SEND MESSAGE
  // ---------------------------------------
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

  // ---------------------------------------
  // TYPING
  // ---------------------------------------
  const emitTyping = () => {
    if (!socket || !selectedUser || !authUser) return;

    socket.emit("typing", {
      senderId: authUser._id,
      receiverId: selectedUser._id,
    });
  };

  // ---------------------------------------
  // 🔥 FIXED SOCKET LISTENERS — stable & instant
  // ---------------------------------------
  useEffect(() => {
    if (!socket || !authUser) return;

    const handleNewMessage = (message) => {
      const openChatId = selectedUserIdRef.current;
      const fromOther = message.senderId !== authUser._id;

      // If chat is open — push message instantly
      if (openChatId && message.senderId === openChatId) {
        setMessages((prev) => [...prev, message]);
        axios.put(`/api/messages/mark/${message._id}`).catch(() => {});
        setAutoScroll(true);
      } else {
        // Increase unseen count
        setUnseenMessages((prev) => ({
          ...prev,
          [message.senderId]: (prev[message.senderId] || 0) + 1,
        }));
      }

      // desktop/mobile notification
      if (fromOther) {
        const showNotif = !windowFocused || document.hidden;

        if (
          showNotif &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          const sender =
            usersRef.current.find(
              (u) => String(u._id) === String(message.senderId)
            ) || null;

          if (!sender) return;

          const title = sender.fullName || "New message";
          const body = message.text
            ? message.text
            : message.image
            ? "📷 Photo"
            : message.file
            ? `📎 ${message.file.name}`
            : "Voice message";

          const notif = new Notification(title, {
            body,
            icon: sender.profilePic,
            tag: `chat-${message.senderId}`,
          });

          notif.onclick = () => {
            window.focus();
            setSelectedUser(sender);
            if (window.innerWidth < 768) setMobileView("chat");
          };
        }
      }
    };

    const handleDelivered = (id) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id.toString() === id.toString()
            ? { ...msg, delivered: true }
            : msg
        )
      );
    };

    const handleSeen = (id) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id.toString() === id.toString()
            ? { ...msg, seen: true }
            : msg
        )
      );
    };

    const handleTyping = ({ senderId }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: true }));
      setTimeout(() => {
        setTypingUsers((prev) => ({ ...prev, [senderId]: false }));
      }, 2000);
    };

    // attach listeners
    socket.on("newMessage", handleNewMessage);
    socket.on("messageDelivered", handleDelivered);
    socket.on("messageSeenUpdate", handleSeen);
    socket.on("typing", handleTyping);

    // cleanup
    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageDelivered", handleDelivered);
      socket.off("messageSeenUpdate", handleSeen);
      socket.off("typing", handleTyping);
    };
  }, [socket, authUser, axios]);

  // ---------------------------------------
  // INITIAL USERS LOAD (only once)
  // ---------------------------------------
  useEffect(() => {
    if (authUser?._id) {
      getUsers();
    }
  }, [authUser]);

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
