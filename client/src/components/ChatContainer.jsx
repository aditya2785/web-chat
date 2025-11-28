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
  const [showAttachMenu, setShowAttachMenu] = useState(false);

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
    reader.onloadend = async () => await sendMessage({ image: reader.result });
    reader.readAsDataURL(file);
  };

  const handleSendFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () =>
      await sendMessage({
        file: {
          url: reader.result,
          name: file.name,
          type: file.type,
          size: file.size,
        },
      });

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

        reader.onloadend = async () => await sendMessage({ audio: reader.result });

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
    <div className="flex flex-col w-full h-full bg-[#0f172a] overflow-hidden">

      {/* HEADER (WhatsApp-style) */}
      <div className="
        flex items-center gap-3 px-4 py-3 bg-[#1f2c33] 
        border-b border-black/20 sticky top-0 z-30
      ">
        <img
          src={selectedUser.profilePic || assets.avatar_icon}
          className="w-10 h-10 rounded-full"
        />
        <div>
          <h2 className="text-white text-sm font-medium">
            {selectedUser.fullName}
          </h2>

          <p className="text-[11px] text-gray-300">
            {isTyping ? (
              <span className="text-green-400">typing...</span>
            ) : onlineUsers.includes(selectedUser._id) ? (
              <span className="text-green-500">online</span>
            ) : (
              "offline"
            )}
          </p>
        </div>
      </div>

      {/* CHAT BODY (Only scrollable part) */}
      <div
        onScroll={handleScroll}
        ref={chatBodyRef}
        className="
          flex-1 overflow-y-auto px-3 py-4 space-y-3
          bg-[url('/chatbg.png')] bg-cover bg-center
          scrollbar-thin scrollbar-thumb-gray-600
        "
      >
        {messages.map((msg) => {
          const isMe = msg.senderId === authUser._id;

          return (
            <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`
                  px-3 py-2 rounded-lg max-w-[75%] text-sm shadow 
                  ${isMe ? "bg-[#005c4b] text-white" : "bg-[#202c33] text-white"}
                `}
              >
                {/* TEXT */}
                {msg.text && <p>{msg.text}</p>}

                {/* IMAGE */}
                {msg.image && (
                  <img
                    src={msg.image}
                    className="rounded-lg cursor-pointer max-h-60 mt-2"
                    onClick={() => setPreviewImage(msg.image)}
                  />
                )}

                {/* AUDIO */}
                {msg.audio && (
                  <audio controls className="w-full mt-2">
                    <source src={msg.audio} type="audio/webm" />
                  </audio>
                )}

                {/* FILE */}
                {msg.file?.url && (
                  <a
                    href={msg.file.url}
                    download
                    className="text-blue-300 underline block mt-2"
                  >
                    📎 {msg.file.name}
                  </a>
                )}

                {/* TIME */}
                <div className="text-[10px] text-gray-300 mt-1 flex justify-end">
                  {formatMessageTime(msg.createdAt)}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={scrollEndRef}></div>
      </div>

      {/* ATTACHMENT MENU (WhatsApp popup menu) */}
      {showAttachMenu && (
        <div className="
          absolute bottom-20 right-4 bg-[#233138] p-4 rounded-xl 
          grid grid-cols-3 gap-4 shadow-xl z-40
        ">
          <label className="flex flex-col items-center cursor-pointer">
            📷
            <span className="text-white text-xs">Camera</span>
          </label>

          <label htmlFor="imgUpload" className="flex flex-col items-center cursor-pointer">
            🖼️
            <span className="text-white text-xs">Gallery</span>
          </label>

          <label htmlFor="fileUpload" className="flex flex-col items-center cursor-pointer">
            📁
            <span className="text-white text-xs">Document</span>
          </label>
        </div>
      )}

      {/* INPUT BAR (WhatsApp style) */}
      <form
        onSubmit={handleSendMessage}
        className="
          flex items-center gap-3 p-3 bg-[#1f2c33]
          border-t border-black/20 sticky bottom-0 z-30
        "
      >
        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          className="text-white text-2xl"
        >
          📎
        </button>

        {/* Input */}
        <input
          value={input}
          onChange={handleTyping}
          placeholder="Message"
          className="flex-1 bg-[#2a3942] p-3 rounded-xl text-white outline-none"
        />

        {/* Hidden Inputs */}
        <input id="imgUpload" hidden type="file" accept="image/*" onChange={handleSendImage} />
        <input id="fileUpload" hidden type="file" onChange={handleSendFile} />

        {/* Mic */}
        {!input.trim() && (
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            className="text-white text-2xl"
          >
            🎤
          </button>
        )}

        {/* Send Button */}
        {input.trim() && (
          <button type="submit" className="text-green-400 text-2xl">
            ➤
          </button>
        )}
      </form>

      {/* Full Image Preview */}
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
