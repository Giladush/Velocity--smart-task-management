import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import KanbanBoard from './components/KanbanBoard';
import ProcessBoard from './components/ProcessBoard';
import RoutinesBoard from './components/RoutinesBoard';
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import DailySummary from './components/DailySummary';
import Analytics from './components/Analytics';
import EmailsPanel from './components/EmailsPanel';
import StreakBurst from './components/animations/StreakBurst';
import StardustOrb from './components/animations/StardustOrb';
import AgentInsights from './components/AgentInsights';
import EmailDigest from './components/EmailDigest';
import GlowHalo from './components/animations/GlowHalo';
import {
  fetchAllData, addTask, updateTask, deleteTask,
  toggleRoutine, deleteRoutine,
  createProcess, deleteProcess, addProcessTask,
  sendAIMessage
} from './services/api';

function App() {
  const [aiAdvice, setAiAdvice] = useState(null);
  const [aiReply, setAiReply] = useState('');
  const [emailsData, setEmailsData] = useState(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState(null);
  const [activeView, setActiveView] = useState('tasks');
  const [streak, setStreak] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [activeFilter, setActiveFilter] = useState('default');
  const [customDate, setCustomDate] = useState('');
  const [customDaysCount, setCustomDaysCount] = useState(0);
  const [token, setToken] = useState(localStorage.getItem('stride_token') || null);
  const [username, setUsername] = useState(localStorage.getItem('stride_username') || '');
  const [preAuthView, setPreAuthView] = useState('landing');
  const [authMode, setAuthMode] = useState('login');
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [streakBurst, setStreakBurst] = useState(null);
  const [advicePhase, setAdvicePhase] = useState('idle'); // idle | flying | open | closing
  const [adviceOrigin, setAdviceOrigin] = useState({ x: 0, y: 0 });
  const [adviceRunId, setAdviceRunId] = useState(0);
  const [emailDigestPhase, setEmailDigestPhase] = useState('idle');
  const [emailDigestRunId, setEmailDigestRunId] = useState(0);
  const emailDigestTimer = useRef(null);

  useEffect(() => {
    const handlePopState = () => {
      if (!token) setPreAuthView('landing');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [token]);

  useEffect(() => {
    if (activeView !== 'processes') setSelectedProcessId(null);
  }, [activeView]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calToken = params.get('cal_token');
    if (calToken) {
      localStorage.setItem('cal_token', calToken);
      window.history.replaceState({}, '', '/');
      setGoogleConnected(true);
      setTimeout(() => setGoogleConnected(false), 4000);
    }
  }, []);
  const [showSummary, setShowSummary] = useState(false);
  const [routineCount, setRoutineCount] = useState(0);

  useEffect(() => {
    if (token && !sessionStorage.getItem('hasSeenSummary')) {
      setShowSummary(true);
      sessionStorage.setItem('hasSeenSummary', 'true');
    }
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    try {
      if (!localStorage.getItem('stride_username')) {
        const meRes = await fetch('http://localhost:5000/api/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (meRes.ok) {
          const me = await meRes.json();
          localStorage.setItem('stride_username', me.username);
          setUsername(me.username);
        }
      }
      const data = await fetchAllData(token);
      setTasks(prevTasks =>
        data.standalone_tasks.map(serverTask => {
          const localTask = prevTasks.find(t => String(t.id) === String(serverTask.id));
          if (localTask && !serverTask.is_completed && localTask.status === 'In Progress') {
            return { ...serverTask, status: 'In Progress' };
          }
          return serverTask;
        })
      );
      setProcesses(data.processes || []);
      if (data.streak !== undefined) setStreak(data.streak);
      if (data.routine_count !== undefined) setRoutineCount(data.routine_count);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const showToast = (message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem('stride_token');
    localStorage.removeItem('stride_username');
    sessionStorage.removeItem('hasSeenSummary');
    setToken(null);
    setUsername('');
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleAISend = async (userMessage) => {
    setIsThinking(true);
    setAiReply('');
    try {
      const data = await sendAIMessage(token, userMessage);

      if (data.action) {
        const { type, payload } = data.action;

        if (type === 'SET_ADVICE') {
          setAiAdvice(payload.advice_text);
          setAdviceRunId(n => n + 1);
          setAdvicePhase('flying');
          return;
        }

        if (type === 'SHOW_REPLY') {
          setAiAdvice(payload.advice_text);
          setAdviceRunId(n => n + 1);
          setAdvicePhase('open');
          return;
        }

        if (type === 'SET_EMAILS') {
          setEmailsData(payload);
          if (!payload.error) {
            setEmailDigestRunId(n => n + 1);
            setEmailDigestPhase('thinking');
            clearTimeout(emailDigestTimer.current);
            emailDigestTimer.current = setTimeout(() => setEmailDigestPhase('closing'), 2200);
          }
          return;
        }

        if (data.reply) setAiReply(data.reply);

        switch (type) {
          case 'SET_FILTER':
            if (payload.filter_value === 'next_X_days') {
              setActiveFilter('next_X_days');
              setCustomDaysCount(payload.days_count);
            } else if (payload.filter_value === 'custom') {
              setCustomDate(payload.custom_date);
              setActiveFilter('custom');
            } else {
              setActiveFilter(payload.filter_value);
            }
            break;
          case 'REFRESH_DATA':
            fetchData();
            break;
          case 'NAVIGATE':
            await fetchData();
            setActiveView(payload.view);
            if (payload.process_id) setSelectedProcessId(payload.process_id);
            break;
          default:
            console.warn('Action type not handled:', type);
        }
      } else if (data.reply) {
        setAiReply(data.reply);
      }
    } catch (error) {
      setAiReply('שגיאה בתקשורת עם הסוכן. נסה שוב.');
    } finally {
      setIsThinking(false);
    }
  };

  const handleAddTask = async (title, dueDate, urgency, tags = []) => {
    try {
      const res = await addTask(token, title, dueDate, urgency, tags);
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async (task) => {
    try {
      if (task.is_routine || String(task.id).includes('routine_')) {
        const actualRoutineId = task.routine_id || String(task.id).replace('routine_', '');
        const res = await toggleRoutine(actualRoutineId);
        if (res.ok) fetchData();
      } else {
        const payload = { is_completed: task.is_completed, title: task.title };
        if (!task.process_id) payload.status = task.status;
        const res = await updateTask(token, task.id, payload);
        if (res.ok) fetchData();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const draggedTask = tasks.find(task => String(task.id) === String(draggableId));
    if (!draggedTask) return;

    const newStatus = destination.droppableId;
    const oldStatus = source.droppableId;
    const isCompleted = newStatus === 'Done';

    setTasks(tasks.map(task =>
      String(task.id) === String(draggableId) ? { ...task, status: newStatus, is_completed: isCompleted } : task
    ));

    const isRoutine = draggedTask.is_routine || String(draggableId).includes('routine_');

    if (isRoutine) {
      if (newStatus === 'Done' || oldStatus === 'Done') {
        const actualRoutineId = draggedTask.routine_id || String(draggableId).replace('routine_', '');
        toggleRoutine(actualRoutineId)
          .then(res => { if (res.ok && newStatus === 'Done') fetchData(); })
          .catch(err => console.error('Error toggling routine:', err));
      }
    } else {
      updateTask(token, draggedTask.id, { status: newStatus, is_completed: isCompleted })
        .catch(err => console.error('Error syncing task drag:', err));
    }
  };

  const handleCreateProcess = async (title) => {
    try {
      const res = await createProcess(token, title);
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Error creating process:', error);
    }
  };

  const handleDeleteProcess = async (processId) => {
    try {
      const res = await deleteProcess(token, processId);
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Error deleting process:', error);
    }
  };

  const handleAddProcessTask = async (processId, title) => {
    try {
      const res = await addProcessTask(token, processId, title);
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Error adding process task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      if (String(taskId).includes('routine_')) {
        const actualRoutineId = String(taskId).replace('routine_', '');
        const res = await deleteRoutine(token, actualRoutineId);
        if (res.ok) fetchData();
      } else {
        const res = await deleteTask(token, taskId);
        if (res.ok) fetchData();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  if (!token) {
    if (preAuthView === 'landing') {
      return (
        <LandingPage
          onLogin={() => { setAuthMode('login'); setPreAuthView('auth'); window.history.pushState({ view: 'auth' }, '', '/'); }}
          onSignup={() => { setAuthMode('signup'); setPreAuthView('auth'); window.history.pushState({ view: 'auth' }, '', '/'); }}
        />
      );
    }
    return <Auth setToken={setToken} setUsername={setUsername} initialMode={authMode} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">

      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] text-sm font-semibold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'
        }`}>
          <span>{toast.type === 'error' ? '✕' : '✓'}</span>
          {toast.message}
        </div>
      )}

      {googleConnected && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
          <span>✓</span> Google account connected successfully
        </div>
      )}

      {showSummary && (
        <DailySummary
          closeModal={() => setShowSummary(false)}
          tasks={tasks}
          processes={processes}
          username={username}
        />
      )}

      {streakBurst && (
        <StreakBurst
          key={streakBurst.x + streakBurst.y}
          origin={streakBurst}
          number={streak}
          intensity="intense"
          onDone={() => setStreakBurst(null)}
        />
      )}

      {advicePhase === 'flying' && (
        <StardustOrb
          key={adviceRunId}
          origin={adviceOrigin}
          target={{ x: 320 + (window.innerWidth - 320) / 2, y: 130 }}
          onDone={() => setAdvicePhase('open')}
        />
      )}

      {(advicePhase === 'open' || advicePhase === 'closing') && aiAdvice && (
        <div style={{ position: 'fixed', top: 72, left: 336, right: 24, zIndex: 50 }}>
          <AgentInsights
            lines={aiAdvice.split('\n').filter(l => l.trim())}
            title="Agent Insights"
            closing={advicePhase === 'closing'}
            onClose={() => setAdvicePhase('closing')}
            onClosed={() => { setAdvicePhase('idle'); setAiAdvice(null); }}
            rtl={true}
          />
        </div>
      )}

      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        streak={streak}
        onSendMessage={handleAISend}
        isThinking={isThinking}
        aiReply={aiReply}
        handleLogout={handleLogout}
        onOpenSummary={() => setShowSummary(true)}
        taskCount={tasks.filter(t => !t.is_routine && !t.is_completed).length}
        processCount={processes.length}
        routineCount={routineCount}
        username={username}
        onStreakClick={(origin) => setStreakBurst(origin)}
        onSendOrigin={(origin) => setAdviceOrigin(origin)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">

        {activeView === 'analytics' && (
          <Analytics token={token} />
        )}

        {activeView === 'tasks' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {emailDigestPhase !== 'idle' && (
              <div className="mx-8 mt-6">
                <EmailDigest
                  key={emailDigestRunId}
                  phase={emailDigestPhase}
                  emails={[]}
                  onClose={() => setEmailDigestPhase('closing')}
                  onClosed={() => setEmailDigestPhase('idle')}
                />
              </div>
            )}

            {emailDigestPhase === 'idle' && emailsData && (
              <GlowHalo tone={['#7dd3fc', '#a5b4fc', '#c4b5fd']} glow="soft">
                <EmailsPanel
                  emails={emailsData.emails || []}
                  query={emailsData.query || ''}
                  error={emailsData.error}
                  onAddAsTask={(summary) => {
                    handleAddTask(summary, null, 'normal', []);
                    setEmailsData(prev => ({
                      ...prev,
                      emails: prev.emails.filter(e => e.summary !== summary && e.subject !== summary)
                    }));
                    showToast('Email added to task board successfully');
                  }}
                  onClose={() => setEmailsData(null)}
                />
              </GlowHalo>
            )}

            <KanbanBoard
              tasks={tasks}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onDragEnd={handleDragEnd}
              activeFilter={activeFilter}
              customDate={customDate}
              customDaysCount={customDaysCount}
              setActiveFilter={setActiveFilter}
              setCustomDate={setCustomDate}
              onToast={showToast}
            />
          </div>
        )}

        {activeView === 'processes' && (
          <ProcessBoard
            processes={processes}
            selectedProcessId={selectedProcessId}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onCreateProcess={handleCreateProcess}
            onDeleteProcess={handleDeleteProcess}
            onAddProcessTask={handleAddProcessTask}
          />
        )}

        {activeView === 'routines' && (
          <RoutinesBoard onDataChange={fetchData} />
        )}

      </div>
    </div>
  );
}

export default App;
