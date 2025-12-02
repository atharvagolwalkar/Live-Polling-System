import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');

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
      setCurrentPoll(pollData);
      setHasAnswered(false);
      setSelectedAnswer(null);
      setResults(null);
      
      const elapsed = (Date.now() - pollData.startTime) / 1000;
      setTimeLeft(Math.max(0, Math.floor(pollData.timeLimit - elapsed)));
    });

    socket.on('poll:results', (resultsData) => {
      setResults(resultsData);
      setCurrentPoll(null);
      setTimeLeft(0);
    });

    socket.on('student:kicked', () => {
      setKicked(true);
      sessionStorage.removeItem('studentName');
    });

    return () => {
      socket.off('poll:new');
      socket.off('poll:results');
      socket.off('student:kicked');
    };
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && currentPoll && !hasAnswered) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, currentPoll, hasAnswered]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (name.trim()) {
      sessionStorage.setItem('studentName', name.trim());
      setHasJoined(true);
      socket.emit('student:join', name.trim());
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer && !hasAnswered) {
      socket.emit('answer:submit', selectedAnswer);
      setHasAnswered(true);
    }
  };

  if (kicked) {
    return (
      <div className="student-container">
        <div className="intervue-badge">INTERVUE.IO</div>
        <div className="student-card kicked-container">
          <h2 className="kicked-title">You've been Kicked out !</h2>
          <p className="kicked-subtitle">
            Looks like the teacher had reasons to remove you from this poll system. Please try again sometime.
          </p>
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
            If you're a student, you'll be able to submit your answers, participate in live polls, and see how your responses compare with your classmates.
          </p>

          <form onSubmit={handleJoin}>
            <label className="name-entry-label">Enter your Name</label>
            <input
              type="text"
              className="name-input"
              placeholder="Rahul Birla"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="continue-btn">
              Continue
            </button>
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
          <p className="waiting-text">Wait for the teacher to ask questions..</p>
        </div>
      )}

      {currentPoll && !hasAnswered && (
        <div className="student-card">
          <div className="question-header">
            <span className="question-number">Question 1</span>
            <span className="question-timer">
              ⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}s
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
                <span className="option-text">{option}</span>
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
          <p className="waiting-text">Wait for the teacher to ask a new question.</p>
        </div>
      )}

      {results && (
        <div className="student-card results-container">
          <div className="results-header">
            <span className="question-number">Question 1</span>
          </div>

          <div className="question-text-box results-question">
            {results.question}
          </div>

          <div className="results-list">
            {Object.entries(results.results).map(([option, count]) => {
              const total = Object.values(results.results).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
              
              return (
                <div key={option} className="result-item">
                  <div className="result-radio" />
                  <div className="result-content">
                    <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#373737' }}>
                      {option}
                    </div>
                    <div className="result-bar-wrapper">
                      <div className="result-bar-container">
                        <div
                          className="result-bar-fill"
                          style={{ width: `${percentage}%` }}
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
            marginTop: '30px', 
            fontSize: '14px', 
            color: '#6E6E6E',
            fontWeight: '500'
          }}>
            Wait for the teacher to ask a new question.
          </p>
        </div>
      )}

      <button className="chat-bubble-btn">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    </div>
  );
}

export default Student;