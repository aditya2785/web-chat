// components/ChatContainer.jsx
import React, { useContext, useEffect, useState, useRef } from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utils";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";

const ChatContainer = () => {
  const {
    messages,
    selectedUser,
    sendMessage,
    getMessages,
    typingUsers,
    emitTyping,
  } = useContext(ChatContext);

  const { authUser, onlineUsers } = useContext(AuthContext);

  const chatBodyRef = useRef(null);
  const scrollEndRef = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const [input, setInput] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const isTyping = typingUsers?.[selectedUser?._id];

  // ================= AUTO SCROLL =================
  const handleScroll = () => {
    const el = chatBodyRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoScroll(atBottom);
  };

  useEffect(() => {
    if (autoScroll) {
      scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  useEffect(() => {
    if (selectedUser) getMessages(selectedUser._id);
  }, [selectedUser]);

  // ================= SEND TEXT =================
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    await sendMessage({ text: input.trim() });
    setInput("");
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    emitTyping();
  };

  // ================= IMAGE UPLOAD =================
  const handleSendImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return toast.error("No image selected");

    if (!file.type.startsWith("image/")) return toast.error("Invalid file");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        if (!reader.result) return toast.error("Image load failed");
        await sendMessage({ image: reader.result });
      };
      reader.onerror = () => toast.error("Mobile image read failed");
      reader.readAsDataURL(file);
    } catch {
      toast.error("Error sending image");
    }
  };

  // ================= FILE UPLOAD =================
  const handleSendFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      await sendMessage({
        file: {
          url: reader.result,
          name: file.name,
          type: file.type,
          size: file.size,
        },
      });
    };
    reader.readAsDataURL(file);
  };

  // ================= AUDIO RECORDING =================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          await sendMessage({ audio: reader.result });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.current.start();
    } catch {
      toast.error("Microphone permission denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state !== "inactive") {
      mediaRecorder.current.stop();
    }
  };

  // ================= NO USER SELECTED =================
  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center min-h-full text-gray-400 bg-[#0f172a]">
        Select a chat to start messaging
      </div>
    );
  }

  const isOnline = onlineUsers?.includes(selectedUser._id);

  // ================= UI =================
  return (
    <div className="flex flex-col w-full min-h-0 bg-[#0f172a] overflow-hidden">

      {/* HEADER */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1e293b] border-b border-gray-700">
        <img
          src={selectedUser.profilePic || assets.avatar_icon}
          className="w-9 h-9 md:w-10 md:h-10 rounded-full"
        />

        <div>
          <h2 className="text-white text-sm md:text-base font-medium">
            {selectedUser.fullName}
          </h2>

          <p className="text-[10px] md:text-xs">
            {isTyping ? (
              <span className="text-blue-400">Typing...</span>
            ) : isOnline ? (
              <span className="text-green-500">● Online</span>
            ) : (
              <span className="text-gray-400">Offline</span>
            )}
          </p>
        </div>
      </div>

      {/* CHAT BODY */}
      <div
        ref={chatBodyRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-3 md:px-5 py-4 space-y-4"
      >
        {messages.map((msg) => {
          const isMe = msg.senderId === authUser._id;

          return (
            <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`px-3 py-2 rounded-xl max-w-[80%] text-xs md:text-sm ${
                  isMe ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-100"
                }`}
              >
                {msg.text && <p>{msg.text}</p>}

                {msg.image && (
                  <img
                    src={msg.image}
                    className="rounded-lg cursor-pointer max-h-56 mt-2"
                    onClick={() => setPreviewImage(msg.image)}
                  />
                )}

                {msg.audio && (
                  <audio controls className="w-full mt-2">
                    <source src={msg.audio} type="audio/webm" />
                  </audio>
                )}

                {msg.file?.url && (
                  <a href={msg.file.url} download className="text-blue-300 underline block mt-2">
                    📎 {msg.file.name}
                  </a>
                )}

                <div className="text-[9px] text-gray-300 mt-1 text-right">
                  {formatMessageTime(msg.createdAt)}
                  {isMe && (msg.seen ? " ✔✔" : " ✔")}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={scrollEndRef}></div>
      </div>

      {/* INPUT BAR */}
      <form
        onSubmit={handleSendMessage}
        className="flex items-center gap-3 p-3 md:p-4 bg-[#1e293b] border-t border-gray-700"
      >
        <input
          value={input}
          onChange={handleTyping}
          placeholder="Type a message"
          className="flex-1 bg-gray-800 p-3 rounded-full text-white outline-none"
        />

        {/* MOBILE CAMERA + GALLERY SUPPORT */}
        <input
          type="file"
          id="imgUpload"
          hidden
          accept="image/*"
          capture="environment"
          onChange={handleSendImage}
        />
        <label htmlFor="imgUpload">
          <img src={assets.gallery_icon} className="w-6 cursor-pointer" />
        </label>

        {/* FILE UPLOAD */}
        <input type="file" hidden id="fileUpload" onChange={handleSendFile} />
        <label htmlFor="fileUpload" className="text-white text-xl cursor-pointer">
          📎
        </label>

        {!input.trim() ? (
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            className="text-white text-xl"
          >
            🎤
          </button>
        ) : (
          <button type="submit" className="text-green-400 text-2xl">➤</button>
        )}
      </form>

      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
        >
          <img src={previewImage} className="max-h-[90%] rounded-xl" />
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
