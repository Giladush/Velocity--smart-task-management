import React, { useState, useEffect, useRef } from 'react';
import { fetchRoutines as apiFetchRoutines, toggleRoutine as apiToggleRoutine, deleteRoutine as apiDeleteRoutine, createRoutine as apiCreateRoutine, updateRoutine as apiUpdateRoutine } from '../services/api';
import { CrudKeyframes, crudAnimation } from './animations/TaskCrudMotion';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RoutinesBoard({ onDataChange }) {
  const [routines, setRoutines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState('⚡');
  const [selectedDays, setSelectedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDays, setEditDays] = useState([]);

  const [enteringIds, setEnteringIds] = useState(new Set());
  const [leavingIds, setLeavingIds] = useState(new Set());
  const prevRoutineIdsRef = useRef(new Set());

  useEffect(() => {
    const currentIds = new Set(routines.map(r => r.id));
    if (prevRoutineIdsRef.current.size > 0) {
      const newIds = [...currentIds].filter(id => !prevRoutineIdsRef.current.has(id));
      if (newIds.length > 0) {
        setEnteringIds(prev => new Set([...prev, ...newIds]));
        setTimeout(() => {
          setEnteringIds(prev => { const n = new Set(prev); newIds.forEach(id => n.delete(id)); return n; });
        }, 2000);
      }
    }
    prevRoutineIdsRef.current = currentIds;
  }, [routines]);

  useEffect(() => {
    fetchRoutines();
  }, []);

  const fetchRoutines = async () => {
    try {
      const token = localStorage.getItem('stride_token');
      const response = await apiFetchRoutines(token);
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setRoutines(data);
      } else {
        console.error("Server error or invalid data:", data);
        setRoutines([]);
      }
    } catch (error) {
      console.error("Error fetching routines:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRoutine = async (id) => {
    
    const previousRoutines = [...routines];
    
    setRoutines(routines.map(routine => 
      routine.id === id 
        ? { ...routine, completedToday: !routine.completedToday, streak: routine.completedToday ? routine.streak - 1 : routine.streak + 1 } 
        : routine
    ));

    try {
      const token = localStorage.getItem('stride_token');
      const response = await apiToggleRoutine(token, id);
      
      if (!response.ok) {
        throw new Error("Toggle failed on server");
      }
      
      const updatedRoutine = await response.json();
      setRoutines(prev => prev.map(r => r.id === id ? updatedRoutine : r));
    } catch (error) {
      console.error("Error toggling routine:", error);
      
      setRoutines(previousRoutines);
    }
  };

  const deleteRoutine = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('האם אתה בטוח שברצונך למחוק שגרה זו?')) return;

    setLeavingIds(prev => new Set([...prev, id]));
    setTimeout(async () => {
      setRoutines(prev => prev.filter(r => r.id !== id));
      setLeavingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      try {
        const token = localStorage.getItem('stride_token');
        await apiDeleteRoutine(token, id);
        if (onDataChange) onDataChange();
      } catch (error) {
        console.error("Error deleting routine:", error);
        fetchRoutines();
      }
    }, 520);
  };

  const startEditing = (routine, e) => {
    e.stopPropagation();
    setEditingId(routine.id);
    setEditTitle(routine.title);
    setEditDays([...(routine.frequency || [])]);
  };

  const toggleEditDay = (day) => {
    setEditDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || editDays.length === 0) return;
    try {
      const token = localStorage.getItem('stride_token');
      const res = await apiUpdateRoutine(token, editingId, { title: editTitle, frequency: editDays });
      if (res.ok) {
        const updated = await res.json();
        setRoutines(prev => prev.map(r => r.id === editingId ? updated : r));
      }
    } catch (err) {
      console.error('Error updating routine:', err);
    }
    setEditingId(null);
  };

  const toggleDay = (day) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAddRoutine = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || selectedDays.length === 0) return;

    const routineData = {
      title: newTitle,
      icon: newIcon,
      frequency: selectedDays
    };

    try {
      const token = localStorage.getItem('stride_token');
      const response = await apiCreateRoutine(token, routineData);
      
      
      
      setNewTitle('');
      setNewIcon('⚡');
      setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      setIsAdding(false);
      
      
      await fetchRoutines();
      if (onDataChange) onDataChange();
      
    } catch (error) {
      console.error("Error creating routine:", error);
    }
  };

  return (
    <main className="flex-1 flex flex-col relative bg-slate-50 overflow-hidden">
      <CrudKeyframes />
      
      <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 z-10 shrink-0">
        <h2 className="text-xl font-bold text-slate-800">Daily Routines</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors"
        >
          {isAdding ? 'Cancel' : '+ New Routine'}
        </button>
      </header>
      
      <div className="flex-1 p-8 overflow-y-auto overflow-x-hidden">
        
        
        {isAdding && (
          <form onSubmit={handleAddRoutine} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex gap-4">
              <input 
                type="text" 
                placeholder="Routine title..." 
                className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
              <input 
                type="text" 
                placeholder="Icon" 
                className="w-24 px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-center text-xl"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                maxLength="2"
              />
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-2">
                <span className="text-sm font-bold text-slate-400 mr-2 self-center">Active Days:</span>
                {DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`w-10 h-10 rounded-full text-xs font-bold transition-colors ${
                      selectedDays.includes(day)
                        ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-200'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <button 
                type="submit" 
                disabled={!newTitle.trim() || selectedDays.length === 0}
                className="px-6 py-2.5 bg-slate-800 disabled:bg-slate-300 hover:bg-slate-900 text-white text-sm font-bold rounded-xl transition-colors"
              >
                Create Routine
              </button>
            </div>
          </form>
        )}

        
        {isLoading ? (
          <div className="flex justify-center items-center h-40 text-slate-400 font-bold">
            טוען שגרות מהשרת...
          </div>
        ) : routines.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 text-slate-400 gap-4">
            <span className="text-4xl">📭</span>
            <p className="font-medium text-lg">אין שגרות כרגע. מסד הנתונים ריק!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routines.map(routine => (
              <div
                key={routine.id}
                style={{
                  animation: crudAnimation({ kind: 'card', leaving: leavingIds.has(routine.id), source: enteringIds.has(routine.id) ? 'form' : undefined }),
                  overflow: 'hidden',
                }}
                className={`group flex items-center gap-5 p-6 rounded-3xl border transition-all duration-300 text-right relative ${
                  routine.completedToday
                    ? 'bg-indigo-50/80 border-indigo-200 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1'
                }`}
              >
                {editingId === routine.id ? (
                  <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-bold border border-indigo-300 rounded-xl bg-indigo-50/50 outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800"
                    />
                    <div className="flex gap-1.5 flex-wrap">
                      {DAYS.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleEditDay(day)}
                          className={`w-9 h-9 rounded-full text-[11px] font-bold transition-colors ${
                            editDays.includes(day)
                              ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                        >{day}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={!editTitle.trim() || editDays.length === 0} className="px-4 py-1.5 bg-indigo-600 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors">שמור</button>
                      <button type="button" onClick={() => setEditingId(null)} className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">ביטול</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex flex-1 items-center gap-5 min-w-0">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className={`text-lg font-bold truncate ${routine.completedToday ? 'text-indigo-900' : 'text-slate-700'}`}>
                          {routine.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-sm">
                          <span className="text-slate-500 font-medium">רצף נוכחי:</span>
                          <span className={`font-bold ${routine.completedToday ? 'text-orange-500' : 'text-slate-400'}`}>
                            {routine.streak} 🔥
                          </span>
                        </div>
                        <div className="flex gap-1 mt-2">
                          {DAYS.map(day => (
                            <span key={day} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              routine.frequency && routine.frequency.includes(day)
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-slate-100 text-slate-300'
                            }`}>{day}</span>
                          ))}
                        </div>
                      </div>
                      <div className={`text-4xl transition-transform ${routine.completedToday ? 'scale-110' : 'grayscale opacity-50'}`}>
                        {routine.icon}
                      </div>
                    </div>
                    <button
                      onClick={(e) => startEditing(routine, e)}
                      className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-indigo-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                      title="ערוך שגרה"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => deleteRoutine(routine.id, e)}
                      className="absolute top-3 left-3 p-1.5 text-slate-300 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                      title="מחק שגרה"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}