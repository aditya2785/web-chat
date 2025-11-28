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
    if (authUser?._id) {
      getUsers();
    }
  }, [authUser, onlineUsers]);

  // Close menu if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Delete user
  const deleteUser = async (userId, fullName) => {
    if (!window.confirm(`Delete ${fullName}? This cannot be undone.`)) return;

    try {
      const { data } = await axios.delete(`/api/users/delete/${userId}`);
      if (data.success) {
        toast.success("User deleted");
        getUsers();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  // Search filter
  const filteredUsers = input
    ? users.filter((user) =>
        user.fullName.toLowerCase().includes(input.toLowerCase())
      )
    : users;

  // ✅ HIDE sidebar when chat is open on mobile
  const sidebarHidden =
    mobileView !== "sidebar" ? "hidden md:flex" : "flex";

  return (
    <div className={`${sidebarHidden} h-full bg-[#1e293b] text-white flex-col w-full md:w-auto`}>

      {/* HEADER */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={authUser?.profilePic || assets.avatar_icon}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <p className="text-sm font-semibold">{authUser?.fullName}</p>
            {authUser?.isAdmin && (
              <span className="text-xs text-yellow-400 font-bold">ADMIN</span>
            )}
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <img
            src={assets.menu_icon}
            className="w-5 cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
          />

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-lg bg-[#0f172a] border border-gray-700 shadow-xl z-50">
              <p
                onClick={() => {
                  navigate("/profile");
                  setMenuOpen(false);
                }}
                className="px-4 py-3 hover:bg-gray-700 cursor-pointer text-sm"
              >
                Edit Profile
              </p>
              <p
                onClick={logout}
                className="px-4 py-3 hover:bg-red-600 cursor-pointer text-sm text-red-400"
              >
                Logout
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SEARCH */}
      <div className="p-3">
        <input
          type="text"
          placeholder="Search users..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="bg-[#0f172a] px-4 py-2 rounded-full outline-none w-full text-sm"
        />
      </div>

      {/* USERS LIST */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.map((user) => (
          <div
            key={user._id}
            className={`flex items-center gap-3 px-4 py-3 transition ${
              selectedUser?._id === user._id
                ? "bg-[#0f172a]"
                : "hover:bg-[#273449]"
            }`}
          >

            <div
              onClick={() => {
                setSelectedUser(user);
                setUnseenMessages((prev) => ({ ...prev, [user._id]: 0 }));

                // ✅ Go to chat screen on mobile
                setMobileView("chat");
              }}
              className="flex items-center gap-3 flex-1 cursor-pointer"
            >
              <img
                src={user?.profilePic || assets.avatar_icon}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="font-medium">{user.fullName}</p>

                {onlineUsers?.includes(user._id) ? (
                  <span className="text-xs text-green-500 font-semibold">● Online</span>
                ) : (
                  <span className="text-xs text-gray-400">Offline</span>
                )}
              </div>
            </div>

            {authUser?.isAdmin === true && (
              <button
                onClick={() => deleteUser(user._id, user.fullName)}
                className="text-red-500 font-bold hover:text-red-700"
              >
                ❌
              </button>
            )}

          </div>
        ))}
      </div>

    </div>
  );
};

export default Sidebar;
