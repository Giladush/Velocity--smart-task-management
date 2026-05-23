import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import KanbanBoard from './components/KanbanBoard';
import ProcessBoard from './components/ProcessBoard';
import RoutinesBoard from './components/RoutinesBoard';
import Auth from './components/Auth';
import DailySummary from './components/DailySummary';
import Analytics from './components/Analytics';

function App() {
  const [aiAdvice, setAiAdvice] = useState(null); // ישמור את הניתוח המפורט של היועץ
  const [selectedProcessId, setSelectedProcessId] = useState(null); // עבור ניווט לתהליך ספציפי
  const [activeView, setActiveView] = useState('tasks');
  const [streak, setStreak] = useState(0);
  const [tasks, setTasks] = useState([]); 
  const [processes, setProcesses] = useState([]);
  const [isThinking, setIsThinking] = useState(false); // הסטייט החדש שלנו!
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
  if (!token) return; // 1. אם אין טוקן, אין מה לנסות למשוך נתונים
  try {
    const res = await fetch('http://localhost:5000/api/data', {
      headers: {
        'Authorization': `Bearer ${token}` // 2. מצרפים את הטוקן!
      }
    });
    if (!res.ok) throw new Error("Failed to fetch data");
    
    const data = await res.json();
    
    // מיזוג חכם למשימות רגילות
    setTasks(prevTasks => {
      return data.standalone_tasks.map(serverTask => {
        const localTask = prevTasks.find(t => String(t.id) === String(serverTask.id));
        if (localTask && !serverTask.is_completed && localTask.status === 'In Progress') {
          return { ...serverTask, status: 'In Progress' };
        }
        return serverTask;
      });
    });

    // 🎯 הנה השורה המנצחת - שומרים את התהליכים!
    setProcesses(data.processes || []);

  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

const handleLogout = () => {
    localStorage.removeItem('stride_token'); // 1. מוחקים את הטוקן מהזיכרון של הדפדפן
    sessionStorage.removeItem('hasSeenSummary');
    setToken(null); // 2. מאפסים את הסטייט כדי שהאפליקציה תציג מיד את מסך ההתחברות
  };

  useEffect(() => { fetchData(); }, []);

 const handleAISend = async (userMessage) => {
  setIsThinking(true);
  try {
    const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // <-- הוספנו את שורת הטוקן גם לפה
        },
        body: JSON.stringify({ message: userMessage })
      });
    const data = await res.json();
    
    // הצגת תגובת הטקסט בצ'אט כרגיל
    // setMessages(prev => [...prev, { text: data.reply, sender: 'ai' }]);

    // מנוע הפעולות הרשמי:
    if (data.action) {
      const { type, payload } = data.action;

      switch (type) {
        
        // 1. מיון משימות (עבור X ימים או תאריך ספציפי)
        case 'SET_FILTER':
          if (payload.filter_value === 'next_X_days') {
            setActiveFilter('next_X_days');
            setCustomDaysCount(payload.days_count); // נצטרך סטייט קטן לזה
          } else if (payload.filter_value === 'custom') {
            setCustomDate(payload.custom_date);
            setActiveFilter('custom');
          } else {
            setActiveFilter(payload.filter_value); // 'today', 'default'
          }
          break;

        // 2 + 3 + 5. רענון מידע (קורה אחרי שהבאקאנד ביצע יצירה/מחיקה/העברה ב-DB)
        case 'REFRESH_DATA':
          fetchData();
          break;

        // 4. ניווט באתר
        // ניווט באתר (מתוקן)
        case 'NAVIGATE':
          // קודם כל: שואבים את הנתונים העדכניים מהשרת כדי להכיר תהליכים חדשים שנוצרו!
          await fetchData(); 
          
          // רק אז מנווטים
          setActiveView(payload.view); 
          
          // ואם ה-AI שלח לנו ID ספציפי לפתוח - פותחים אותו
          if (payload.process_id) {
            setSelectedProcessId(payload.process_id); 
          }
          break;

        // 6. יועץ חכם (מציג פאנל מיוחד במסך)
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

  // --- שאר הפונקציות נשארות זהות ---
  const handleAddTask = async (title, dueDate) => {
  try {
    const res = await fetch('http://localhost:5000/api/tasks', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // <--- הנה הכרטיס כניסה שלנו!
      },
      body: JSON.stringify({
        title: title,
        due_date: dueDate || null
      })
    });
    
    if (res.ok) {
      fetchData(); // מרענן את הלוח עם המשימה החדשה
    }
  } catch (error) {
    console.error("Error creating task:", error);
  }
};

  const handleUpdateTask = async (task) => {
  try {
    // בדיקה חסינת-תקלות: גם אם הדגל חסר, אם ה-ID מכיל 'routine_', אנחנו יודעים שזו שגרה!
    if (task.is_routine || String(task.id).includes('routine_')) {
      
      // חילוץ בטוח של המספר (מ-"routine_2" נשאר רק "2")
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
      // כאן מטופלות רק משימות רגילות (שה-ID שלהן הוא מספר נקי)
      const res = await fetch(`http://localhost:5000/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
        // 👇 --- התיקון שלנו נמצא כאן! במקום true קבוע, שולחים את הנתונים האמיתיים --- 👇
        body: JSON.stringify({ 
          is_completed: task.is_completed, // מקבל את הסטטוס מהמשימה
          title: task.title                // שולח את השם (החדש או הישן)
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

  // 1. עדכון אופטימי ב-UI - שומר את הכרטיסייה איפה ששחררת אותה (למשל In Progress)
  setTasks(tasks.map(task => 
    String(task.id) === String(draggableId) ? { ...task, status: newStatus, is_completed: isCompleted } : task
  ));

  // עדכון רצף כללי של האפליקציה (אם קיים)
  if (newStatus === 'Done' && oldStatus !== 'Done') setStreak(prev => prev + 1);

  // --- פיצול לוגי מול השרת ---
  const isRoutine = draggedTask.is_routine || String(draggableId).includes('routine_');

  if (isRoutine) {
    // מפעילים את ה-Toggle בשרת *רק* אם השגרה נכנסה ל-Done או יצאה מ-Done
    // (גרירה ל-In Progress לא תעשה כלום בשרת כרגע)
    if (newStatus === 'Done' || oldStatus === 'Done') {
      const actualRoutineId = draggedTask.routine_id || String(draggableId).replace('routine_', '');
      
      fetch(`http://localhost:5000/api/routines/${actualRoutineId}/toggle`, {
        method: 'POST'
      })
      .then(res => {
        // עושים ריענון נתונים כדי להביא את הסטריק *רק* כשהשגרה הסתיימה!
        if (res.ok && newStatus === 'Done') fetchData(); 
      })
      .catch(err => console.error("Error toggling routine:", err));
    }
  } else {
    // עבור משימות רגילות: מעדכנים את השרת, אבל *בלי* לעשות fetchData!
    // ככה המשימה תישאר ב-In Progress ולא תקפוץ חזרה ל-To Do בטעות
    fetch(`http://localhost:5000/api/tasks/${draggedTask.id}`, {
      method: 'PUT',
      headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
      body: JSON.stringify({ is_completed: isCompleted })
    })
    .catch(err => console.error("Error syncing task drag to server:", err));
  }
};

const handleDeleteTask = async (taskId) => {
  try {
    // בודקים אם מנסים למחוק שגרה (Routine) או משימה רגילה
    const isRoutine = String(taskId).includes('routine_');
    
    if (isRoutine) {
      // חילוץ ה-ID המספרי של השגרה
      const actualRoutineId = String(taskId).replace('routine_', '');
      const res = await fetch(`http://localhost:5000/api/routines/${actualRoutineId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}` // <-- הוספנו את הטוקן למחיקת שגרה
        }
      });
      if (res.ok) fetchData();
    } else {
      // מחיקה של משימה רגילה
      const res = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}` // <-- הוספנו את הטוקן למחיקת משימה
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
                  <h3 className="font-bold text-indigo-900 text-lg flex items-center gap-2">✨ עצת הסוכן החכם</h3>
                  <button onClick={() => setAiAdvice(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
                </div>
                <p className="text-slate-700 whitespace-pre-line text-sm leading-relaxed">{aiAdvice}</p>
              </div>
            )}

            {/* סרגל הפילטרים */}
            <div className="flex items-center gap-3 mt-6 mx-8 bg-white p-3 rounded-xl shadow-sm border border-slate-100 w-max" dir="rtl">
              <span className="text-sm font-semibold text-slate-500 ml-2">מיון לפי:</span>
              
              <button 
                onClick={() => setActiveFilter('default')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeFilter === 'default' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                ברירת מחדל
              </button>
              
              <button 
                onClick={() => setActiveFilter('today')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeFilter === 'today' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                היום
              </button>
              
              <button 
                onClick={() => setActiveFilter('next7days')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeFilter === 'next7days' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                7 ימים קרובים
              </button>

              <div className="flex items-center gap-2 border-r pr-2 mr-2 border-slate-200">
                <button 
                  onClick={() => setActiveFilter('custom')}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeFilter === 'custom' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  תאריך ספציפי:
                </button>
                <input 
                  type="date" 
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    if (e.target.value) setActiveFilter('custom');
                  }}
                  className="text-sm border-none bg-slate-50 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer text-slate-700"
                />
              </div>
            </div>

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
            />
          </div>
        )}

        {/* --- מסך תהליכים --- */}
        {activeView === 'processes' && (
          <ProcessBoard 
            processes={processes}
            selectedProcessId={selectedProcessId}  
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
