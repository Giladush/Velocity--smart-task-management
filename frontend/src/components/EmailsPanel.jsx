import React from 'react';

const extractSenderName = (from) => {
  if (!from) return 'לא ידוע';
  const match = from.match(/^([^<]+)</);
  if (match) return match[1].trim().replace(/"/g, '');
  return from.split('@')[0];
};

export default function EmailsPanel({ emails, query, error, onAddAsTask, onClose }) {
  if (error === 'not_connected') {
    return (
      <div className="mx-8 mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between" dir="rtl">
        <p className="text-sm text-amber-800 font-medium">כדי לגשת למיילים, יש לחבר את חשבון הגוגל שלך (לחץ על 🔗 בשורת המשימות)</p>
        <button onClick={onClose} className="text-amber-400 hover:text-amber-600 font-bold ml-4">✕</button>
      </div>
    );
  }

  if (error === 'no_gmail_scope') {
    return (
      <div className="mx-8 mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between" dir="rtl">
        <p className="text-sm text-amber-800 font-medium">יש לחבר מחדש את חשבון הגוגל כדי לאפשר גישה למיילים (לחץ על 🔗)</p>
        <button onClick={onClose} className="text-amber-400 hover:text-amber-600 font-bold ml-4">✕</button>
      </div>
    );
  }

  if (error === 'api_not_enabled') {
    return (
      <div className="mx-8 mt-6 bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between" dir="rtl">
        <p className="text-sm text-red-700 font-medium">יש להפעיל את Gmail API ב-Google Cloud Console קודם, ואז לחבר מחדש את גוגל.</p>
        <button onClick={onClose} className="text-red-400 hover:text-red-600 font-bold ml-4">✕</button>
      </div>
    );
  }

  if (error === 'gmail_error') {
    return (
      <div className="mx-8 mt-6 bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between" dir="rtl">
        <p className="text-sm text-red-700 font-medium">שגיאה בשליפת המיילים. נסה שוב.</p>
        <button onClick={onClose} className="text-red-400 hover:text-red-600 font-bold ml-4">✕</button>
      </div>
    );
  }

  return (
    <div className="mx-8 mt-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl shadow-sm" dir="rtl">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">📬</span>
          <h3 className="font-bold text-indigo-900 text-sm">
            מיילים שקשורים ל&quot;{query}&quot;
          </h3>
          <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">{emails.length}</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
      </div>

      {emails.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-sm text-slate-500">לא נמצאו מיילים רלוונטיים לנושא זה.</p>
        </div>
      ) : (
        <div className="divide-y divide-indigo-100/60 overflow-y-auto max-h-52">
          {emails.map((email) => (
            <div key={email.id} className="px-5 py-3.5 flex items-start justify-between gap-4 hover:bg-white/50 transition-colors">
              <a
                href={`https://mail.google.com/mail/u/0/#inbox/${email.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 group cursor-pointer"
              >
                <p className="text-xs font-semibold text-indigo-500 mb-0.5 truncate">{extractSenderName(email.sender)}</p>
                <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">{email.subject}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{email.summary}</p>
              </a>
              <button
                onClick={() => onAddAsTask(email.summary || email.subject)}
                className="shrink-0 text-xs font-bold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                + הוסף כמשימה
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
