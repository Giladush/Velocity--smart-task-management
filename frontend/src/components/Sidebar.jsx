import React, { useState } from 'react';

export default function Sidebar({ activeView, setActiveView, streak, onSendMessage, isThinking }) {
  const [chatInput, setChatInput] = useState('');

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isThinking) return;
    onSendMessage(chatInput);
    setChatInput('');
  };

  return (
    <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 shrink-0">
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <h1 className="text-3xl font-extrabold text-indigo-600 tracking-tight">Velocity</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Task & Process Manager</p>
      </div>

      {/* Navigation Tabs */}
      <nav className="p-4 flex flex-col gap-2">
        <button 
          onClick={() => setActiveView('tasks')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
            activeView === 'tasks' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <span className="text-lg">📋</span> Task Board
        </button>
        <button 
          onClick={() => setActiveView('processes')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
            activeView === 'processes' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <span className="text-lg">🚀</span> Process Board
        </button>
        <button 
          onClick={() => setActiveView('routines')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
            activeView === 'routines' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <span className="text-lg">🔁</span> Daily Routines
        </button>
      </nav>

      <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
        {/* Streak Area */}
        <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🔥</div>
            <div>
              <p className="text-sm font-bold text-indigo-900">{streak} Day Streak</p>
              <p className="text-xs text-indigo-600 font-medium">Keep it going!</p>
            </div>
          </div>
        </div>
        
        {/* Stride AI Chat interface */}
        <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col overflow-hidden relative">
          <div className="p-3 border-b border-slate-200 bg-white/50">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stride AI Agent</p>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto text-xs text-slate-600 space-y-3">
             <p className="bg-indigo-100 text-indigo-800 p-3 rounded-2xl rounded-tl-none font-medium italic">
               Hi! Tell me a goal, and I'll break it down into tasks for you.
             </p>
          </div>

          <form onSubmit={handleChatSubmit} className="p-3 bg-white border-t border-slate-200">
            <input 
              type="text" 
              disabled={isThinking}
              placeholder="Break down a goal..." 
              className={`w-full p-2 text-sm rounded-lg bg-slate-100 focus:outline-none transition-all duration-300 ${
                isThinking 
                  ? 'ring-2 ring-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.3)] animate-pulse' 
                  : 'focus:ring-2 focus:ring-indigo-500'
              }`}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
          </form>
        </div>
      </div>
    </aside>
  );
}