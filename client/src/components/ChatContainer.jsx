// components/ChatContainer.jsx
import React, { useContext, useEffect, useState, useRef } from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utils";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";

/* ---------------- AUDIO PLAYER ---------------- */
const AudioPlayer = ({ src, isMe }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => setPos(a.currentTime);
    const onLoaded = () => setDuration(a.duration || 0);
    const onEnd = () => setPlaying(false);

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnd);

    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    playing ? a.pause() : a.play();
    setPlaying(!playing);
  };

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-full ${
        isMe ? "bg-violet-700" : "bg-gray-700"
      }`}
      style={{ minWidth: 160, maxWidth: "90%" }}
    >
      <button
        onClick={toggle}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-black/20 text-white"
      >
        {playing ? "⏸" : "▶"}
      </button>

      <div className="flex-1">
        <div className="h-2 bg-black/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/60"
            style={{ width: duration ? `${(pos / duration) * 100}%` : "0%" }}
          />
        </div>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  );
};

/* ---------------- CHAT CONTAINER ---------------- */
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
  const mediaStreamRef = useRef(null);
  const audioChunks = useRef([]);

  const [input, setInput] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef(null);

  const [voicePreview, setVoicePreview] = useState(null);
  const [voicePreviewBase64, setVoicePreviewBase64] = useState(null);

  const isTyping = typingUsers?.[selectedUser?._id];

  /* ---------- Autoscroll ---------- */
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedUser) getMessages(selectedUser._id);
  }, [selectedUser]);

  /* ---------- Send Text ---------- */
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

  /* ---------- Image ---------- */
  const handleSendImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      await sendMessage({ image: reader.result });
    };
    reader.readAsDataURL(file);
  };

  /* ---------- File ---------- */
  const handleSendFile = async (e) => {
    const file = e.target.files?.[0];
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

  /* ---------- Voice Recording ---------- */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      mediaRecorder.current = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.start();
      setRecording(true);
    } catch {
      toast.error("Microphone blocked");
    }
  };

  const stopRecording = () => {
    setRecording(false);

    if (!mediaRecorder.current) return;
    mediaRecorder.current.onstop = () => {
      const blob = new Blob(audioChunks.current, { type: "audio/webm" });
      const localURL = URL.createObjectURL(blob);

      setVoicePreview(localURL);

      const reader = new FileReader();
      reader.onloadend = () => setVoicePreviewBase64(reader.result);
      reader.readAsDataURL(blob);

      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };

    mediaRecorder.current.stop();
  };

  const cancelPreview = () => {
    setVoicePreview(null);
    setVoicePreviewBase64(null);
  };

  const sendVoicePreview = async () => {
    await sendMessage({ voice: voicePreviewBase64 });
    cancelPreview();
  };

  /* ---------- If no user ---------- */
  if (!selectedUser)
    return (
      <div className="flex items-center justify-center h-full bg-[#0f172a] text-gray-400">
        Select a chat to start messaging
      </div>
    );

  const isOnline = onlineUsers?.includes(selectedUser._id);

  return (
    <div className="flex flex-col h-full bg-[#0f172a]">

      {/* ------------ HEADER ------------ */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1e293b] border-b border-gray-700">
        <img
          src={selectedUser.profilePic || assets.avatar_icon}
          className="w-10 h-10 rounded-full"
        />
        <div>
          <h2 className="text-white text-base font-medium">{selectedUser.fullName}</h2>
          <p className="text-xs">
            {isTyping ? (
              <span className="text-blue-300">Typing…</span>
            ) : isOnline ? (
              <span className="text-green-500">● Online</span>
            ) : (
              <span className="text-gray-400">Offline</span>
            )}
          </p>
        </div>
      </div>

      {/* ------------ CHAT BODY (fixed height scroll) ------------ */}
      <div
        ref={chatBodyRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.map((msg) => {
          const isMe = msg.senderId === authUser._id;

          return (
            <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`px-3 py-2 rounded-xl max-w-[80%] text-sm ${
                  isMe ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-100"
                }`}
              >
                {msg.text && <p>{msg.text}</p>}

                {msg.image && (
                  <img
                    src={msg.image}
                    className="mt-2 rounded-lg max-h-56 cursor-pointer"
                    onClick={() => setPreviewImage(msg.image)}
                  />
                )}

                {msg.voice && (
                  <div className="mt-2">
                    <AudioPlayer src={msg.voice} isMe={isMe} />
                  </div>
                )}

                <div className="text-[10px] text-gray-300 mt-1 text-right">
                  {formatMessageTime(msg.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollEndRef}></div>
      </div>

      {/* ------------ VOICE PREVIEW ------------ */}
      {voicePreview && (
        <div className="p-4 bg-black/80 flex items-center gap-3 border-t border-gray-700">
          <audio controls src={voicePreview} className="flex-1" />

          <button onClick={cancelPreview} className="px-3 py-1 bg-red-600 rounded-lg text-white">
            Cancel
          </button>

          <button onClick={sendVoicePreview} className="px-4 py-1 bg-green-500 rounded-lg text-white">
            Send
          </button>
        </div>
      )}

      {/* ------------ INPUT BAR (fixed bottom) ------------ */}
      {!voicePreview && (
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-3 p-3 bg-[#1e293b] border-t border-gray-700"
        >
          <input
            value={input}
            onChange={handleTyping}
            placeholder="Type a message"
            className="flex-1 p-3 bg-gray-800 rounded-full text-white outline-none"
          />

          <label htmlFor="imgUpload">
            <img src={assets.gallery_icon} className="w-6 cursor-pointer" />
          </label>
          <input type="file" id="imgUpload" hidden accept="image/*" onChange={handleSendImage} />

          <label htmlFor="fileUpload" className="cursor-pointer text-xl text-white">📎</label>
          <input type="file" id="fileUpload" hidden onChange={handleSendFile} />

          {/* TELEGRAM STYLE MIC */}
          <button
            type="button"
            onPointerDown={startRecording}
            onPointerUp={stopRecording}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-white transition"
          >
            <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
              <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z"/>
              <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.92V21a1 1 0 102 0v-3.08A7 7 0 0019 11z"/>
            </svg>
          </button>
        </form>
      )}

      {/* IMAGE PREVIEW */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
        >
          <img src={previewImage} className="max-h-[90%] rounded-xl" />
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
