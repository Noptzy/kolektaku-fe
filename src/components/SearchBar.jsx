"use client";

import { useState, useRef, useEffect } from "react";

export default function SearchBar({ onSearch, placeholder = "Cari anime..." }) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onSearch(value);
    }, 500);
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className={`relative flex items-center overflow-hidden rounded-2xl border bg-slate-900/80 backdrop-blur-xl transition-all duration-300 ${
          isFocused
            ? "border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
            : "border-white/10 hover:border-white/20"
        }`}
      >
        {/* Search Icon */}
        <div className="flex h-12 w-12 items-center justify-center text-white/60">
          <svg
            className={`h-5 w-5 transition-transform duration-300 ${isFocused ? "scale-110 text-red-400" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent py-3 text-white placeholder-white/40 focus:outline-none"
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Search Button */}
        <button
          type="submit"
          className="m-2 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:from-red-500 hover:to-pink-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
        >
          検索
        </button>
      </div>

      {/* Decorative elements */}
      <div className="pointer-events-none absolute -bottom-1 left-1/2 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </form>
  );
}
