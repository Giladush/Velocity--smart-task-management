import React from 'react';

export default function TagPicker({
  newTaskTags, tagInput, setTagInput,
  showTagDropdown, setShowTagDropdown,
  tagAreaRef, addTag, removeTag, handleTagKeyDown,
  filteredSuggestions, allTags, getDropdownStyle
}) {
  return (
    <div className="relative" ref={tagAreaRef}>
      <div
        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl cursor-text min-w-[130px] max-w-[200px] h-[42px] flex-wrap overflow-hidden hover:border-indigo-300 transition-colors"
        onClick={() => newTaskTags.length < 3 && setShowTagDropdown(true)}
      >
        {newTaskTags.map(tag => (
          <span key={tag} className="flex items-center gap-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
            #{tag}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); removeTag(tag); }}
              className="text-yellow-500 hover:text-yellow-800 leading-none ml-0.5"
            >✕</button>
          </span>
        ))}
        {newTaskTags.length < 3 && (
          <input
            type="text"
            placeholder={newTaskTags.length === 0 ? '# Tags' : ''}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onFocus={() => setShowTagDropdown(true)}
            onKeyDown={handleTagKeyDown}
            className="flex-1 min-w-[40px] bg-transparent outline-none text-sm text-slate-600 placeholder-slate-400 w-full"
          />
        )}
      </div>

      {showTagDropdown && (
        <div
          className="bg-white border border-slate-200 rounded-xl shadow-lg p-3"
          style={getDropdownStyle()}
          onMouseDown={(e) => e.preventDefault()}
        >
          {filteredSuggestions.length > 0 && (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Existing tags</p>
              <div className="flex flex-wrap gap-1.5">
                {filteredSuggestions.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="bg-yellow-50 text-yellow-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-yellow-200 hover:bg-yellow-100 transition-colors"
                  >#{tag}</button>
                ))}
              </div>
            </>
          )}
          {tagInput.trim() && !allTags.includes(tagInput.toLowerCase().trim()) && (
            <div className={filteredSuggestions.length > 0 ? 'mt-2 pt-2 border-t border-slate-100' : ''}>
              <button
                type="button"
                onClick={() => addTag(tagInput)}
                className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-200 hover:bg-slate-200 transition-colors"
              >+ Create "#{tagInput.trim()}"</button>
            </div>
          )}
          {filteredSuggestions.length === 0 && !tagInput.trim() && (
            <p className="text-xs text-slate-400">Type a tag name and press Enter</p>
          )}
          {newTaskTags.length >= 3 && (
            <p className="text-xs text-amber-500 font-semibold">Max 3 tags reached</p>
          )}
        </div>
      )}
    </div>
  );
}
