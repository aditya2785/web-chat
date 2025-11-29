// pages/HomePage.jsx
import React, { useContext, useEffect } from "react";
import { ChatContext } from "../../context/ChatContext";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import RightSidebar from "../components/RightSidebar";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const HomePage = () => {
  const { selectedUser, setSelectedUser, mobileView, setMobileView, typingUsers } =
    useContext(ChatContext);

  const { onlineUsers } = useContext(AuthContext);

  const navigate = useNavigate();

  // 🔥 FIX: When HomePage loads, ALWAYS show sidebar on mobile
  useEffect(() => {
    setMobileView("sidebar");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isTyping = selectedUser && !!typingUsers?.[selectedUser._id];
  const isOnline = selectedUser && onlineUsers?.includes(selectedUser._id);

  return (
    <div className="w-screen h-screen bg-[#0f172a] overflow-hidden">

      {/* ================ DESKTOP VIEW ================ */}
      <div
        className="
          hidden md:grid
          w-full h-full
          grid-cols-[300px_1fr_320px]
          xl:grid-cols-[320px_1fr_360px]
          overflow-hidden
        "
      >
        {/* Left Sidebar */}
        <div className="border-r border-gray-700 bg-[#1e293b] h-full overflow-hidden">
          <Sidebar />
        </div>

        {/* Chat Area */}
        <div className="h-full flex flex-col overflow-hidden">
          <ChatContainer />
        </div>

        {/* Right Sidebar */}
        {selectedUser && (
          <div className="border-l border-gray-700 bg-[#1e293b] h-full overflow-hidden">
  <RightSidebar />
</div>

        )}
      </div>

      {/* ================ MOBILE VIEW ================ */}
      <div className="md:hidden w-full h-full relative overflow-hidden">

        {/* ----------- Sidebar (FULL SCREEN) ----------- */}
        {mobileView === "sidebar" && (
          <div className="absolute inset-0 bg-[#1e293b] overflow-hidden">
            <Sidebar />
          </div>
        )}

        {/* ----------- Chat (FULL SCREEN) ----------- */}
        {mobileView === "chat" && selectedUser && (
          <div className="absolute inset-0 bg-[#0f172a] overflow-hidden">

            {/* TOP BAR (fixed) */}
            <div className="flex items-center gap-4 px-4 py-3 bg-[#1e293b] border-b border-gray-700">
              
              {/* Back Button */}
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setMobileView("sidebar");   // go back to user list
                  navigate("/");
                }}
                className="text-white text-2xl"
              >
                ←
              </button>

              <img
                src={selectedUser?.profilePic}
                className="w-10 h-10 rounded-full"
                alt="profile"
              />

              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">
                  {selectedUser?.fullName}
                </span>
                <span className="text-[11px] text-gray-300">
                  {isTyping ? (
                    <span className="text-blue-300">Typing...</span>
                  ) : isOnline ? (
                    <span className="text-green-500 font-semibold">● Online</span>
                  ) : (
                    <span className="text-gray-400">Offline</span>
                  )}
                </span>
              </div>
            </div>

            {/* Chat Screen */}
            <div className="h-[calc(100vh-56px)] overflow-hidden">
              <ChatContainer />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default HomePage;
