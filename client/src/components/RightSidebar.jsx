// components/RightSidebar.jsx
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
    if (!messages) return;
    const imgs = messages.filter((m) => m.image).map((m) => m.image);
    setMsgImages(imgs);
  }, [messages]);

  if (!selectedUser) return null;

  const isOwnProfile = selectedUser._id === authUser?._id;

  return (
    <div className="h-full w-full bg-[#111b21] text-white flex flex-col overflow-y-auto">

      {/* HEADER */}
      <div className="px-6 py-5 bg-[#202c33] border-b border-black/20">
        <h2 className="text-lg font-semibold">Contact Info</h2>
      </div>

      {/* PROFILE CARD */}
      <div className="flex flex-col items-center p-6 border-b border-black/20">
        <img
          src={selectedUser.profilePic || assets.avatar_icon}
          className="w-32 h-32 rounded-full object-cover border-4 border-[#00a884]"
        />

        <h1 className="text-xl font-semibold mt-4 flex items-center gap-2">
          {selectedUser.fullName}
          {onlineUsers?.includes(selectedUser._id) && (
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
          )}
        </h1>

        <p className="text-gray-400 text-sm mt-1">
          {selectedUser.bio || "No bio available"}
        </p>

        {isOwnProfile && (
          <button
            onClick={() => navigate("/profile")}
            className="mt-4 px-5 py-2 bg-[#00a884] rounded-full text-white hover:bg-[#029973]"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* MEDIA */}
      <div className="px-6 py-5 border-b border-black/20">
        <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">
          Media, Links & Docs
        </p>

        {msgImages.length === 0 ? (
          <p className="text-sm text-gray-500">No media yet</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {msgImages.slice(0, 12).map((url, idx) => (
              <div
                key={idx}
                onClick={() => window.open(url, "_blank")}
                className="rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition"
              >
                <img src={url} className="w-full h-24 object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="px-6 py-5 flex flex-col gap-3">
        {isOwnProfile && (
          <button
            onClick={() => navigate("/profile")}
            className="bg-[#202c33] py-3 rounded-lg text-center hover:bg-[#2a3942]"
          >
            Update Profile
          </button>
        )}

        <button
          onClick={logout}
          className="bg-red-600 py-3 rounded-lg hover:bg-red-700 text-center"
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default RightSidebar;
