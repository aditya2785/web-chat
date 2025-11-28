import React, { useContext } from "react";
import { ChatContext } from "../../context/ChatContext";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import RightSidebar from "../components/RightSidebar";

const HomePage = () => {
  const { selectedUser, setSelectedUser } = useContext(ChatContext);

  return (
    <div className="w-screen h-screen bg-[#0f172a] overflow-hidden">

      {/* DESKTOP MODE (>= 768px) */}
      <div
        className="
          hidden md:grid w-full h-full 
          transition-all duration-300
          grid-cols-[300px_1fr_320px]
          xl:grid-cols-[320px_1fr_360px]
        "
      >
        {/* LEFT SIDEBAR */}
        <div className="border-r border-gray-700 bg-[#1e293b] h-full">
          <Sidebar />
        </div>

        {/* CHAT */}
        <div className="h-full flex flex-col overflow-hidden">
          <ChatContainer />
        </div>

        {/* RIGHT SIDEBAR */}
        {selectedUser && (
          <div className="border-l border-gray-700 bg-[#1e293b] h-full">
            <RightSidebar />
          </div>
        )}
      </div>

      {/* MOBILE MODE (< 768px) */}
      <div className="md:hidden w-full h-full relative">

        {/* SIDEBAR FULLSCREEN ON MOBILE */}
        {!selectedUser && (
          <div className="absolute w-full h-full bg-[#1e293b] animate-fadeIn">
            <Sidebar />
          </div>
        )}

        {/* CHAT FULLSCREEN ON MOBILE */}
        {selectedUser && (
          <div className="absolute w-full h-full bg-[#0f172a] animate-slideLeft">

            {/* WHATSAPP-LIKE TOP BAR */}
            <div className="flex items-center gap-4 px-4 py-3 bg-[#1e293b] border-b border-gray-700">
              <button
                onClick={() => setSelectedUser(null)}
                className="text-white text-xl mr-2"
              >
                ←
              </button>

              <img
                src={selectedUser?.profilePic}
                className="w-10 h-10 rounded-full"
                alt=""
              />

              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">
                  {selectedUser?.fullName}
                </span>
              </div>
            </div>

            {/* CHAT */}
            <ChatContainer />
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
