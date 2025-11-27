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

  // ✅ Always attach JWT
  axios.interceptors.request.use((config) => {
    const jwt = localStorage.getItem("token");
    if (jwt) {
      config.headers.Authorization = `Bearer ${jwt}`;
    }
    return config;
  });

  // ================= CHECK AUTH =================
  const checkAuth = async () => {
    try {
      const { data } = await axios.get("/api/users/check");

      if (data.success && data.user) {
        setAuthUser(data.user); // ✅ includes isAdmin
        connectSocket(data.user);
      }
    } catch {
      setAuthUser(null);
    }
  };

  // ================= LOGIN =================
  const login = async (state, credentials) => {
    try {
      const { data } = await axios.post(`/api/users/${state}`, credentials);

      if (data.success) {
        localStorage.setItem("token", data.token);
        setToken(data.token);

        // ✅ IMPORTANT: Force fresh user fetch so isAdmin is correct
        await checkAuth();

        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Login failed");
    }
  };

  // ================= LOGOUT =================
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setAuthUser(null);
    setOnlineUsers([]);
    if (socket) socket.disconnect();
    toast.success("Logged out");
  };

  // ================= UPDATE PROFILE =================
  const updateProfile = async (body) => {
    try {
      const { data } = await axios.put("/api/users/update-profile", body);
      if (data.success) {
        setAuthUser(data.user); // ✅ keep role synced
        toast.success("Profile updated");
      }
    } catch {
      toast.error("Profile update failed");
    }
  };

  // ================= SOCKET =================
  const connectSocket = (userData) => {
    if (!userData || socket?.connected) return;

    const newSocket = io(backendUrl, {
      query: { userId: userData._id },
    });

    setSocket(newSocket);

    newSocket.on("getOnlineUsers", (userIds) => {
      setOnlineUsers(userIds);
    });
  };

  useEffect(() => {
    if (token) {
      checkAuth();
    }
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
