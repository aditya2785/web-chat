import React, { useContext } from "react";
import { ChatContext } from "../../context/ChatContext";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import RightSidebar from "../components/RightSidebar";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const { selectedUser, setSelectedUser, setMobileView } = useContext(ChatContext);
  const navigate = useNavigate();

  return (
    <div className="w-screen h-screen bg-[#0f172a] overflow-hidden">

      {/* DESKTOP VIEW (>=768px) */}
      <div
        className="
          hidden md:grid
          w-full h-full
          grid-cols-[300px_1fr_320px]
          xl:grid-cols-[320px_1fr_360px]
          overflow-hidden
        "
      >
        <div className="border-r border-gray-700 bg-[#1e293b] h-full">
          <Sidebar />
        </div>

        <div className="h-full overflow-hidden">
          <ChatContainer />
        </div>

        {selectedUser && (
          <div className="border-l border-gray-700 bg-[#1e293b] h-full">
            <RightSidebar />
          </div>
        )}
      </div>

      {/* MOBILE VIEW (<768px) */}
      <div className="md:hidden w-full h-full relative overflow-hidden">

        {/* SIDEBAR FULLSCREEN */}
        {!selectedUser && (
          <div className="absolute inset-0 bg-[#1e293b] overflow-hidden">
            <Sidebar />
          </div>
        )}

        {/* CHAT FULLSCREEN */}
        {selectedUser && (
          <div className="absolute inset-0 bg-[#0f172a] overflow-hidden">

            {/* MOBILE TOP BAR */}
            <div className="flex items-center gap-4 px-4 py-3 bg-[#1e293b] border-b border-gray-700">

              {/* FIXED BACK BUTTON */}
              <button
                onClick={() => {
                  setSelectedUser(null);       // Reset user
                  setMobileView("sidebar");    // Fix the blank page
                  navigate("/");               // Go back to homepage
                }}
                className="text-white text-2xl"
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

            {/* CHAT BODY */}
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
