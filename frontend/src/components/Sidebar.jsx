import React, { useState } from 'react';

export default function Sidebar({ activeView, setActiveView, streak, onSendMessage, isThinking, handleLogout, onOpenSummary, taskCount, processCount, routineCount, username }) {
  const [chatInput, setChatInput] = useState('');

  const handleChatSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!chatInput.trim() || isThinking) return;
    onSendMessage(chatInput);
    setChatInput('');
  };

  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit(e);
    }
  };

  return (
    <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 shrink-0 h-screen">
      
      
      <div className="p-5 border-b border-slate-100 shrink-0">
        <h1 className="text-3xl font-extrabold text-indigo-600 tracking-tight">Velocity</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Smart Task Management</p>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        
        
        <div className="p-3 shrink-0">
          <div className="bg-gradient-to-br from-indigo-50 to-white p-3 rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-3">
            <div className="text-2xl">🔥</div>
            <div>
              <p className="text-sm font-bold text-indigo-900">{streak} Day Streak</p>
              <p className="text-xs text-indigo-600 font-medium">Keep it going!</p>
            </div>
          </div>
        </div>

        
        <nav className="px-3 pb-3 flex flex-col gap-1.5 shrink-0 border-b border-slate-100">
          <button
            onClick={onOpenSummary}
            className="flex items-center gap-3 px-4 py-2.5 bg-indigo-50/50 text-indigo-700 rounded-xl hover:bg-indigo-100 hover:shadow-sm text-sm font-bold transition-all border border-indigo-100/30"
          >
            <span className="text-lg">☀️</span> {username ? `${username}'s Daily Snapshot` : 'Daily Snapshot'}
          </button>

          <button
            onClick={() => setActiveView('tasks')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeView === 'tasks' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className="text-lg">📋</span>
            <span className="flex-1 text-left">My Tasks</span>
            {taskCount > 0 && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${activeView === 'tasks' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{taskCount}</span>
            )}
          </button>

          <button
            onClick={() => setActiveView('processes')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeView === 'processes' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className="text-lg">🚀</span>
            <span className="flex-1 text-left">My Processes</span>
            {processCount > 0 && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${activeView === 'processes' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{processCount}</span>
            )}
          </button>

          <button
            onClick={() => setActiveView('routines')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeView === 'routines' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className="text-lg">🔁</span>
            <span className="flex-1 text-left">My Routines</span>
            {routineCount > 0 && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${activeView === 'routines' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{routineCount}</span>
            )}
          </button>

          <button
            onClick={() => setActiveView('analytics')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeView === 'analytics'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="text-lg">📈</span> Analytics
          </button>
        </nav>

        
        <div className="flex-1 min-h-0 flex flex-col p-3">
          <div className="flex flex-col bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden relative">
            <div className="p-2.5 border-b border-slate-200 bg-white/50 shrink-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">My AI Agent</p>
            </div>

            <form onSubmit={handleChatSubmit} className="p-2 bg-white shrink-0">
              <textarea 
                disabled={isThinking}
                placeholder="Break down a goal..." 
                rows="3"
                className={`w-full p-2 text-sm rounded-lg bg-slate-100 focus:outline-none transition-all duration-300 resize-none ${
                  isThinking 
                    ? 'ring-2 ring-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.3)] animate-pulse' 
                    : 'focus:ring-2 focus:ring-indigo-500'
                }`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </form>
          </div>
        </div>
      </div>

      
      <div className="p-4 mt-auto border-t border-slate-100 shrink-0 bg-white">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-red-500 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Logout
        </button>
      </div>
      
    </aside>
  );
}