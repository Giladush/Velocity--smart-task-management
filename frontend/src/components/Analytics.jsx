import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Analytics({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('http://127.0.0.1:5000/api/analytics', {
          headers: {
            'Authorization': `Bearer ${token}` 
          }
        });
        if (res.ok) {
          const analyticsData = await res.json();
          setData(analyticsData);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [token]);

  if (loading) return <div className="flex-1 p-8 flex items-center justify-center text-slate-500 font-medium">מכין את הנתונים שלך... ⏳</div>;
  if (!data) return <div className="flex-1 p-8 flex items-center justify-center text-red-500 font-medium">אופס! הייתה בעיה בטעינת הנתונים.</div>;

  const priorities = data.open_tasks_by_priority || { high: 0, normal: 0, low: 0 };
  const totalOpenTasks = priorities.high + priorities.normal + priorities.low || 1; 
  
  const highPct = (priorities.high / totalOpenTasks) * 100;
  const normalPct = (priorities.normal / totalOpenTasks) * 100;
  const lowPct = (priorities.low / totalOpenTasks) * 100;

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  
  const highDash = (highPct / 100) * circumference;
  const normalDash = (normalPct / 100) * circumference;
  const lowDash = (lowPct / 100) * circumference;

  // התיקון: היסט (Offset) שלילי דוחף את תחילת הקו קדימה, בדיוק מאיפה שהקודם עצר
  const normalOffset = -highDash;
  const lowOffset = -(highDash + normalDash);

  return (
    <div className="flex-1 p-8 overflow-y-auto w-full">
      <div className="max-w-5xl mx-auto">
        
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Performance & Analytics 📈</h2>
          <p className="text-slate-500 mt-1 font-medium">A snapshot of your progress this week</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center transition-all hover:shadow-md">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Overall Completion Rate</h3>
            
            <div className="relative w-40 h-40 flex items-center justify-center mb-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                {/* רקע לטבעת */}
                <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                
                {/* מקטע עדיפות גבוהה (אדום) */}
                {highPct > 0 && (
                  <circle 
                    cx="60" cy="60" r={radius} fill="transparent" stroke="#ef4444" strokeWidth="12"
                    strokeDasharray={`${highDash} ${circumference}`}
                    strokeDashoffset={0}
                  />
                )}
                
                {/* מקטע עדיפות רגילה (צהוב) */}
                {normalPct > 0 && (
                  <circle 
                    cx="60" cy="60" r={radius} fill="transparent" stroke="#eab308" strokeWidth="12"
                    strokeDasharray={`${normalDash} ${circumference}`}
                    strokeDashoffset={normalOffset}
                  />
                )}
                
                {/* מקטע עדיפות נמוכה (ירוק) */}
                {lowPct > 0 && (
                  <circle 
                    cx="60" cy="60" r={radius} fill="transparent" stroke="#22c55e" strokeWidth="12"
                    strokeDasharray={`${lowDash} ${circumference}`}
                    strokeDashoffset={lowOffset}
                  />
                )}
              </svg>
              
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-indigo-600">{data.overall_progress}%</span>
              </div>
            </div>
            
            <p className="text-xs text-slate-500">Out of all tasks in the system</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 transition-all hover:shadow-md">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Completed Tasks - Last 7 Days</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weekly_chart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} allowDecimals={false} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold', color: '#1e293b'}}
                  />
                  <Bar dataKey="completed" fill="#6366f1" radius={[6, 6, 0, 0]} name="משימות שהושלמו" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Active Processes Progress</h3>
          <div className="space-y-6">
            {data.processes_progress.map(process => (
              <div key={process.id}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-slate-700">{process.title}</span>
                  <span className="text-slate-500 font-semibold">{process.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${process.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {data.processes_progress.length === 0 && (
               <div className="text-sm text-slate-400 text-center py-4 font-medium">No active processes at the moment.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}