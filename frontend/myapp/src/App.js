import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Teacher from './components/Teacher';
import Student from './components/Student';
import './App.css';

function LandingPage() {
  const [selectedRole, setSelectedRole] = useState('');
  const navigate = useNavigate();

  const handleContinue = () => {
    if (selectedRole === 'student') {
      navigate('/student');
    } else if (selectedRole === 'teacher') {
      navigate('/teacher');
    }
  };

  return (
    <div className="landing-container">
      <div className="intervue-badge">INTERVUE.IO</div>
      <div className="landing-card">
        <h1>Welcome to the Live Polling System</h1>
        <p className="landing-subtitle">
          Please select the role that best describes you to begin using the live polling system.
        </p>

        <div className="role-selection">
          <div
            className={`role-card ${selectedRole === 'student' ? 'selected' : ''}`}
            onClick={() => setSelectedRole('student')}
          >
            <h3>I'm a Student</h3>
            <p>I can participate by answering polls of the questions asked by the teacher.</p>
          </div>

          <div
            className={`role-card ${selectedRole === 'teacher' ? 'selected' : ''}`}
            onClick={() => setSelectedRole('teacher')}
          >
            <h3>I'm a Teacher</h3>
            <p>I want to create polls and view live poll results in real-time.</p>
          </div>
        </div>

        <button
          className="continue-btn"
          onClick={handleContinue}
          disabled={!selectedRole}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/teacher" element={<Teacher />} />
        <Route path="/student" element={<Student />} />
      </Routes>
    </Router>
  );
}

export default App;