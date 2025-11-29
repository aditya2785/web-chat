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

  // voice preview (local blob url + base64 for upload)
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

  /* ---------- Recording helpers ---------- */
  const startRecordTimer = () => {
    setRecordSeconds(0);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
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

  /* ---------- Start recording ---------- */
  const startRecording = async () => {
    // prevent starting if already recording or preview present
    if (recording || voicePreview) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // choose supported mimeType
      let mime = "audio/webm";
      if (!MediaRecorder.isTypeSupported(mime)) {
        mime = "audio/webm;codecs=opus";
        if (!MediaRecorder.isTypeSupported(mime)) {
          mime = "";
        }
      }

      mediaRecorder.current = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.start();
      setRecording(true);
      startRecordTimer();
    } catch (err) {
      console.error("startRecording error:", err);
      toast.error("Microphone blocked or not available");
      setRecording(false);
      stopRecordTimer();
      try {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
    }
  };

  /* ---------- Stop recording and prepare preview ---------- */
  const stopRecording = () => {
    // if not recording, ignore
    if (!recording) return;

    setRecording(false);
    stopRecordTimer();

    if (!mediaRecorder.current) {
      // cleanup
      try {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      return;
    }

    // assign onstop BEFORE calling stop
    mediaRecorder.current.onstop = () => {
      try {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        const localURL = URL.createObjectURL(blob);
        setVoicePreview(localURL);

        const reader = new FileReader();
        reader.onloadend = () => setVoicePreviewBase64(reader.result);
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error("onstop error:", err);
        toast.error("Failed to prepare recording");
      } finally {
        try {
          mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        } catch {}
      }
    };

    try {
      if (mediaRecorder.current.state !== "inactive") {
        mediaRecorder.current.stop();
      } else {
        // if already inactive, trigger onstop manually
        mediaRecorder.current.onstop();
      }
    } catch (err) {
      console.error("stopRecording error:", err);
    }
  };

  /* ---------- Cancel recording (discard) ---------- */
  const cancelRecording = () => {
    // stop and discard collected chunks
    setRecording(false);
    stopRecordTimer();

    if (mediaRecorder.current) {
      // replace onstop to just cleanup without creating preview
      mediaRecorder.current.onstop = () => {
        audioChunks.current = [];
        try {
          mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        } catch {}
      };
      if (mediaRecorder.current.state !== "inactive") {
        try {
          mediaRecorder.current.stop();
        } catch {}
      } else {
        // ensure cleanup
        audioChunks.current = [];
        try {
          mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        } catch {}
      }
    } else {
      audioChunks.current = [];
      try {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
    }

    setVoicePreview(null);
    setVoicePreviewBase64(null);
  };

  /* ---------- Send voice preview to backend ---------- */
  const sendVoicePreview = async () => {
    if (!voicePreviewBase64) return;
    try {
      // backend expects `audio` field in sendMessage (base64)
      await sendMessage({ audio: voicePreviewBase64 });
      setVoicePreview(null);
      setVoicePreviewBase64(null);
    } catch (err) {
      console.error("sendVoicePreview error:", err);
      toast.error("Failed to send voice note");
    }
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
          const audioSrc = msg.audio || msg.voice || msg.file?.audio || null;

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

                {audioSrc && (
                  <div className="mt-2">
                    <AudioPlayer src={audioSrc} isMe={isMe} />
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

      {/* ------------ VOICE PREVIEW (compact, professional) ------------ */}
      {voicePreview && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0f172a] border-t border-gray-700">
          {/* small audio player */}
          <div className="flex-1">
            <AudioPlayer src={voicePreview} isMe={true} />
            <div className="text-xs text-gray-300 mt-2">
              {Math.floor(recordSeconds / 60)
                .toString()
                .padStart(2, "0")}
              :
              {(recordSeconds % 60).toString().padStart(2, "0")}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cancelRecording}
              className="px-3 py-1 bg-red-600 rounded-lg text-white text-sm"
            >
              Cancel
            </button>

            <button
              onClick={sendVoicePreview}
              className="px-4 py-1 bg-green-500 rounded-lg text-white text-sm"
            >
              Send
            </button>
          </div>
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

          {/* TELEGRAM-STYLE MIC: small professional button */}
          <div className="relative">
            <button
              type="button"
              onPointerDown={(e) => {
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
              onPointerLeave={(e) => {
                // if user drags out while holding, cancel recording for safer UX
                if (recording) cancelRecording();
              }}
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                recording ? "bg-red-600" : "bg-blue-600 hover:bg-blue-500"
              } text-white transition-shadow`}
              aria-label="Hold to record"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" fill="white"/>
                <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.92V21a1 1 0 102 0v-3.08A7 7 0 0019 11z" fill="white"/>
              </svg>
            </button>

            {/* small recording indicator above mic */}
            {recording && (
              <div className="absolute -top-14 right-0 w-44 bg-black/80 text-white rounded-md p-2 flex items-center justify-between z-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <div className="text-sm">Recording</div>
                </div>
                <div className="text-xs">
                  {Math.floor(recordSeconds / 60)
                    .toString()
                    .padStart(2, "0")}
                  :
                  {(recordSeconds % 60).toString().padStart(2, "0")}
                </div>
              </div>
            )}
          </div>
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
