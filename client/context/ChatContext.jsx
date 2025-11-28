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

  // ================= GET USERS =================
  const getUsers = async () => {
    try {
      if (!authUser) return;

      const { data } = await axios.get("/api/users/users");

      if (data.success) {
        setUsers(data.users || []);
        setUnseenMessages(data.unseenMessages || {});

        // Ensure mobile shows sidebar after loading users (fix blank screens)
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

  // ================= SEND MESSAGE =================
  const sendMessage = async (payload) => {
    try {
      if (!selectedUser?._id) return;

      const { data } = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        payload
      );

      if (data.success) {
        setMessages((prev) => [...prev, data.newMessage]);
        setAutoScroll(true); // ensure scroll down after sending message
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
    if (!socket || !authUser) return;

    // NEW MESSAGE
    const handleNewMessage = async (message) => {
      const openChatId = selectedUserIdRef.current;

      if (openChatId && message.senderId === openChatId) {
        // message belongs to currently open chat
        setMessages((prev) => [...prev, message]);

        // mark seen on server
        try {
          await axios.put(`/api/messages/mark/${message._id}`);
        } catch (e) {
          console.error("Mark seen failed", e);
        }

        // auto-scroll only if user is at bottom (ChatContainer should manage autoScroll state)
        setAutoScroll(true);
      } else {
        // increment unseen count
        setUnseenMessages((prev) => ({
          ...prev,
          [message.senderId]: (prev[message.senderId] || 0) + 1,
        }));
      }
    };

    // DELIVERED
    const handleDelivered = (id) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === id ? { ...msg, delivered: true } : msg))
      );
    };

    // SEEN
    const handleSeenUpdate = (id) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === id ? { ...msg, seen: true } : msg))
      );
    };

    // TYPING
    const handleTyping = ({ senderId }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: true }));

      // clear after 2s
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
  }, [socket, authUser, axios]);

  // ================= RELOAD USERS WHEN AUTH / ONLINE CHANGES =================
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
