import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './Teacher.css';

const socket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');

function Teacher() {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [timeLimit, setTimeLimit] = useState(60);
  const [currentPoll, setCurrentPoll] = useState(null);
  const [results, setResults] = useState(null);
  const [students, setStudents] = useState([]);
  const [pollHistory, setPollHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    socket.on('students:update', (studentList) => {
      setStudents(studentList);
    });

    socket.on('poll:update', (data) => {
      setResults(data.results);
    });

    socket.on('poll:results', (data) => {
      setResults(data.results);
    });

    socket.on('poll:error', (message) => {
      alert(message);
    });

    socket.on('history:data', (history) => {
      setPollHistory(history);
    });

    return () => {
      socket.off('students:update');
      socket.off('poll:update');
      socket.off('poll:results');
      socket.off('poll:error');
      socket.off('history:data');
    };
  }, []);

  const handleCreatePoll = (e) => {
    e.preventDefault();
    
    const validOptions = options.filter(opt => opt.trim());
    
    if (!question.trim() || validOptions.length < 2) {
      alert('Please enter a question and at least 2 options');
      return;
    }

    socket.emit('poll:create', {
      question: question.trim(),
      options: validOptions,
      timeLimit: parseInt(timeLimit)
    });

    setCurrentPoll({
      question: question.trim(),
      options: validOptions,
      timeLimit: parseInt(timeLimit)
    });
    
    setResults(null);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeStudent = (studentName) => {
    if (window.confirm(`Remove ${studentName}?`)) {
      socket.emit('student:remove', studentName);
    }
  };

  const loadHistory = () => {
    socket.emit('history:get');
    setShowHistory(true);
  };

  return (
    <div className="teacher-container">
      <div className="teacher-header">
        <h1>Teacher Dashboard</h1>
        <button onClick={loadHistory} className="history-btn">
          View History
        </button>
      </div>

      <div className="teacher-content">
        <div className="create-poll-section">
          <h2>Create New Poll</h2>
          <form onSubmit={handleCreatePoll}>
            <div className="form-group">
              <label>Question</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Enter your question..."
                className="question-input"
              />
            </div>

            <div className="form-group">
              <label>Options</label>
              {options.map((option, index) => (
                <input
                  key={index}
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="option-input"
                />
              ))}
            </div>

            <div className="form-group">
              <label>Time Limit (seconds)</label>
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                min="10"
                max="300"
                className="time-input"
              />
            </div>

            <button type="submit" className="create-poll-btn">
              Create Poll
            </button>
          </form>
        </div>

        {currentPoll && (
          <div className="current-poll-section">
            <h2>Current Poll</h2>
            <div className="poll-card">
              <h3>{currentPoll.question}</h3>
              <div className="poll-options">
                {currentPoll.options.map((opt, idx) => (
                  <div key={idx} className="poll-option">
                    {opt}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {results && (
          <div className="results-section">
            <h2>Live Results</h2>
            <div className="results-chart">
              {Object.entries(results).map(([option, count]) => {
                const percentage = students.length > 0 
                  ? (count / students.length * 100).toFixed(1)
                  : 0;
                
                return (
                  <div key={option} className="result-bar">
                    <div className="result-label">{option}</div>
                    <div className="bar-container">
                      <div 
                        className="bar-fill" 
                        style={{width: `${percentage}%`}}
                      />
                      <span className="bar-text">{count} ({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="students-section">
          <h2>Students ({students.length})</h2>
          <div className="students-list">
            {students.map((student, idx) => (
              <div key={idx} className="student-item">
                <span>{student}</span>
                <button 
                  onClick={() => removeStudent(student)}
                  className="remove-btn"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Poll History</h2>
            {pollHistory.map((poll, idx) => (
              <div key={idx} className="history-item">
                <h3>{poll.question}</h3>
                <p className="timestamp">{new Date(poll.timestamp).toLocaleString()}</p>
                <div className="history-results">
                  {Object.entries(poll.results).map(([opt, count]) => (
                    <div key={opt}>{opt}: {count}</div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => setShowHistory(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Teacher;