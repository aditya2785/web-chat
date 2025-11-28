import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import assets from "../assets/assets";
import { AuthContext } from "../../context/AuthContext";

const ProfilePage = () => {
  const { authUser, updateProfile } = useContext(AuthContext);

  const [selectedImg, setSelectedImg] = useState(null);
  const navigate = useNavigate();
  const [name, setName] = useState(authUser.fullName);
  const [bio, setBio] = useState(authUser.bio);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedImg) {
      await updateProfile({ fullName: name, bio });
      navigate("/");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(selectedImg);
    reader.onload = async () => {
      const base64Image = reader.result;
      await updateProfile({
        profilePic: base64Image,
        fullName: name,
        bio,
      });
      navigate("/");
    };
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">

      <div
        className="
          w-5/6 max-w-2xl rounded-lg border-2 border-gray-600 bg-[#1e293b]/40 
          backdrop-blur-xl text-gray-300 flex items-center justify-between 
          max-sm:flex-col-reverse max-sm:w-11/12
          transition-all
        "
      >

        {/* LEFT FORM */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 p-8 flex-1 max-sm:p-6"
        >
          <h3 className="text-lg font-semibold">Profile Details</h3>

          {/* UPLOAD IMAGE */}
          <label
            htmlFor="avatar"
            className="flex items-center gap-3 cursor-pointer"
          >
            <input
              onChange={(e) => setSelectedImg(e.target.files[0])}
              type="file"
              id="avatar"
              accept=".png, .jpeg, .jpg"
              hidden
            />

            <img
              src={
                selectedImg
                  ? URL.createObjectURL(selectedImg)
                  : authUser?.profilePic || assets.avatar_icon
              }
              alt="preview"
              className="w-12 h-12 rounded-full object-cover"
            />

            <span className="text-sm text-gray-300">Upload profile image</span>
          </label>

          {/* NAME INPUT */}
          <input
            onChange={(e) => setName(e.target.value)}
            value={name}
            type="text"
            required
            placeholder="Your Name"
            className="p-2 border border-gray-500 rounded-md bg-transparent
            focus:outline-none focus:ring-2 focus:ring-violet-500 text-white"
          />

          {/* BIO INPUT */}
          <textarea
            onChange={(e) => setBio(e.target.value)}
            value={bio}
            placeholder="Write profile bio"
            required
            rows={4}
            className="p-2 border border-gray-500 rounded-md bg-transparent
            focus:outline-none focus:ring-2 focus:ring-violet-500 text-white"
          ></textarea>

          {/* BUTTON */}
          <button
            type="submit"
            className="bg-gradient-to-r from-purple-400 to-violet-600 
            text-white p-2 rounded-full text-lg cursor-pointer"
          >
            Save
          </button>
        </form>

        {/* RIGHT IMAGE PREVIEW */}
        <div className="flex items-center justify-center p-6 max-sm:p-4">
          <img
            className="
              max-w-40 w-32 h-32 md:w-44 md:h-44 rounded-full 
              object-cover shadow-lg
              max-sm:mx-auto
            "
            src={selectedImg ? URL.createObjectURL(selectedImg) : authUser?.profilePic || assets.logo_icon}
            alt="Profile Preview"
          />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
