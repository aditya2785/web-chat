// components/ChatContainer.jsx
import React, { useContext, useEffect, useState, useRef } from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utils";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../..//context/AuthContext";
import toast from "react-hot-toast";

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
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().catch(() => {});
      setPlaying(true);
    }
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
        aria-label={playing ? "Pause" : "Play"}
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
        <div className="text-[10px] text-gray-200 mt-1 text-right">
          {formatMessageTime(new Date().toISOString() /* placeholder - show length if needed */)}
        </div>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  );
};

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
  const [autoScroll, setAutoScroll] = useState(true);

  // recording states
  const [recording, setRecording] = useState(false);
  const [recordingCanceled, setRecordingCanceled] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef(null);

  const isTyping = typingUsers?.[selectedUser?._id];

  // AUTO SCROLL
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

  // SEND TEXT
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

  // SEND IMAGE
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

  // SEND FILE
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

  // RECORDING HELPERS
  const startRecordTimer = () => {
    setRecordSeconds(0);
    recordTimerRef.current = setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);
  };

  const stopRecordTimer = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Audio recording not supported in this browser.");
      return;
    }

    try {
      setRecordingCanceled(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      mediaRecorder.current = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        stopRecordTimer();
        setRecording(false);

        // stop all tracks
        try {
          mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        } catch {}

        if (recordingCanceled) {
          // cleanup
          audioChunks.current = [];
          setRecordingCanceled(false);
          return;
        }

        // build blob and send
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            await sendMessage({ audio: reader.result });
          } catch (err) {
            toast.error("Failed to send audio");
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.current.start();
      setRecording(true);
      startRecordTimer();
    } catch (err) {
      console.error("startRecording error:", err);
      toast.error("Microphone permission denied");
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    } else {
      stopRecordTimer();
      setRecording(false);
    }
  };

  const cancelRecording = () => {
    setRecordingCanceled(true);
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    } else {
      audioChunks.current = [];
      setRecording(false);
      stopRecordTimer();
      try {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
    }
  };

  // NO USER SELECTED
  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center min-h-full text-gray-400 bg-[#0f172a]">
        Select a chat to start messaging
      </div>
    );
  }

  const isOnline = onlineUsers?.includes(selectedUser._id);

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
                  <div className="mt-2">
                    <AudioPlayer src={msg.audio} isMe={isMe} />
                  </div>
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

        {/* IMAGE */}
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

        {/* FILE */}
        <input type="file" hidden id="fileUpload" onChange={handleSendFile} />
        <label htmlFor="fileUpload" className="text-white text-xl cursor-pointer">
          📎
        </label>

        {/* TELEGRAM-STYLE MIC BUTTON (Normal size) */}
        {!input.trim() ? (
          <div className="relative">
            <button
              type="button"
              onPointerDown={(e) => {
                // prevent focusing the input
                e.preventDefault();
                startRecording();
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                stopRecording();
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                cancelRecording();
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2a6df6] hover:bg-[#245ed6] active:scale-95 transition text-white shadow-sm"
              aria-label="Hold to record"
            >
              {/* White mic svg */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" fill="white"/>
                <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.92V21a1 1 0 102 0v-3.08A7 7 0 0019 11z" fill="white"/>
              </svg>
            </button>

            {/* Recording overlay (shows while recording) */}
            {recording && (
              <div className="absolute -top-16 right-0 w-64 bg-black/80 text-white rounded-lg p-3 flex items-center justify-between gap-3 z-50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <div>
                    <div className="text-sm">Recording</div>
                    <div className="text-xs text-gray-200">
                      {Math.floor(recordSeconds / 60)
                        .toString()
                        .padStart(2, "0")}
                      :
                      {(recordSeconds % 60).toString().padStart(2, "0")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => cancelRecording()}
                    className="px-3 py-1 bg-red-600 rounded-md text-white text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
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
