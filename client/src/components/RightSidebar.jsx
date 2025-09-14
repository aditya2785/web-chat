import React, { useEffect, useContext, useState } from "react";
import assets from "../assets/assets";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";

const RightSidebar = () => {
  const { selectedUser, messages } = useContext(ChatContext);
  const { logout, onlineUsers } = useContext(AuthContext);
  const [msgImages, setMsgImages] = useState([]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      // Collect only valid image messages
      const images = messages
        .filter((msg) => msg.image && typeof msg.image === "string")
        .map((msg) => msg.image);
      setMsgImages(images);
    } else {
      setMsgImages([]);
    }
  }, [messages]);

  return (
    selectedUser && (
      <div
        className={`bg-[#0E0E1A] text-white w-full relative overflow-y-auto p-6 ${
          selectedUser ? "max-md:hidden" : ""
        }`}
      >
        {/* Profile section */}
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src={selectedUser?.profilePic || assets.avatar_icon}
            alt=""
            className="w-28 h-28 rounded-full object-cover shadow-lg"
          />
          <h1 className="text-xl font-semibold flex items-center gap-2">
            {onlineUsers?.includes(selectedUser._id) && (
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
            )}
            {selectedUser.fullName}
          </h1>
          <p className="text-sm text-gray-300 max-w-[200px]">
            {selectedUser.bio}
          </p>
        </div>

        <hr className="border-[#ffffff30] my-5" />

        {/* Media section */}
        <div>
          <p className="text-sm font-medium mb-3">Media</p>
          <div className="max-h-[300px] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
            {msgImages.length > 0 ? (
              msgImages.map((url, index) => (
                <div
                  key={index}
                  onClick={() => window.open(url, "_blank")}
                  className="cursor-pointer rounded-lg overflow-hidden hover:opacity-90 transition"
                >
                  <img
                    src={url}
                    alt={`media-${index}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 col-span-full">
                No media shared yet
              </p>
            )}
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          className="absolute bottom-5 left-1/2 transform -translate-x-1/2
          bg-gradient-to-r from-purple-400 to-violet-600 text-white
          text-sm font-medium py-2 px-16 rounded-full shadow-md hover:scale-105 transition"
        >
          LogOut
        </button>
      </div>
    )
  );
};

export default RightSidebar;
