import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import KanbanBoard from './components/KanbanBoard';
import ProcessBoard from './components/ProcessBoard';
import RoutinesBoard from './components/RoutinesBoard';
import Auth from './components/Auth';
import DailySummary from './components/DailySummary';
import Analytics from './components/Analytics';

function App() {
  const [aiAdvice, setAiAdvice] = useState(null); 
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
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    if (token && !sessionStorage.getItem('hasSeenSummary')) {
      setShowSummary(true);
      sessionStorage.setItem('hasSeenSummary', 'true');
    }
  }, [token]);

const fetchData = async () => {
  if (!token) return; 
  try {
    const res = await fetch('http://localhost:5000/api/data', {
      headers: {
        'Authorization': `Bearer ${token}` 
      }
    });
    if (!res.ok) throw new Error("Failed to fetch data");
    
    const data = await res.json();
    
    setTasks(prevTasks => {
      return data.standalone_tasks.map(serverTask => {
        const localTask = prevTasks.find(t => String(t.id) === String(serverTask.id));
        if (localTask && !serverTask.is_completed && localTask.status === 'In Progress') {
          return { ...serverTask, status: 'In Progress' };
        }
        return serverTask;
      });
    });

    setProcesses(data.processes || []);

    if (data.streak !== undefined) {
        setStreak(data.streak);
    }

  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

const handleLogout = () => {
    localStorage.removeItem('stride_token'); 
    sessionStorage.removeItem('hasSeenSummary');
    setToken(null); 
  };

  useEffect(() => { fetchData(); }, []);

 const handleAISend = async (userMessage) => {
  setIsThinking(true);
  try {
    const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ message: userMessage })
      });
    const data = await res.json();
    


    // ai agent official protocol
    if (data.action) {
      const { type, payload } = data.action;

      switch (type) {
        
        
        case 'SET_FILTER':
          if (payload.filter_value === 'next_X_days') {
            setActiveFilter('next_X_days');
            setCustomDaysCount(payload.days_count); 
          } else if (payload.filter_value === 'custom') {
            setCustomDate(payload.custom_date);
            setActiveFilter('custom');
          } else if (['high_urgency', 'normal_urgency', 'low_urgency'].includes(payload.filter_value)) {
            setActiveFilter(payload.filter_value);
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
          
          
          if (payload.process_id) {
            setSelectedProcessId(payload.process_id); 
          }
          break;

        
        case 'SET_ADVICE':
          setAiAdvice(payload.advice_text);
          break;

        default:
          console.warn("Action type not handled:", type);
          }
        }
      } catch (error) {
        console.error("AI Error:", error);
      } finally {
        setIsThinking(false);
      }
    };

  
  const handleAddTask = async (title, dueDate, urgency, tags = []) => {
  try {
    const res = await fetch('http://localhost:5000/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: title,
        due_date: dueDate || null,
        urgency: urgency || 'normal',
        tags: tags || []
      })
    });
    
    if (res.ok) {
      fetchData(); 
    }
  } catch (error) {
    console.error("Error creating task:", error);
  }
};

  const handleUpdateTask = async (task) => {
  try {
    
    if (task.is_routine || String(task.id).includes('routine_')) {
      
      
      const actualRoutineId = task.routine_id || String(task.id).replace('routine_', '');
      
      const res = await fetch(`http://localhost:5000/api/routines/${actualRoutineId}/toggle`, {
        method: 'POST'
      });
      
      if (res.ok) {
        fetchData(); 
      } else {
        console.error("Failed to toggle routine");
      }
    } 
    else {
      
      const res = await fetch(`http://localhost:5000/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
        
        body: JSON.stringify({ 
          is_completed: task.is_completed, 
          title: task.title                
        })
      });
      
      if (res.ok) {
        fetchData();
      } else {
        console.error("Failed to update regular task");
      }
    }
  } catch (error) {
    console.error("Error updating task status:", error);
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

  


  // logic separation for Routines vs Regular Tasks
  const isRoutine = draggedTask.is_routine || String(draggableId).includes('routine_');

  if (isRoutine) {
    
    
    if (newStatus === 'Done' || oldStatus === 'Done') {
      const actualRoutineId = draggedTask.routine_id || String(draggableId).replace('routine_', '');
      
      fetch(`http://localhost:5000/api/routines/${actualRoutineId}/toggle`, {
        method: 'POST'
      })
      .then(res => {
        
        if (res.ok && newStatus === 'Done') fetchData(); 
      })
      .catch(err => console.error("Error toggling routine:", err));
    }
  } else {
    
    
    fetch(`http://localhost:5000/api/tasks/${draggedTask.id}`, {
      method: 'PUT',
      headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
      body: JSON.stringify({status: newStatus, is_completed: isCompleted })
    })
    .catch(err => console.error("Error syncing task drag to server:", err));
  }
};

const handleCreateProcess = async (title) => {
  try {
    const res = await fetch('http://localhost:5000/api/processes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title })
    });
    if (res.ok) fetchData();
  } catch (error) {
    console.error("Error creating process:", error);
  }
};

const handleDeleteProcess = async (processId) => {
  try {
    const res = await fetch(`http://localhost:5000/api/processes/${processId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) fetchData();
  } catch (error) {
    console.error("Error deleting process:", error);
  }
};

const handleAddProcessTask = async (processId, title) => {
  try {
    const res = await fetch('http://localhost:5000/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title, process_id: processId })
    });
    if (res.ok) fetchData();
  } catch (error) {
    console.error("Error adding process task:", error);
  }
};

const handleDeleteTask = async (taskId) => {
  try {
    
    const isRoutine = String(taskId).includes('routine_');
    
    if (isRoutine) {
      
      const actualRoutineId = String(taskId).replace('routine_', '');
      const res = await fetch(`http://localhost:5000/api/routines/${actualRoutineId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}` 
        }
      });
      if (res.ok) fetchData();
    } else {
      
      const res = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}` 
        }
      });
      if (res.ok) fetchData();
    }
  } catch (error) {
    console.error("Error deleting task:", error);
  }
};

  if (!token) {
    return <Auth setToken={setToken} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* 1. החלון הקופץ */}
      {showSummary && (
        <DailySummary 
          closeModal={() => setShowSummary(false)} 
          tasks={tasks} 
          processes={processes} 
        />
      )}
      
      {/* 2. תפריט הצד */}
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        streak={streak} 
        onSendMessage={handleAISend}
        isThinking={isThinking} 
        handleLogout={handleLogout} 
        onOpenSummary={() => setShowSummary(true)}
      />

      {/* 3. אזור התוכן המרכזי - עוטף את כל המסכים */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* --- מסך אנליטיקה --- */}
        {activeView === 'analytics' && (
          <Analytics token={token} />
        )}
        
        {/* --- מסך משימות (כולל AI ופילטרים) --- */}
        {activeView === 'tasks' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {aiAdvice && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-sm mb-6 mt-6 mx-8 animate-fade-in animate-duration-200" dir="rtl">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-indigo-900 text-lg flex items-center gap-2">Agent Insights ✨</h3>
                  <button onClick={() => setAiAdvice(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
                </div>
                <p className="text-slate-700 whitespace-pre-line text-sm leading-relaxed">{aiAdvice}</p>
              </div>
            )}


            {/* לוח הקנבן עצמו */}
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
            />
          </div>
        )}

        {/* --- מסך תהליכים --- */}
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

        {/* --- מסך שגרות --- */}
        {activeView === 'routines' && (
          <RoutinesBoard />
        )}

      </div>
    </div>
  );
}

export default App;
