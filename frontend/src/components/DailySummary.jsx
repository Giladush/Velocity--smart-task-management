import React from 'react';

export default function DailySummary({ closeModal, tasks, processes }) {
  // 1. חילוץ התאריך של היום בפורמט YYYY-MM-DD כדי שנוכל להשוות
  const todayStr = new Date().toISOString().split('T')[0];

  // 2. סינון שגרות (השרת שלנו כבר שולח לפה רק שגרות שאמורות לקרות היום, ניקח את מה שטרם בוצע)
  const todaysRoutines = tasks.filter(t => t.is_routine && !t.is_completed);

  // 3. סינון משימות רגילות שמועד הסיום שלהן הוא היום (וטרם בוצעו)
  const todaysStandalone = tasks.filter(t => !t.is_routine && t.due_date === todayStr && !t.is_completed);

  // 4. סינון משימות מתוך תהליכים שמועד הסיום שלהן הוא היום (וטרם בוצעו)
  const todaysProcessTasks = processes.flatMap(p => p.tasks).filter(t => t.due_date === todayStr && !t.is_completed);

  // 5. איחוד כל המשימות (לא כולל שגרות) לרשימה אחת
  const allTodaysTasks = [...todaysStandalone, ...todaysProcessTasks];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      
      {/* פה תוקנה ההערה שיצרה את הכיתוב המוזר בצד! */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* אזור הכותרת */}
        <div className="p-6 border-b border-slate-100 bg-indigo-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-indigo-900">תמונת מצב יומית ☀️</h2>
            <p className="text-sm text-indigo-600/80 mt-1 font-medium">הנה מה שמחכה לך היום</p>
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

        {/* אזור התוכן המרכזי */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          
          {/* אזור השגרות */}
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

          {/* אזור המשימות */}
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

          {/* מצב ריק - כשאין כלום להיום */}
          {todaysRoutines.length === 0 && allTodaysTasks.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-lg font-bold text-slate-700">הכל נקי להיום!</h3>
              <p className="text-slate-500">אין לך משימות פתוחות להיום. זמן מצוין להתקדם עם תהליכים או לקחת הפסקה.</p>
            </div>
          )}

        </div>
        
        {/* אזור תחתון */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={closeModal}
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            יאללה לעבודה!
          </button>
        </div>
        
      </div>
    </div>
  );
}