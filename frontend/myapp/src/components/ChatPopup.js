import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import "./ChatPopup.css";

import socket from "../socket";
// IMPORTANT: Use the same socket instance used elsewhere.
// If your app creates new socket instances in each file (like Teacher/Student do),
// you can switch to import that shared socket. For simplicity we create a new one here
// but if you already have `const socket = io(...)` elsewhere, prefer exporting that single socket.

// const socket = io(process.env.REACT_APP_BACKEND_URL || "http://localhost:5000");

export default function ChatPopup({ role = "student", displayName = "User" }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("chat"); // chat or participants
  const [messages, setMessages] = useState([]); // {from, text, ts}
  const [text, setText] = useState("");
  const [participants, setParticipants] = useState([]);
  const messagesRef = useRef(null);

  useEffect(() => {
    // Request history once when component mounts
    socket.emit("chat:history");

    // Listen for incoming chat messages
    socket.on("chat:message", (msg) => {
      setMessages((s) => [...s, msg]);
      // auto-scroll
      setTimeout(() => {
        if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }, 40);
    });

    // Chat history load
    socket.on("chat:history", (history) => {
      if (Array.isArray(history)) setMessages(history);
      setTimeout(() => {
        if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }, 40);
    });

    // Update participants from server (server already emits 'students:update')
    socket.on("students:update", (list) => {
      setParticipants(list || []);
    });

    // If the server doesn't emit students:update immediately, request it
    socket.emit("request:students");

    return () => {
      socket.off("chat:message");
      socket.off("chat:history");
      socket.off("students:update");
    };
  }, []);

  const sendMessage = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const msg = { from: displayName || "User", text: trimmed, ts: new Date().toISOString() };
    socket.emit("chat:message", msg);
    setText("");
    // Server will broadcast back to all clients, no need for optimistic update
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <div className={`chat-popup ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="chat-header">
          <div className="chat-title">Chat</div>
          <div className="chat-tabs">
            <button className={`tab-btn ${tab === "chat" ? "active" : ""}`} onClick={() => setTab("chat")}>Chat</button>
            <button className={`tab-btn ${tab === "participants" ? "active" : ""}`} onClick={() => setTab("participants")}>Participants</button>
          </div>
          <button className="chat-close" onClick={() => setOpen(false)}>✕</button>
        </div>

        <div className="chat-body">
          {tab === "chat" && (
            <div className="messages" ref={messagesRef}>
              {messages.length === 0 && <div className="empty">No messages yet — say hi 👋</div>}
              {messages.map((m, i) => (
                <div key={i} className={`message ${m.from === displayName ? "mine" : ""}`}>
                  <div className="msg-meta">
                    <div className="msg-from">{m.from}</div>
                    <div className="msg-ts">{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <div className="msg-text">{m.text}</div>
                </div>
              ))}
            </div>
          )}

          {tab === "participants" && (
            <div className="participants">
              {participants.length === 0 && <div className="empty">No participants connected</div>}
              {participants.map((p, idx) => (
                <div key={idx} className="participant-row">
                  <div className="participant-name">{p}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="chat-footer">
          {tab === "chat" ? (
            <>
              <textarea
                className="chat-input"
                placeholder="Type a message and press Enter..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
              />
              <button className="send-btn" onClick={sendMessage}>Send</button>
            </>
          ) : (
            <div className="participants-foot">Participants show live who is connected.</div>
          )}
        </div>
      </div>

      {/* Floating bubble button */}
      <button className="chat-bubble" onClick={() => setOpen((o) => !o)} aria-label="open chat">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 10-3.37 6.73L21 21l-1.27-3.37A8.96 8.96 0 0021 12z" fill="#fff"/></svg>
      </button>
    </>
  );
}
