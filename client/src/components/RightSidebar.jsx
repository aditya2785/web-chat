import React, { useEffect, useContext, useState } from "react";
import assets from "../assets/assets";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const RightSidebar = () => {
  const { selectedUser, messages } = useContext(ChatContext);
  const { authUser, logout, onlineUsers } = useContext(AuthContext);
  const [msgImages, setMsgImages] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (messages && messages.length > 0) {
      const images = messages
        .filter((msg) => msg.image && typeof msg.image === "string")
        .map((msg) => msg.image);
      setMsgImages(images);
    } else {
      setMsgImages([]);
    }
  }, [messages]);

  if (!selectedUser) return null;

  const isOwnProfile = selectedUser._id === authUser?._id;

  return (
    <div className="h-full w-full bg-[#0f172a] text-white flex flex-col justify-between p-6">
      
      {/* PROFILE HEADER */}
      <div className="flex flex-col items-center gap-3 text-center">

        <div className="relative group">
          <img
            src={selectedUser?.profilePic || assets.avatar_icon}
            alt="profile"
            className="w-32 h-32 rounded-full object-cover border-4 border-violet-600 shadow-lg"
          />

          {isOwnProfile && (
            <button
              onClick={() => navigate("/profile")}
              className="absolute bottom-2 right-2 bg-violet-600 p-2 rounded-full text-xs shadow-md hover:bg-violet-700 transition"
            >
              ✏️
            </button>
          )}
        </div>

        <h1 className="text-2xl font-semibold flex items-center gap-2">
          {selectedUser.fullName}
          {onlineUsers?.includes(selectedUser._id) && (
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
          )}
        </h1>

        <p className="text-sm text-gray-400 max-w-[240px]">
          {selectedUser.bio || "No bio available"}
        </p>

        {isOwnProfile && (
          <button
            onClick={() => navigate("/profile")}
            className="mt-2 text-sm px-4 py-1 rounded-full bg-violet-600 hover:bg-violet-700 transition"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* MEDIA GALLERY */}
      <div className="mt-6 flex-1">
        <p className="text-sm font-semibold mb-3">Shared Media</p>

        <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[260px] pr-1">
          {msgImages.length > 0 ? (
            msgImages.map((url, index) => (
              <div
                key={index}
                onClick={() => window.open(url, "_blank")}
                className="cursor-pointer rounded-xl overflow-hidden hover:scale-105 transition"
              >
                <img
                  src={url}
                  className="w-full h-28 object-cover"
                  alt="media"
                />
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 col-span-2 text-center">
              No media shared yet
            </p>
          )}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col gap-3 mt-6">
        {isOwnProfile && (
          <button
            onClick={() => navigate("/profile")}
            className="bg-[#1e293b] border border-violet-500 text-violet-400 py-2 rounded-full hover:bg-violet-600 hover:text-white transition"
          >
            Update Profile
          </button>
        )}

        <button
          onClick={logout}
          className="bg-red-600 py-2 rounded-full hover:bg-red-700 transition"
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default RightSidebar;
