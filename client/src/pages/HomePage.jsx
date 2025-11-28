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
        className={`
          w-full h-full grid transition-all duration-300

          /* 💻 Desktop Layout */
          ${selectedUser
            ? "grid-cols-[320px_1fr_320px] max-xl:grid-cols-[280px_1fr_280px]"
            : "grid-cols-[320px_1fr] max-xl:grid-cols-[280px_1fr]"}

          /* 📱 Mobile Layout */
          max-md:grid-cols-1
        `}
      >
        {/* LEFT SIDEBAR */}
        <div
          className={`
            border-r border-gray-700 bg-[#1e293b] h-full overflow-hidden
            max-md:${selectedUser ? "hidden" : "block"}
          `}
        >
          <Sidebar />
        </div>

        {/* CENTER CHAT */}
        <div
          className={`
            h-full overflow-hidden flex flex-col
            max-md:${selectedUser ? "block" : "hidden"}
          `}
        >
          <ChatContainer />
        </div>

        {/* RIGHT SIDEBAR (DESKTOP ONLY) */}
        {selectedUser && (
          <div
            className={`
              border-l border-gray-700 bg-[#1e293b] h-full overflow-hidden
              max-lg:hidden
            `}
          >
            <RightSidebar />
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
