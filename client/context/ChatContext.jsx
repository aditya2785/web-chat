// context/ChatContext.jsx
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});

  const { socket, axios, authUser, onlineUsers } = useContext(AuthContext);

  // keep latest selectedUser id in a ref (for socket handlers)
  const selectedUserIdRef = useRef(null);

  useEffect(() => {
    selectedUserIdRef.current = selectedUser?._id || null;
  }, [selectedUser]);

  // ================= GET USERS =================
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

  // ================= GET MESSAGES =================
  const getMessages = async (userId) => {
    try {
      if (!userId) return;
      const { data } = await axios.get(`/api/messages/${userId}`);
      if (data.success) {
        setMessages(data.messages || []);

        // reset unseen count for this user
        setUnseenMessages((prev) => ({
          ...prev,
          [userId]: 0,
        }));
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
      } else {
        toast.error(data.message || "Message send failed");
      }
    } catch (error) {
      console.error("Send message error:", error);
      toast.error("Message failed");
    }
  };

  // ================= TYPING INDICATOR (EMIT) =================
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

      // if chat with sender is open -> append & mark seen
      if (openChatId && message.senderId === openChatId) {
        setMessages((prev) => [...prev, message]);
        try {
          await axios.put(`/api/messages/mark/${message._id}`);
        } catch (e) {
          console.error("Mark seen failed", e);
        }
      } else {
        // increase unseen count
        setUnseenMessages((prev) => ({
          ...prev,
          [message.senderId]: (prev[message.senderId] || 0) + 1,
        }));
      }
    };

    // DELIVERED STATUS
    const handleDelivered = (id) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === id ? { ...msg, delivered: true } : msg
        )
      );
    };

    // SEEN STATUS
    const handleSeenUpdate = (id) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === id ? { ...msg, seen: true } : msg
        )
      );
    };

    // TYPING
    const handleTyping = ({ senderId }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [senderId]: true,
      }));

      // auto-clear after 2s
      setTimeout(() => {
        setTypingUsers((prev) => ({
          ...prev,
          [senderId]: false,
        }));
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
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
