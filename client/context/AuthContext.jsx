import { createContext, useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  /* ================================
     ALWAYS ATTACH JWT TO EVERY API
  ================================== */
  axios.interceptors.request.use((config) => {
    const jwt = localStorage.getItem("token");
    if (jwt) config.headers.Authorization = `Bearer ${jwt}`;
    return config;
  });

  /* ======================
       CHECK AUTH STATUS
  ========================= */
  const checkAuth = async () => {
    try {
      const { data } = await axios.get("/api/users/check");

      if (data.success && data.user) {
        setAuthUser(data.user);
        connectSocket(data.user); // Connect after verifying user
      }
    } catch {
      setAuthUser(null);
    }
  };

  /* ======================
            LOGIN
  ========================= */
  const login = async (state, creds) => {
    try {
      const { data } = await axios.post(`/api/users/${state}`, creds);

      if (data.success) {
        localStorage.setItem("token", data.token);
        setToken(data.token);

        await checkAuth();
        toast.success(data.message);
      } else toast.error(data.message);
    } catch {
      toast.error("Login failed");
    }
  };

  /* ======================
            LOGOUT
  ========================= */
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setAuthUser(null);
    setOnlineUsers([]);

    if (socket) {
      socket.disconnect();
      setSocket(null);
    }

    toast.success("Logged out");
  };

  /* ======================
        UPDATE PROFILE
  ========================= */
  const updateProfile = async (body) => {
    try {
      const { data } = await axios.put("/api/users/update-profile", body);

      if (data.success) {
        setAuthUser(data.user);
        toast.success("Profile updated");
      }
    } catch {
      toast.error("Update failed");
    }
  };

  /* ================================================
       SOCKET CONNECTION — FIXED FOR YOUR BACKEND
  ================================================= */
  const connectSocket = (user) => {
    if (!user) return;

    // Prevent duplicate connections
    if (socket?.connected) return;

    // IMPORTANT FIX — backend requires query.userId, not token
    const newSocket = io(backendUrl, {
      auth: {
        userId: user._id,  // <-- FIXED
      },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
    });

    setSocket(newSocket);

    // Listener for online users
    newSocket.on("getOnlineUsers", (userIds) => {
      setOnlineUsers(userIds);
    });

    newSocket.on("connect_error", (err) => {
      console.warn("Socket connect error:", err.message);
    });

    newSocket.on("disconnect", () => {
      console.warn("Socket disconnected");
    });
  };

  /* ======================
        ON LOAD CHECK AUTH
  ========================= */
  useEffect(() => {
    if (token) checkAuth();
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        axios,
        authUser,
        onlineUsers,
        socket,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
