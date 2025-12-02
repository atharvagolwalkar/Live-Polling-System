import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './Student.css';

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
    // Check if name exists in session
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
      setTimeLeft(Math.max(0, pollData.timeLimit - elapsed));
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
    if (timeLeft > 0 && currentPoll) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, currentPoll]);

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
        <div className="kicked-message">
          <h2>You have been removed from the poll</h2>
          <p>Please contact your teacher if this was a mistake.</p>
        </div>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="student-container">
        <div className="join-card">
          <h1>Join Poll</h1>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="name-input"
              autoFocus
            />
            <button type="submit" className="join-btn">
              Join
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="student-container">
      <div className="student-header">
        <h2>Welcome, {name}!</h2>
      </div>

      {!currentPoll && !results && (
        <div className="waiting-card">
          <div className="loader"></div>
          <h3>Waiting for teacher to start a poll...</h3>
        </div>
      )}

      {currentPoll && !hasAnswered && (
        <div className="poll-card">
          <div className="timer">
            <div className="timer-circle">
              <span>{timeLeft}s</span>
            </div>
          </div>
          
          <h2 className="poll-question">{currentPoll.question}</h2>
          
          <div className="poll-options">
            {currentPoll.options.map((option, idx) => (
              <button
                key={idx}
                className={`option-btn ${selectedAnswer === option ? 'selected' : ''}`}
                onClick={() => setSelectedAnswer(option)}
              >
                <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                <span className="option-text">{option}</span>
              </button>
            ))}
          </div>

          <button
            className="submit-btn"
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer}
          >
            Submit Answer
          </button>
        </div>
      )}

      {hasAnswered && !results && (
        <div className="waiting-card">
          <div className="success-icon">✓</div>
          <h3>Answer submitted!</h3>
          <p>Waiting for other students...</p>
        </div>
      )}

      {results && (
        <div className="results-card">
          <h2>Poll Results</h2>
          <h3 className="results-question">{results.question}</h3>
          
          <div className="results-chart">
            {Object.entries(results.results).map(([option, count]) => {
              const percentage = results.totalStudents > 0
                ? (count / results.totalStudents * 100).toFixed(1)
                : 0;
              
              return (
                <div key={option} className="result-item">
                  <div className="result-header">
                    <span className="result-option">{option}</span>
                    <span className="result-count">{count} votes</span>
                  </div>
                  <div className="result-bar-container">
                    <div 
                      className="result-bar-fill"
                      style={{width: `${percentage}%`}}
                    >
                      <span className="result-percentage">{percentage}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Student;