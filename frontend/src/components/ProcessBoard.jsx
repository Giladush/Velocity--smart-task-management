import React, { useState, useEffect, useRef } from 'react';

export default function ProcessBoard({ processes, selectedProcessId, onUpdateTask }) {
  const [expandedId, setExpandedId] = useState(null);
  const processRefs = useRef({});

  useEffect(() => {
    console.log("🎯 Process count:", processes.length, "| Target ID:", selectedProcessId);

    if (selectedProcessId) {
      const targetId = Number(selectedProcessId);
      
      
      const isProcessLoaded = processes.some(p => Number(p.id) === targetId);

      if (isProcessLoaded) {
        
        setExpandedId(targetId);
        
        setTimeout(() => {
          const el = processRefs.current[targetId];
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            console.log("✅ Scrolled successfully!");
          }
        }, 100);
      } else {
        
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
                
                
                <div className={`w-full h-3 bg-slate-100 rounded-full overflow-hidden ${isExpanded ? 'mb-6' : 'mb-2'}`}>
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${progressPercentage}%` }} 
                  ></div>
                </div>

                
                {isExpanded && (
                  <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 animate-fade-in mt-4" onClick={(e) => e.stopPropagation()}>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 text-center">מסלול התקדמות</h4>
                    
                    
                    <div className="relative flex flex-col items-center z-0" dir="rtl">
                      
                      <div className="absolute top-4 bottom-8 w-3 bg-slate-200 rounded-full -z-10"></div>

                      {p.tasks?.map((task, index) => {
                        const isCompleted = task.is_completed;
                        
                        return (
                          <div 
                            key={task.id} 
                            className="relative flex flex-col items-center mb-8 cursor-pointer group"
                            onClick={() => onUpdateTask({ ...task, is_completed: !isCompleted })} // הופך את הסטטוס בלחיצה
                          >
                            
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-sm border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                              isCompleted
                                ? 'bg-emerald-400 border-emerald-500 text-white scale-110' // עיצוב משימה שהושלמה
                                : 'bg-white border-slate-200 text-slate-400 group-hover:bg-slate-50' // עיצוב משימה פתוחה
                            }`}>
                              {isCompleted ? '✓' : index + 1}
                            </div>
                            
                            
                            <span className={`mt-3 text-sm font-bold px-4 py-1.5 rounded-full shadow-sm border ${
                              isCompleted ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-white border-slate-200'
                            }`}>
                              {task.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
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