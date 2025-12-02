import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './Teacher.css';
import ChatPopup from './ChatPopup';
import socket from '../socket';
// const socket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');

export default function Teacher() {
  // Form state (ask card)
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([
    { text: '', correct: false },
    { text: '', correct: false }
  ]);
  const [timeLimit, setTimeLimit] = useState(60);

  // Live & history state (feed & sidebar)
  const [currentPoll, setCurrentPoll] = useState(null);
  const [liveResults, setLiveResults] = useState(null);
  const [students, setStudents] = useState([]);
  const [pollHistory, setPollHistory] = useState([]);
  const [creatingDisabled, setCreatingDisabled] = useState(false);
  const [liveAnswered, setLiveAnswered] = useState(0);
  const [liveTotal, setLiveTotal] = useState(0);

  const historyRequestedRef = useRef(false);

  useEffect(() => {
    // students list update
    socket.on('students:update', (studentList) => {
      setStudents(studentList || []);
    });

    // new poll event (server)
    socket.on('poll:new', (poll) => {
      setCurrentPoll(poll);
      setLiveResults(null);
      setCreatingDisabled(true);
      setLiveAnswered(0);
      setLiveTotal((prev) => Math.max(prev, students.length));
    });

    // live partial update during poll (answered count + results)
    socket.on('poll:update', (data) => {
      setLiveResults(data.results || null);
      setLiveAnswered(data.answered || 0);
      setLiveTotal(data.total || students.length);
      setCreatingDisabled(true);
    });

    // final results
    socket.on('poll:results', (data) => {
      setLiveResults(data.results || null);
      setPollHistory(prev => [{ question: data.question, options: Object.keys(data.results), results: data.results, timestamp: new Date().toISOString() }, ...prev]);
      setCurrentPoll(null);
      setCreatingDisabled(false);
      // refresh server history
      socket.emit('history:get');
      historyRequestedRef.current = true;
    });

    socket.on('history:data', (history) => {
      if (Array.isArray(history)) {
        setPollHistory(history.slice().reverse());
      }
    });

    socket.on('poll:error', (msg) => {
      alert(msg);
    });

    return () => {
      socket.off('students:update');
      socket.off('poll:new');
      socket.off('poll:update');
      socket.off('poll:results');
      socket.off('history:data');
      socket.off('poll:error');
    };
  }, [students.length]);

  // helpers for options
  const addOption = () => setOptions(prev => [...prev, { text: '', correct: false }]);
  const removeOption = (idx) => setOptions(prev => prev.filter((_, i) => i !== idx));
  const setOptionText = (idx, val) => {
    const copy = [...options]; copy[idx].text = val; setOptions(copy);
  };
  const toggleCorrect = (idx, val) => {
    const copy = [...options]; copy[idx].correct = val; setOptions(copy);
  };

  const handleAsk = (e) => {
    e?.preventDefault();
    const q = questionText.trim();
    const validOpts = options.map(o => ({ ...o, text: o.text.trim() })).filter(o => o.text);
    if (!q || validOpts.length < 2) {
      alert('Enter a question and at least 2 non-empty options.');
      return;
    }

    const payload = {
      question: q,
      options: validOpts.map(o => o.text),
      timeLimit: Number(timeLimit) || 60,
      correctFlags: validOpts.map(o => o.correct)
    };

    socket.emit('poll:create', payload);

    // optimistic local view for teacher
    setCurrentPoll({
      question: payload.question,
      options: payload.options,
      timeLimit: payload.timeLimit,
      startTime: Date.now()
    });
    setQuestionText('');
    setOptions([{ text: '', correct: false }, { text: '', correct: false }]);
    setTimeLimit(60);
    setCreatingDisabled(true);
    // request history after creation (server will push results eventually)
    if (!historyRequestedRef.current) {
      socket.emit('history:get');
      historyRequestedRef.current = true;
    }
  };

  const removeStudent = (studentName) => {
    if (!window.confirm(`Remove ${studentName} from this session?`)) return;
    socket.emit('student:remove', studentName);
  };

  // Utility to render results for a given result map (option -> count)
  const renderResultBars = (resultsMap = {}, optionsList = [], correctFlags = []) => {
    const counts = {};
    if (Object.keys(resultsMap).length === 0 && Array.isArray(optionsList)) {
      optionsList.forEach(opt => counts[opt] = 0);
    } else {
      Object.assign(counts, resultsMap);
    }

    const total = Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0) || 0;
    const items = optionsList.length ? optionsList : Object.keys(counts);

    return items.map((opt, i) => {
      const cnt = Number(counts[opt] || 0);
      const pct = total ? Math.round((cnt / total) * 100) : 0;
      const isCorrect = Array.isArray(correctFlags) && correctFlags[i];

      return (
        <div key={opt + i} className={`history-result-row ${isCorrect ? 'correct' : ''}`}>
          <div className="history-label">
            {opt}
            {isCorrect && <span className="correct-badge">✔</span>}
          </div>

          <div className="history-bar-wrap">
            <div className="history-bar" style={{
              width: `${pct}%`,
              background: isCorrect ? 'linear-gradient(90deg,#16a34a,#059669)' : undefined
            }} />
          </div>

          <div className="history-meta">{cnt} <span className="history-percent">({pct}%)</span></div>
        </div>
      );
    });
  };


  return (
    <div className="teacher-fullpage-combo">
      <div className="intervue-badge">Intervue Poll</div>

      {/* TOP: Full-width Ask Card (big, spacious UI) */}
      <main className="ask-wrapper">
        <div className="ask-card">
          <header className="ask-header">
            <div>
              <div className="eyebrow">Let's Get Started</div>
              <h1 className="ask-title">You’ll have the ability to create and manage polls, ask questions, and monitor your students' responses in real-time.</h1>
            </div>

            <div className="time-selector">
              <label className="time-label">Time</label>
              <select className="time-select" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)}>
                <option value={30}>30 seconds</option>
                <option value={45}>45 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={90}>90 seconds</option>
                <option value={120}>120 seconds</option>
              </select>
            </div>
          </header>

          <form className="ask-form" onSubmit={handleAsk}>
            <div className="form-row">
              <label className="field-label">Enter your question</label>
              <textarea
                className="question-input"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Type your question here..."
                maxLength={500}
                rows={5}
              />
              <div className="char-count">{questionText.length}/500</div>
            </div>

            <div className="options-grid">
              <div className="options-left">
                <label className="field-label">Edit Options</label>
                {options.map((opt, i) => (
                  <div className="option-row" key={i}>
                    <div className="option-index">{i + 1}</div>
                    <input
                      className="option-input"
                      value={opt.text}
                      onChange={(e) => setOptionText(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                    />
                    {options.length > 2 && (
                      <button type="button" className="remove-opt-btn" onClick={() => removeOption(i)}>Remove</button>
                    )}
                  </div>
                ))}

                <button type="button" className="add-opt-btn" onClick={addOption}>+ Add More option</button>
              </div>

              <div className="options-right">
                <label className="field-label">Is it Correct?</label>
                <div className="correct-grid">
                  {options.map((opt, i) => (
                    <div className="correct-row" key={'c' + i}>
                      <div className="correct-index">{i + 1}</div>
                      <div className="correct-controls">
                        <label className={`radio ${opt.correct === true ? 'checked' : ''}`}>
                          <input type="radio" name={`correct-${i}`} checked={opt.correct === true} onChange={() => toggleCorrect(i, true)} />
                          <span>Yes</span>
                        </label>
                        <label className={`radio ${opt.correct === false ? 'checked' : ''}`}>
                          <input type="radio" name={`correct-${i}`} checked={opt.correct === false} onChange={() => toggleCorrect(i, false)} />
                          <span>No</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* BELOW: Grid with feed (left) and sidebar (right) */}
      <div className="teacher-grid-combo">
        <div className="feed-column">
          {/* Current Poll (live) */}
          {currentPoll ? (
            <div className="poll-card current">
              <div className="poll-header">
                <div className="poll-title">Current Question</div>
                <div className="poll-timer">Time: {currentPoll.timeLimit}s</div>
              </div>
              <div className="poll-question">{currentPoll.question}</div>

              <div className="poll-options-list">
                {currentPoll.options.map((opt, idx) => {
                  let count = 0;
                  if (liveResults) {
                    if (liveResults[opt] !== undefined) count = liveResults[opt];
                    else if (liveResults[idx] !== undefined) count = liveResults[idx];
                  }
                  const total = Object.values(liveResults || {}).reduce((a, b) => a + (Number(b) || 0), 0) || 0;
                  const pct = total ? Math.round((count / total) * 100) : 0;

                  return (
                    <div key={idx} className="poll-option-row">
                      <div className="option-left">
                        <div className="option-bullet">{idx + 1}</div>
                        <div className="option-text">{opt}</div>
                      </div>
                      <div className="option-bar-wrap">
                        <div className="option-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="option-meta">{pct}%</div>
                    </div>
                  );
                })}
              </div>

              <div className="poll-footer">
                <div className="poll-status">Answered: <strong>{liveAnswered}</strong> / <strong>{liveTotal || students.length}</strong></div>
              </div>
            </div>
          ) : (
            <div className="placeholder-card">No active question — ask one above.</div>
          )}

          {/* Poll History list */}
          <div className="history-feed">
            {pollHistory.length === 0 && <div className="history-empty">No poll history yet.</div>}
            {pollHistory.map((h, idx) => (
            <div className="history-card" key={idx}>
                ...
                <div className="history-results">
                {renderResultBars(h.results || {}, h.options || Object.keys(h.results || {}), h.correctFlags || [])}
                </div>
            </div>
            ))}

          </div>
        </div>

        {/* Right sidebar with participants */}
        <aside className="right-column">
          <div className="sidebar-card students-panel">
            <h3>Participants ({students.length})</h3>
            <div className="students-list">
              {students.map((s, idx) => (
                <div className="participant-item" key={idx}>
                  <div className="participant-name">{s}</div>
                  <button className="remove-participant-btn" onClick={() => removeStudent(s)}>Kick out</button>
                </div>
              ))}
              {students.length === 0 && <div className="no-students">No students connected</div>}
            </div>
          </div>

          <div className="sidebar-card info-panel">
            <h3>Live Status</h3>
            <div style={{ color: '#6E6E6E', marginTop: 8 }}>
              Answered: <strong style={{ color: '#222' }}>{liveAnswered}</strong> / <strong>{liveTotal || students.length}</strong>
            </div>
            <div style={{ marginTop: 1 }}>
              <button className="history-btn" onClick={() => { socket.emit('history:get'); }}>Refresh History</button>
            </div>
          </div>
        </aside>
      </div>

<ChatPopup role="teacher" displayName={"Teacher"} />

      {/* Floating Ask button */}
      <button className="ask-fab" onClick={handleAsk} disabled={creatingDisabled}>
        {creatingDisabled ? 'Poll Active' : 'Ask Question'}
      </button>
    </div>
  );
}
