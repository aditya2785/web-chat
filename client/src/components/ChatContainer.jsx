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
    emitTyping
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

  const handleScroll = () => {
    const el = chatBodyRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoScroll(isAtBottom);
  };

  useEffect(() => {
    if (autoScroll) {
      scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  useEffect(() => {
    if (selectedUser) getMessages(selectedUser._id);
  }, [selectedUser]);

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

  const handleSendImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      await sendMessage({ image: reader.result });
    };
    reader.readAsDataURL(file);
  };

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
          size: file.size
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: "audio/webm" });
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

  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 bg-[#0f172a]">
        Select a chat to start messaging
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0f172a]">

      {/* HEADER */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-700">
        <img src={selectedUser.profilePic || assets.avatar_icon} className="w-10 h-10 rounded-full" />
        <div>
          <h2 className="text-white">{selectedUser.fullName}</h2>

          {/* ✅ ONLINE STATUS FIXED */}
          <p className="text-xs">
            {isTyping ? (
              <span className="text-blue-400 font-medium">Typing...</span>
            ) : onlineUsers.includes(selectedUser._id) ? (
              <span className="text-green-500 font-semibold">● Online</span>
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
        className="flex-1 overflow-y-auto p-5 space-y-4"
      >
        {messages.map((msg) => {
          const isMe = msg.senderId === authUser._id;

          return (
            <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] px-4 py-3 rounded-xl text-sm ${
                isMe ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-100"
              }`}>

                {msg.text && <p className="leading-relaxed">{msg.text}</p>}

                {msg.image && (
                  <img
                    src={msg.image}
                    className="rounded-lg cursor-pointer max-h-60 mt-2"
                    onClick={() => setPreviewImage(msg.image)}
                  />
                )}

                {msg.audio && (
                  <div className="mt-2 bg-black/30 p-2 rounded-lg">
                    <audio controls className="w-full">
                      <source src={msg.audio} type="audio/webm" />
                    </audio>
                  </div>
                )}

                {msg.file?.url && (
                  <a href={msg.file.url} download className="text-blue-300 underline block mt-2">
                    📎 {msg.file.name}
                  </a>
                )}

                <div className="text-[10px] text-gray-300 mt-1 flex justify-end gap-1">
                  {formatMessageTime(msg.createdAt)}
                  {isMe && (msg.seen ? "✔✔" : "✔")}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollEndRef}></div>
      </div>

      {/* INPUT BAR */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-3 p-4 border-t border-gray-700 bg-[#0f172a]">
        <input
          value={input}
          onChange={handleTyping}
          placeholder="Type message..."
          className="flex-1 bg-gray-800 p-3 rounded-full text-white outline-none"
        />

        <input type="file" hidden id="imgUpload" accept="image/*" onChange={handleSendImage} />
        <label htmlFor="imgUpload">
          <img src={assets.gallery_icon} className="w-6 cursor-pointer" />
        </label>

        <input type="file" hidden id="fileUpload" onChange={handleSendFile} />
        <label htmlFor="fileUpload" className="text-white text-lg cursor-pointer">📎</label>

        <button type="button" onMouseDown={startRecording} onMouseUp={stopRecording} className="text-white text-lg">
          🎤
        </button>

        <button type="submit">
          <img src={assets.send_button} className="w-8" />
        </button>
      </form>

      {previewImage && (
        <div onClick={() => setPreviewImage(null)} className="fixed inset-0 bg-black/80 flex items-center justify-center">
          <img src={previewImage} className="max-h-[90%] rounded-xl" />
        </div>
      )}

    </div>
  );
};

export default ChatContainer;
