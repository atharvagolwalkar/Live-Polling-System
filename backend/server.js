const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",   // temporarily allow all origins for deployment
    methods: ["GET", "POST"]
  }
});


app.use(cors());
app.use(express.json());

// In-memory storage
let currentPoll = null;
let students = new Map(); // socketId -> {name, answered, answer}
let pollHistory = [];
let chatHistory = [];

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Student joins
  socket.on('student:join', (studentName) => {
    students.set(socket.id, {
      name: studentName,
      answered: false,
      answer: null
    });
    
    // Send current poll if exists
    if (currentPoll) {
      socket.emit('poll:new', {
        question: currentPoll.question,
        options: currentPoll.options,
        timeLimit: currentPoll.timeLimit,
        startTime: currentPoll.startTime
      });
    }
    
    io.emit('students:update', Array.from(students.values()).map(s => s.name));
  });

  // Teacher creates poll
  socket.on('poll:create', (pollData) => {
    // pollData: { question, options, timeLimit, correctFlags?: [] }
    const allAnswered = Array.from(students.values()).every(s => s.answered);

    const zeroStudents = students.size === 0; // allow poll when no students connected

    if (!currentPoll || allAnswered || zeroStudents) {
      // Normalize correct flags: array of booleans aligned with options
      const correctFlags = Array.isArray(pollData.correctFlags)
        ? pollData.correctFlags.map(v => !!v)
        : new Array(pollData.options.length).fill(false);

      currentPoll = {
        question: pollData.question,
        options: pollData.options,
        timeLimit: pollData.timeLimit || 60,
        startTime: Date.now(),
        // results keyed by option text
        results: pollData.options.reduce((acc, opt) => ({...acc, [opt]: 0}), {}),
        correctFlags // store flags on currentPoll
      };

      // Reset students
      students.forEach((student, id) => {
        students.set(id, {...student, answered: false, answer: null});
      });

      io.emit('poll:new', {
        question: currentPoll.question,
        options: currentPoll.options,
        timeLimit: currentPoll.timeLimit,
        startTime: currentPoll.startTime
      });

      // Auto-show results after time limit
      setTimeout(() => {
        if (currentPoll) {
          io.emit('poll:results', {
            question: currentPoll.question,
            results: currentPoll.results,
            totalStudents: students.size,
            correctFlags: currentPoll.correctFlags || []
          });

          pollHistory.push({
            ...currentPoll,
            timestamp: new Date().toISOString()
          });

          // clear currentPoll so teacher can create next poll
          currentPoll = null;
        }
      }, currentPoll.timeLimit * 1000);
    } else {
      socket.emit('poll:error', 'Cannot create poll - students still answering');
    }
  });


  // Student submits answer
  socket.on('answer:submit', (answer) => {
    const student = students.get(socket.id);
    
    if (student && currentPoll && !student.answered) {
      student.answered = true;
      student.answer = answer;
      
      currentPoll.results[answer]++;
      
      // Check if all answered
      const allAnswered = Array.from(students.values()).every(s => s.answered);
      
      // Send results to this student
      socket.emit('poll:results', {
        question: currentPoll.question,
        results: currentPoll.results,
        totalStudents: students.size
      });

      // Broadcast to teacher
      io.emit('poll:update', {
        results: currentPoll.results,
        answered: Array.from(students.values()).filter(s => s.answered).length,
        total: students.size
      });

      if (allAnswered) {
        io.emit('poll:results', {
          question: currentPoll.question,
          results: currentPoll.results,
          totalStudents: students.size,
          correctFlags: currentPoll.correctFlags || []
        });

        pollHistory.push({
          ...currentPoll,
          timestamp: new Date().toISOString()
        });

        // clear currentPoll so teacher can create next poll
        currentPoll = null;
      }

    }
  });

  // Teacher requests poll history
  socket.on('history:get', () => {
    socket.emit('history:data', pollHistory);
  });

  // Teacher removes student
  socket.on('student:remove', (studentName) => {
    for (let [id, student] of students.entries()) {
      if (student.name === studentName) {
        students.delete(id);
        io.to(id).emit('student:kicked');
        io.emit('students:update', Array.from(students.values()).map(s => s.name));
        break;
      }
    }
  });

  socket.on('disconnect', () => {
    students.delete(socket.id);
    io.emit('students:update', Array.from(students.values()).map(s => s.name));
    console.log('Disconnected:', socket.id);
  });

    // Send recent chat history on request and listen for new chat messages
  socket.on('chat:history', () => {
    // send the chat history (limit to last 200 messages)
    const recent = chatHistory.slice(-200);
    socket.emit('chat:history', recent);
  });

  socket.on('chat:message', (msg) => {
    // msg: { from, text, ts } — sanitize minimally
    if (!msg || !msg.text) return;
    const message = {
      from: msg.from || 'Anonymous',
      text: String(msg.text).slice(0, 1000),
      ts: msg.ts || new Date().toISOString()
    };
    chatHistory.push(message);
    // broadcast to all connected clients
    io.emit('chat:message', message);
  });

});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});