import React, { useState, useEffect } from 'react';
// import io from 'socket.io-client';
import './Student.css';
import ChatPopup from './ChatPopup';
import socket from '../socket';
// const socket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');

function Student() {
  const [name, setName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [currentPoll, setCurrentPoll] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [results, setResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [kicked, setKicked] = useState(false);

  useEffect(() => {
    const savedName = sessionStorage.getItem('studentName');
    if (savedName) {
      setName(savedName);
      setHasJoined(true);
      socket.emit('student:join', savedName);
    }

    socket.on('poll:new', (pollData) => {
      // pollData: { question, options, timeLimit, startTime }
      setCurrentPoll(pollData);
      setResults(null);
      setHasAnswered(false);
      setSelectedAnswer(null);

    const elapsed = Math.floor((Date.now() - (pollData.startTime || Date.now())) / 1000);
    setTimeLeft(Math.max(0, Math.floor(pollData.timeLimit - elapsed)));

    });

    socket.on('poll:results', (resultsData) => {
      // resultsData: { question, results: {option: count}, totalStudents }
      setResults(resultsData);
      setCurrentPoll(null);
      setTimeLeft(0);
      setHasAnswered(false);
    });

    socket.on('student:kicked', () => {
      setKicked(true);
      sessionStorage.removeItem('studentName');
    });

    socket.on('disconnect', () => {
      // keep UX simple — teacher may restart
    });

    return () => {
      socket.off('poll:new');
      socket.off('poll:results');
      socket.off('student:kicked');
      socket.off('disconnect');
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!currentPoll || hasAnswered) return;
    if (timeLeft <= 0 && currentPoll) {
      // auto submit "no-answer" or submit selectedAnswer if any
      if (!hasAnswered) {
        // if user didn't select, mark as abstain — backend expects option name, so skip if no selection
        if (selectedAnswer) {
          handleSubmitAnswer();
        } else {
          // notify server that this student didn't answer (optional)
          socket.emit('answer:submit', '__NO_ANSWER__');
          setHasAnswered(true);
        }
      }
      return;
    }
    const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, currentPoll, hasAnswered, selectedAnswer]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    sessionStorage.setItem('studentName', name.trim());
    setHasJoined(true);
    socket.emit('student:join', name.trim());
  };

const handleSubmitAnswer = useCallback(() => {
  if (selectedAnswer && !hasAnswered) {
    socket.emit('answer:submit', selectedAnswer);
    setHasAnswered(true);
  }
}, [selectedAnswer, hasAnswered]); // add any other dependencies

useEffect(() => {
  // effect that needed handleSubmitAnswer
}, [handleSubmitAnswer, /* other deps */]);

  if (kicked) {
    return (
      <div className="student-container">
        <div className="intervue-badge">INTERVUE.IO</div>
        <div className="student-card kicked-container">
          <h2 className="kicked-title">You've been kicked out</h2>
          <p className="kicked-subtitle">The teacher removed you. Try rejoining later.</p>
        </div>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="student-container">
        <div className="intervue-badge">INTERVUE.IO</div>
        <div className="student-card">
          <h2>Let's Get Started</h2>
          <p className="student-subtitle">
            Enter your name to join the live poll as a student.
          </p>
          <form onSubmit={handleJoin}>
            <label className="name-entry-label">Enter your Name</label>
            <input
              type="text"
              className="name-input"
              placeholder="Enter full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="continue-btn">Continue</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="student-container">
      <div className="intervue-badge">INTERVUE.IO</div>

      {!currentPoll && !results && (
        <div className="student-card waiting-state">
          <div className="loading-spinner" />
          <p className="waiting-text">Waiting for the teacher to start a poll...</p>
        </div>
      )}

      {currentPoll && !hasAnswered && (
        <div className="student-card">
          <div className="question-header">
            <span className="question-number">Question</span>
            <span className="question-timer">
          ⏱ {String(Math.floor(timeLeft / 60)).padStart(2,'0')}:{String(timeLeft % 60).padStart(2,'0')}
  
            </span>
          </div>

          <div className="question-text-box">
            <p className="question-text">{currentPoll.question}</p>
          </div>

          <div className="answer-options">
            {currentPoll.options.map((option, index) => (
              <div
                key={index}
                className={`answer-option ${selectedAnswer === option ? 'selected' : ''}`}
                onClick={() => setSelectedAnswer(option)}
              >
                <div className="option-radio" />
                <div className="option-text">{option}</div>
              </div>
            ))}
          </div>

          <button
            className="submit-answer-btn"
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer}
          >
            Submit
          </button>
        </div>
      )}

      {hasAnswered && !results && (
        <div className="student-card waiting-state">
          <div style={{
            width: '80px',
            height: '80px',
            background: '#4CAF50',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '40px',
            color: 'white'
          }}>
            ✓
          </div>
          <p className="waiting-text">Answer submitted — waiting for results...</p>
        </div>
      )}

      {results && (
        <div className="student-card results-container">
          <div className="results-header">
            <span className="question-number">Results</span>
          </div>

          <div className="question-text-box results-question">
            {results.question}
          </div>

          <div className="results-list">
            {Object.entries(results.results).map(([option, count], optIndex) => {
            const total = Object.values(results.results).reduce((a, b) => a + b, 0) || 0;
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            // correctFlags might be sent as results.correctFlags or results.correctFlags array
            
            // In our backend we send correctFlags at top-level of results object
            const isCorrect = Array.isArray(results.correctFlags) ? !!results.correctFlags[optIndex] : false;

            return (
                <div key={option} className={`result-item ${isCorrect ? 'correct' : ''}`}>
                <div className="result-radio" />
                <div className="result-content">
                    <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#222', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span>{option}</span>
                    {isCorrect && <span style={{ background:'#10b981', color:'#fff', padding:'4px 8px', borderRadius:8, fontWeight:700 }}>Correct</span>}
                    </div>
                    <div className="result-bar-wrapper">
                    <div className="result-bar-container">
                        <div
                        className="result-bar-fill"
                        style={{ width: `${percentage}%`, background: isCorrect ? 'linear-gradient(90deg,#16a34a,#059669)' : undefined }}
                        />
                    </div>
                    <span className="result-percentage">{percentage}%</span>
                    </div>
                </div>
                </div>
            );
            })}

          </div>

          <p style={{
            textAlign: 'center',
            marginTop: '20px',
            fontSize: '14px',
            color: '#6E6E6E',
            fontWeight: '600'
          }}>
            Waiting for the teacher to ask a new question.
          </p>
        </div>
      )}

      <ChatPopup role="student" displayName={name || "Student"} />


      <button className="chat-bubble-btn" aria-label="chat">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="22" height="22">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    </div>
  );
}

export default Student;
