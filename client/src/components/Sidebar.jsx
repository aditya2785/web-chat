import React, { useEffect, useContext, useState, useRef } from "react";
import assets from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";
import toast from "react-hot-toast";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
    mobileView,
    setMobileView,
  } = useContext(ChatContext);

  const { authUser, logout, onlineUsers, axios } = useContext(AuthContext);

  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Load users
  useEffect(() => {
    if (authUser?._id) getUsers();
  }, [authUser, onlineUsers]);

  // Close menu if clicked outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredUsers = input
    ? users.filter((u) =>
        u.fullName.toLowerCase().includes(input.toLowerCase())
      )
    : users;

  const sidebarHidden =
    mobileView !== "sidebar" ? "hidden md:flex" : "flex";

  return (
    <div
      className={`${sidebarHidden} h-full bg-[#111b21] text-white flex-col w-full md:w-auto`}
    >

      {/* HEADER – WhatsApp Style */}
      <div className="p-4 bg-[#202c33] border-b border-black/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={authUser?.profilePic || assets.avatar_icon}
            className="w-11 h-11 rounded-full object-cover"
          />
          <p className="font-semibold text-sm">{authUser?.fullName}</p>
        </div>

        <div className="relative" ref={menuRef}>
          <img
            src={assets.menu_icon}
            className="w-5 cursor-pointer brightness-150"
            onClick={() => setMenuOpen(!menuOpen)}
          />

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg bg-[#233138] border border-black/30 shadow-xl z-50">
              <p
                onClick={() => {
                  navigate("/profile");
                  setMenuOpen(false);
                }}
                className="px-4 py-3 hover:bg-[#2a3942] cursor-pointer text-sm"
              >
                Profile
              </p>

              <p
                onClick={logout}
                className="px-4 py-3 hover:bg-red-600/30 cursor-pointer text-sm text-red-400"
              >
                Logout
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SEARCH BAR – WhatsApp Style */}
      <div className="p-3 bg-[#111b21] border-b border-black/20">
        <div className="bg-[#202c33] flex items-center px-3 py-2 rounded-xl">
          <span className="text-gray-400 text-lg">🔍</span>
          <input
            type="text"
            placeholder="Search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="bg-transparent flex-1 px-2 outline-none text-sm text-white"
          />
        </div>
      </div>

      {/* USERS LIST */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.map((user) => (
          <div
            key={user._id}
            className={`
              flex items-center gap-3 px-4 py-3 cursor-pointer 
              border-b border-black/10
              ${selectedUser?._id === user._id ? "bg-[#2a3942]" : "hover:bg-[#1f2c33]"}
            `}
            onClick={() => {
              setSelectedUser(user);
              setUnseenMessages((prev) => ({ ...prev, [user._id]: 0 }));
              setMobileView("chat"); // Mobile → open chat fullscreen
            }}
          >
            <div className="relative">
              <img
                src={user.profilePic || assets.avatar_icon}
                className="w-12 h-12 rounded-full object-cover"
              />
              {onlineUsers?.includes(user._id) && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-[#111b21]" />
              )}
            </div>

            <div className="flex-1">
              <p className="font-medium text-[15px]">{user.fullName}</p>
              <p className="text-xs text-gray-400">
                {onlineUsers?.includes(user._id) ? "online" : "offline"}
              </p>
            </div>

            {/* Unseen Messages Badge */}
            {unseenMessages[user._id] > 0 && (
              <div className="bg-green-600 text-white rounded-full text-xs px-2 py-1">
                {unseenMessages[user._id]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
