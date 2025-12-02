// frontend/myapp/src/socket.js
import { io } from "socket.io-client";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

// create a single shared socket instance used across the app
const socket = io(BACKEND, { transports: ["websocket", "polling"] });

// optional: helpful debug logs (remove in production)
socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});
socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});

export default socket;
