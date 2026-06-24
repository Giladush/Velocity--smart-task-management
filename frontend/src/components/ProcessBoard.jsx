import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CrudKeyframes, crudAnimation } from './animations/TaskCrudMotion';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;
function StepTitle({ title }) {
  const parts = title.split(URL_REGEX);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\/[^\s]+$/.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            className="text-indigo-600 underline break-all"
            onClick={e => e.stopPropagation()}>
            {part}
          </a>
        ) : part
      )}
    </>
  );
}

export default function ProcessBoard({ processes, selectedProcessId, onUpdateTask, onDeleteTask, onCreateProcess, onDeleteProcess, onAddProcessTask }) {
  const [expandedId, setExpandedId] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const processRefs = useRef({});
  const scrolledToRef = useRef(null);
  const [newProcessTitle, setNewProcessTitle] = useState('');
  const [addingStepToId, setAddingStepToId] = useState(null);
  const [newStepTitle, setNewStepTitle] = useState('');

  const [enteringIds, setEnteringIds] = useState(new Set());
  const [leavingIds, setLeavingIds] = useState(new Set());
  const [processGhosts, setProcessGhosts] = useState({});
  const prevProcessIdsRef = useRef(new Set());

  useEffect(() => {
    const currentIds = new Set(processes.map(p => p.id));
    if (prevProcessIdsRef.current.size > 0) {
      const newIds = [...currentIds].filter(id => !prevProcessIdsRef.current.has(id));
      if (newIds.length > 0) {
        setEnteringIds(prev => new Set([...prev, ...newIds]));
        setTimeout(() => {
          setEnteringIds(prev => { const n = new Set(prev); newIds.forEach(id => n.delete(id)); return n; });
        }, 2000);
      }
      prevProcessIdsRef.current.forEach(id => {
        if (!currentIds.has(id)) {
          setProcessGhosts(prev => { const n = { ...prev }; delete n[id]; return n; });
          setLeavingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        }
      });
    }
    prevProcessIdsRef.current = currentIds;
  }, [processes]);

  const handleDeleteProcess = useCallback((e, processId) => {
    e.stopPropagation();
    const process = processes.find(p => p.id === processId);
    if (!process) return;
    setProcessGhosts(prev => ({ ...prev, [processId]: process }));
    setLeavingIds(prev => new Set([...prev, processId]));
    setTimeout(() => onDeleteProcess(processId), 520);
  }, [processes, onDeleteProcess]);

  useEffect(() => {
    if (selectedProcessId && selectedProcessId !== scrolledToRef.current) {
      const targetId = Number(selectedProcessId);
      const isProcessLoaded = processes.some(p => Number(p.id) === targetId);
      if (isProcessLoaded) {
        scrolledToRef.current = selectedProcessId;
        setExpandedId(targetId);
        setTimeout(() => {
          const el = processRefs.current[targetId];
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [selectedProcessId, processes]);

  const handleSidebarClick = (processId) => {
    setHighlightedId(processId);
    setExpandedId(processId);
    setTimeout(() => {
      const el = processRefs.current[processId];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleCreateProcess = (e) => {
    e.preventDefault();
    if (!newProcessTitle.trim()) return;
    onCreateProcess(newProcessTitle.trim());
    setNewProcessTitle('');
  };

  const sorted = [...processes].reverse();
  const ghostsList = Object.values(processGhosts).filter(g => !processes.some(p => p.id === g.id));
  const displaySorted = [...sorted, ...ghostsList];

  const handleAddStep = (e, processId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newStepTitle.trim()) return;
    onAddProcessTask(processId, newStepTitle.trim());
    setNewStepTitle('');
    setAddingStepToId(null);
  };

  return (
    <main className="flex-1 flex flex-col relative bg-slate-50 overflow-hidden">
      <CrudKeyframes />
      <header className="h-[88px] border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 z-10 shadow-sm">
        <h2 className="text-2xl font-extrabold text-slate-800 shrink-0">Processes</h2>
        <form onSubmit={handleCreateProcess} className="flex gap-3 ml-8 flex-1 max-w-xl">
          <input
            type="text"
            placeholder="New process title..."
            value={newProcessTitle}
            onChange={(e) => setNewProcessTitle(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all hover:shadow hover:-translate-y-0.5 whitespace-nowrap"
          >
            + Create
          </button>
        </form>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* Left navigation sidebar */}
        <aside className="w-1/3 border-r border-slate-200 bg-white overflow-y-auto shrink-0 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 shrink-0">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {sorted.length} {sorted.length === 1 ? 'Process' : 'Processes'}
            </h3>
          </div>
          <div className="p-3 flex-1 overflow-y-auto">
            {sorted.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">No processes yet</p>
            ) : (
              sorted.map(p => {
                const totalTasks = p.tasks?.length || 0;
                const completedTasks = p.tasks?.filter(t => t.is_completed).length || 0;
                const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
                const isSelected = highlightedId === p.id;
                const isDone = progress === 100 && totalTasks > 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSidebarClick(p.id)}
                    className={`w-full text-left px-3 py-3 rounded-xl mb-1 transition-all ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-semibold truncate">{p.title}</p>
                      {isDone && (
                        <span className="shrink-0 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">✓ Done</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{progress}% · {totalTasks} steps</p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Cards area */}
        <div className="flex-1 p-6 overflow-y-auto overflow-x-hidden space-y-5">
          {sorted.length === 0 && ghostsList.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <span className="text-5xl block mb-4">🚀</span>
              <p>No active processes. Create one above or ask the AI agent!</p>
            </div>
          ) : (
            displaySorted.map(p => {
              const totalTasks = p.tasks?.length || 0;
              const completedTasks = p.tasks?.filter(t => t.is_completed).length || 0;
              const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
              const isExpanded = Number(expandedId) === Number(p.id);
              const isHighlighted = highlightedId === p.id && !isExpanded;

              return (
                <div
                  key={p.id}
                  ref={el => processRefs.current[p.id] = el}
                  onClick={() => { setExpandedId(isExpanded ? null : p.id); }}
                  style={{
                    animation: crudAnimation({ kind: 'card', leaving: leavingIds.has(p.id), source: enteringIds.has(p.id) ? 'form' : undefined }),
                    overflow: 'hidden',
                  }}
                  className={`group bg-white p-6 rounded-3xl border shadow-sm transition-all duration-300 cursor-pointer hover:shadow-md ${
                    isExpanded
                      ? 'border-indigo-400 ring-4 ring-indigo-50'
                      : isHighlighted
                      ? 'border-indigo-300 ring-4 ring-indigo-100 shadow-md shadow-indigo-50'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-slate-800 break-words">{p.title}</h3>
                      <p className="text-sm text-slate-500 mt-1 break-words">{p.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
                          {totalTasks} Steps
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {progressPercentage}% Done
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteProcess(e, p.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Delete process"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
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
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 text-center">Progress Path</h4>

                      <div className="relative flex flex-col items-center z-0" dir="rtl">
                        <div className="absolute top-4 bottom-8 w-3 bg-slate-200 rounded-full -z-10"></div>

                        {p.tasks?.map((task, index) => {
                          const isCompleted = task.is_completed;
                          return (
                            <div
                              key={task.id}
                              className="relative flex flex-col items-center mb-8 cursor-pointer group/task"
                              onClick={() => onUpdateTask({ ...task, is_completed: !isCompleted })}
                            >
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-sm border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                                isCompleted
                                  ? 'bg-emerald-400 border-emerald-500 text-white scale-110'
                                  : 'bg-white border-slate-200 text-slate-400 group-hover/task:bg-slate-50'
                              }`}>
                                {isCompleted ? '✓' : index + 1}
                              </div>
                              <div className="mt-3 flex items-center gap-1">
                                <span className={`text-sm font-bold px-4 py-1.5 rounded-full shadow-sm border ${
                                  isCompleted ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-white border-slate-200'
                                }`}>
                                  <StepTitle title={task.title} />
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                                  className="opacity-0 group-hover/task:opacity-100 text-slate-300 hover:text-red-500 transition-all text-xs leading-none"
                                  title="Delete step"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {addingStepToId === p.id ? (
                          <form
                            onSubmit={(e) => handleAddStep(e, p.id)}
                            className="flex flex-col items-center mb-4 gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              autoFocus
                              type="text"
                              value={newStepTitle}
                              onChange={(e) => setNewStepTitle(e.target.value)}
                              placeholder="Step name..."
                              className="px-4 py-2 border border-indigo-300 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-400 bg-white w-48 text-center"
                              onKeyDown={(e) => { if (e.key === 'Escape') { setAddingStepToId(null); setNewStepTitle(''); } }}
                            />
                            <div className="flex gap-2">
                              <button type="submit" className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">Add</button>
                              <button type="button" onClick={() => { setAddingStepToId(null); setNewStepTitle(''); }} className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-200">Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setAddingStepToId(p.id); setNewStepTitle(''); }}
                            className="mt-2 w-10 h-10 rounded-full bg-white border-2 border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center justify-center text-xl font-bold"
                            title="Add step"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
