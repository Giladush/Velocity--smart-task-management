import React, { useState, useEffect, useRef } from 'react';

export default function ProcessBoard({ processes, selectedProcessId }) {
  const [expandedId, setExpandedId] = useState(null);
  const processRefs = useRef({});

  useEffect(() => {
    console.log("🎯 Process count:", processes.length, "| Target ID:", selectedProcessId);

    if (selectedProcessId) {
      const targetId = Number(selectedProcessId);
      
      // הבדיקה הקריטית: האם התהליך כבר הגיע מהשרת לתוך המערך שלנו?
      const isProcessLoaded = processes.some(p => Number(p.id) === targetId);

      if (isProcessLoaded) {
        // התהליך נמצא! עכשיו בטוח לפתוח ולגלול אליו
        setExpandedId(targetId);
        
        setTimeout(() => {
          const el = processRefs.current[targetId];
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            console.log("✅ Scrolled successfully!");
          }
        }, 100);
      } else {
        // התהליך עדיין לא הגיע, מחכים לרינדור הבא (אחרי ש-fetchData יסיים)
        console.log("⏳ Still fetching data... waiting.");
      }
    }
  }, [selectedProcessId, processes]);


  return (
    <main className="flex-1 flex flex-col relative bg-slate-50 overflow-hidden">
      <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center px-8 z-10 shrink-0">
        <h2 className="text-xl font-bold text-slate-800">Process Overview</h2>
      </header>
      
      <div className="flex-1 p-8 overflow-y-auto space-y-6">
        {processes.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <span className="text-5xl block mb-4">🚀</span>
            <p>No active processes. Ask Stride to start something big!</p>
          </div>
        ) : (
          processes.map(p => {
            // חישוב דינמי של אחוזי ההתקדמות
            const totalTasks = p.tasks?.length || 0;
            const completedTasks = p.tasks?.filter(t => t.is_completed).length || 0;
            const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
            
            const isExpanded = Number(expandedId) === Number(p.id);

            return (
              <div 
                key={p.id} 
                ref={el => processRefs.current[p.id] = el}
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
                className={`bg-white p-6 rounded-3xl border shadow-sm transition-all duration-300 cursor-pointer hover:shadow-md ${
                  isExpanded ? 'border-indigo-400 ring-4 ring-indigo-50' : 'border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{p.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{p.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
                      {totalTasks} Tasks
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {progressPercentage}% Done
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className={`w-full h-3 bg-slate-100 rounded-full overflow-hidden ${isExpanded ? 'mb-6' : 'mb-2'}`}>
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${progressPercentage}%` }} 
                  ></div>
                </div>

                {/* רשימת המשימות - מופיעה רק אם התהליך פתוח */}
                {isExpanded && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 animate-fade-in mt-4" onClick={(e) => e.stopPropagation()}>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Action Items</h4>
                    <ul className="space-y-2">
                      {p.tasks?.map(task => (
                        <li key={task.id} className="flex items-start gap-3">
                          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                            task.is_completed 
                              ? 'bg-emerald-400 border-emerald-400' 
                              : 'border-slate-300 bg-white'
                          }`}>
                            {task.is_completed && (
                              <svg className="w-3 h-3 text-white mx-auto mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-sm font-medium ${
                            task.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'
                          }`}>
                            {task.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}