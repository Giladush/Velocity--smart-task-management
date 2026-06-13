import React from 'react';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 18) return 'Good afternoon';
  return 'Good evening';
};

export default function DailySummary({ closeModal, tasks, processes, username }) {
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const todaysRoutines = tasks.filter(t => t.is_routine && !t.is_completed);

  const todaysStandalone = tasks.filter(t => !t.is_routine && t.due_date === todayStr && !t.is_completed);

  const todaysProcessTasks = processes.flatMap(p => p.tasks).filter(t => t.due_date === todayStr && !t.is_completed);

  const allTodaysTasks = [...todaysStandalone, ...todaysProcessTasks];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        
        <div className="p-6 border-b border-slate-100 bg-indigo-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-indigo-900">Daily Snapshot ☀️</h2>
            
          </div>
          
          <button 
            onClick={closeModal}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-6">

          {(todaysRoutines.length > 0 || allTodaysTasks.length > 0) && (
            <p className="text-base font-semibold text-indigo-700">
              {getGreeting()}{username ? `, ${username}` : ''}! Here are your tasks for today.
            </p>
          )}

          {todaysRoutines.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">שגרות</h3>
              <div className="flex flex-col gap-2">
                {todaysRoutines.map(routine => (
                  <div key={routine.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xl">{routine.icon}</span>
                    <span className="font-medium text-slate-700">{routine.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allTodaysTasks.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">משימות להיום</h3>
              <div className="flex flex-col gap-2">
                {allTodaysTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="w-4 h-4 rounded border-2 border-indigo-300"></div>
                    <span className="font-medium text-slate-700">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {todaysRoutines.length === 0 && allTodaysTasks.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-lg font-bold text-slate-700">
                {getGreeting()}{username ? `, ${username}` : ''}! All clear for today.
              </h3>
              <p className="text-slate-500 mt-2">Perfect time to push forward with your processes, or just take a well-deserved break.</p>
            </div>
          )}

        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={closeModal}
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
           Let's get to work!
          </button>
        </div>
        
      </div>
    </div>
  );
}