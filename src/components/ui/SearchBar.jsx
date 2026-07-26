import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const RECENT_SEARCHES_KEY = 'eventora_recent_searches';
const MAX_RECENT = 5;

export default function SearchBar({ placeholder = 'Search events...', className = '' }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
    } catch { return []; }
  });

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(async (q) => {
    if (!q.trim() || q.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setShowDropdown(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchSuggestions]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Save recent search
  const saveRecentSearch = (q) => {
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  // Execute search
  const executeSearch = (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    saveRecentSearch(trimmed);
    setShowDropdown(false);
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  // Clear recent searches
  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    const items = [...suggestions, ...(query.length < 2 ? recentSearches.map((s) => ({ title: s, _id: s })) : [])];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          executeSearch(items[selectedIndex].title || items[selectedIndex]);
        } else {
          executeSearch(query);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        inputRef.current?.blur();
        break;
    }
  };

  const suggestionItems = query.length >= 2 ? suggestions : recentSearches;

  return (
    <div className={`relative ${className}`} ref={inputRef}>
      <div className="relative">
        {/* Search Icon */}
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            if (suggestions.length > 0 || (query.length < 2 && recentSearches.length > 0)) {
              setShowDropdown(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-9 pr-8 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-purple-400 transition-all ${className.includes('w-') ? '' : ''}`}
          aria-label="Search events"
          aria-autocomplete="list"
          role="combobox"
          aria-expanded={showDropdown}
        />

        {/* Loading or Clear */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
          {loading ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : query ? (
            <button onClick={() => { setQuery(''); setSuggestions([]); setShowDropdown(false); }} className="hover:text-gray-600">
              ✕
            </button>
          ) : null}
        </span>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto"
        >
          {suggestionItems.length === 0 && query.length >= 2 && (
            <div className="px-3 py-3 text-sm text-gray-500 text-center">No results found</div>
          )}

          {/* Recent searches header */}
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs font-medium text-gray-500">Recent Searches</span>
              <button onClick={clearRecent} className="text-xs text-purple-600 hover:underline">Clear</button>
            </div>
          )}

          {suggestionItems.map((item, idx) => (
            <button
              key={item._id || idx}
              onClick={() => executeSearch(item.title || item)}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                idx === selectedIndex ? 'bg-purple-50 dark:bg-purple-900/20' : ''
              } ${idx < suggestionItems.length - 1 ? 'border-b border-gray-50 dark:border-gray-700/50' : ''}`}
            >
              {query.length < 2 ? <span className="text-gray-400">🕐</span> : <span className="text-gray-400">🔍</span>}
              <div>
                <span className="text-gray-900 dark:text-white">{item.title || item}</span>
                {item.city && <span className="text-gray-500 text-xs ml-2">• {item.city}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

