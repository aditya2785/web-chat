import React, { useContext } from "react";
import { ChatContext } from "../../context/ChatContext";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import RightSidebar from "../components/RightSidebar";

const HomePage = () => {
  const { selectedUser } = useContext(ChatContext);

  return (
    <div className="w-screen h-screen bg-[#0f172a] overflow-hidden">
      <div
        className={`w-full h-full grid
        ${selectedUser
          ? "grid-cols-[320px_1fr_320px] max-lg:grid-cols-[280px_1fr]"
          : "grid-cols-[320px_1fr]"
        }`}
      >
        {/* LEFT */}
        <div className="border-r border-gray-700 bg-[#1e293b] h-full overflow-hidden">
          <Sidebar />
        </div>

        {/* CENTER CHAT */}
        <div className="h-full overflow-hidden flex flex-col">
          <ChatContainer />
        </div>

        {/* RIGHT */}
        {selectedUser && (
          <div className="border-l border-gray-700 bg-[#1e293b] h-full overflow-hidden">
            <RightSidebar />
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
