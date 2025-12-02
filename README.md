# 📊 Live Polling System

A real-time polling platform built for Teacher–Student interaction with live updates, chat, and poll history.

## 🚀 Project Overview

The Live Polling System allows teachers to create polls in real-time and students to answer immediately. Using Socket.IO, the system updates results dynamically without any page refresh. This project was built as part of the Intervue.io SDE Intern Assignment and follows the exact Figma UI provided.

## 🛠️ Tech Stack

**Frontend**
- React (CRA)
- React Router
- Socket.IO Client
- CSS (custom styles matching Figma)

**Backend**
- Node.js
- Express.js
- Socket.IO (WebSocket server)
- CORS

## ✨ Features

### 👨‍🏫 Teacher

- Create new polls with:
  - Unlimited questions  
  - Multiple options  
  - Time limit  
  - Ability to mark correct option  
- View students currently connected  
- Remove / Kick a student  
- See live poll results updating in real-time  
- Create next poll automatically once previous ends  
- Access complete poll history (scrollable, includes correct answers and timestamps)  
- Real-time chat system with students  

### 👨‍🎓 Student

- Join using a unique name (stored per-tab)  
- Receive poll instantly when teacher creates it  
- Answer questions in real-time  
- Auto-results after timeout (60s or teacher setting)  
- Highlighted correct answers on results page  
- Real-time chat with teacher  
- See a “kicked” message if removed by teacher  

### 🔌 Real-Time Communication (Socket.IO)

A single shared WebSocket connection handles:
- Poll creation events  
- Student answer submission  
- Live result updates  
- Students joining/leaving  
- Past poll history  
- Chat messages (two-way)

---

## ⚙️ Environment Variables

### **Frontend (`/frontend/myapp/.env`):**

```bash
REACT_APP_BACKEND_URL=https://your-backend-url.onrender.com
```

### **Backend (`/backend/.env`):**

``` bash
PORT=5000
FRONTEND_URL=https://your-frontend-url.vercel.app
```

---

## ▶️ Running Locally

### **Backend**

``` bash
cd backend
npm install
npm start
```

### **Frontend**

```bash
cd frontend/myapp
npm install
npm start
```

---

### 🌐 Local URLs
- **Frontend:** http://localhost:3000  
- **Backend:** http://localhost:5000  

---


## 🌐 Deployment

### Backend – Render

- Create new Web Service  
- Select `backend` folder  
- Build Command: `npm install`  
- Start Command: `npm start`  
- Environment variable:
  - `FRONTEND_URL=https://your-frontend-url.vercel.app`

### Frontend – Vercel

- Import GitHub repo  
- Set project root: `/frontend/myapp`  
- Environment variable:
  - `REACT_APP_BACKEND_URL=https://your-backend-url.onrender.com`
- Build command: `npm run build`  
- Output directory: `build`  

## 🧪 How to Test

- Open **Teacher** in one browser/device  
- Open **Student** in another  
- Create poll → verify:
  - Real-time delivery  
  - Timer running  
  - Student answers update instantly  
  - Teacher sees live results  
- Chat:
  - Message from Teacher appears on Student & vice-versa  
- Start multiple polls:
  - History stores properly  
- Kick student:
  - Student sees “kicked” message  

## 📸 Screens

The system includes:

- Landing page (role selection)  
- Teacher dashboard  
- Poll creation UI matching Figma  
- Student answering UI with timer  
- Live result visual bars  
- Chat popup (floating button)  
- Scrollable poll history modal  

## 🏁 Conclusion

- Real-time WebSocket interaction  
- Figma-accurate UI  
- Teacher & student workflows  
- Poll history  
- Chat & kick feature  
- Fully deployed on Render + Vercel  

