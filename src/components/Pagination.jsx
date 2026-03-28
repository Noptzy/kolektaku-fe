"use client";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    const l = totalPages;

    for (let i = 1; i <= l; i++) {
      if (
        i === 1 ||
        i === l ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (rangeWithDots.length > 0) {
        if (i - rangeWithDots[rangeWithDots.length - 1] === 1) {
          // Consecutive, just push
        } else if (i - rangeWithDots[rangeWithDots.length - 1] === 2) {
          rangeWithDots.push(rangeWithDots[rangeWithDots.length - 1] + 1);
        } else {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  return (
    <nav className="flex items-center gap-2" aria-label="Pagination">
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-2">
        {visiblePages.map((page, index) =>
          page === "..." ? (
            <span
              key={`dots-${index}`}
              className="flex h-10 w-10 items-center justify-center text-white/40"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold transition-all duration-200 ${
                page === currentPage
                  ? "border-red-500/50 bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
              }`}
            >
              {page}
            </button>
          )
        )}
      </div>

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}
