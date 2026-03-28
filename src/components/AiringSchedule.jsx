"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import animeService from "@/lib/animeApi";

// Swiper imports
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Mousewheel, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/navigation';

const DayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FullDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AiringSchedule() {
  const router = useRouter();
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(new Date().toISOString().split('T')[0]);
  const [showAll, setShowAll] = useState(false);
  const [swiperRef, setSwiperRef] = useState(null);

  useEffect(() => {
    async function fetchSchedules() {
      try {
        setLoading(true);
        const res = await animeService.getAiringSchedules();
        if (res.success) {
          setSchedules(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch schedules:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSchedules();
  }, []);

  // Center active day in swiper when it changes
  useEffect(() => {
      if (swiperRef && activeDay) {
          const index = scheduleDays.findIndex(d => d.dateKey === activeDay);
          if (index !== -1) {
              swiperRef.slideTo(index);
          }
      }
  }, [activeDay, swiperRef]);

  const getScheduleDays = () => {
    const days = [];
    const now = new Date();
    
    for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(now.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        days.push({
            index: i,
            dateKey: dateStr,
            name: DayNames[d.getDay()],
            fullDayName: FullDayNames[d.getDay()],
            date: d.getDate(),
            month: d.toLocaleString('default', { month: 'short' })
        });
    }
    return days;
  };

  const scheduleDays = getScheduleDays();
  const currentSchedules = schedules?.[activeDay] || [];
  const displayedSchedules = Array.isArray(currentSchedules) ? (showAll ? currentSchedules : currentSchedules.slice(0, 8)) : [];

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  return (
    <section className="mt-14 mb-16 px-1">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xl overflow-hidden">
        {/* Header Section */}
        <div className="p-6 md:p-8 border-b border-[var(--border)] bg-gradient-to-r from-[var(--bg-secondary)]/30 to-transparent">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="flex h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
                        <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Estimated Schedule</h2>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                        (GMT+07:00) {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                </div>
                <div className="text-right flex items-center gap-2 bg-[var(--bg-primary)] px-4 py-2 rounded-xl border border-[var(--border)] self-start md:self-center">
                    <svg className="w-4 h-4 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                        {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                </div>
            </div>
        </div>

        {/* Swiper for Days */}
        <div className="bg-[var(--bg-secondary)]/10 border-b border-[var(--border)] py-4 md:py-6 px-4 relative">
          <div className="flex items-center gap-2">
            {/* Left Arrow */}
            <button className="schedule-prev-btn shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all disabled:opacity-30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>

            <div className="flex-1 overflow-hidden">
              <Swiper
                onSwiper={setSwiperRef}
                modules={[FreeMode, Mousewheel, Navigation]}
                spaceBetween={12}
                slidesPerView={'auto'}
                freeMode={true}
                mousewheel={{ forceToAxis: true }}
                grabCursor={true}
                simulateTouch={true}
                navigation={{
                  prevEl: '.schedule-prev-btn',
                  nextEl: '.schedule-next-btn',
                }}
                className="date-swiper !overflow-visible"
                breakpoints={{
                    320: { spaceBetween: 8 },
                    768: { spaceBetween: 12 }
                }}
              >
                {scheduleDays.map((day) => (
                  <SwiperSlide key={day.dateKey} className="!w-auto">
                    <button
                      onClick={() => {
                          setActiveDay(day.dateKey);
                          setShowAll(false);
                      }}
                      className={`flex flex-col items-center justify-center min-w-[100px] h-[75px] rounded-2xl border transition-all ${
                        activeDay === day.dateKey
                          ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-lg shadow-[var(--accent-muted)] scale-105 z-10"
                          : "bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-secondary)]/50"
                      }`}
                    >
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${activeDay === day.dateKey ? "text-white/70" : "text-[var(--text-tertiary)]"}`}>
                          {day.name}
                      </span>
                      <span className="text-lg font-extrabold leading-none mt-1">
                          {day.date}
                      </span>
                      <span className={`text-[10px] font-medium ${activeDay === day.dateKey ? "text-white/80" : "text-[var(--text-tertiary)]"}`}>
                          {day.month}
                      </span>
                    </button>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            {/* Right Arrow */}
            <button className="schedule-next-btn shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all disabled:opacity-30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {/* Schedule List Content */}
        <div className="p-4 md:p-8 min-h-[400px]">
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="relative h-12 w-12">
                        <div className="absolute inset-0 rounded-full border-4 border-[var(--border)]" />
                        <div className="absolute inset-0 rounded-full border-4 border-t-[var(--accent)] animate-spin" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text-secondary)] animate-pulse">Synchronizing schedules...</p>
                </div>
            ) : currentSchedules.length > 0 ? (
                <div className="flex flex-col gap-2">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--text-tertiary)] ml-2">
                           {activeDay === new Date().toISOString().split('T')[0] ? "Today's Releases" : `${FullDayNames[new Date(activeDay).getDay()]}'s Lineup`}
                        </h3>
                        <span className="px-3 py-1 bg-[var(--accent-muted)] text-[var(--accent)] text-[10px] font-bold rounded-lg uppercase tracking-wider">
                            {currentSchedules.length} Series
                        </span>
                    </div>

                    <div className="space-y-2">
                        {displayedSchedules.map((item, idx) => (
                            <div 
                                key={idx}
                                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl hover:bg-[var(--bg-secondary)]/50 transition-all border border-transparent hover:border-[var(--border)] duration-300"
                            >
                                <div className="flex items-center gap-6 flex-1 min-w-0">
                                    <div className="flex flex-col items-center justify-center w-[65px] h-[45px] rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] group-hover:border-[var(--accent)]/30 transition-colors shadow-sm">
                                        <span className="text-base font-black text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                                            {formatTime(item.airingAt)}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 
                                            onClick={() => router.push(`/anime/${item.koleksi.slug}`)}
                                            className="text-base md:text-lg font-bold text-[var(--text-primary)] truncate cursor-pointer hover:text-[var(--accent)] transition-colors"
                                        >
                                            {item.koleksi.title}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-[var(--bg-secondary)] rounded-md text-[var(--text-tertiary)]">
                                                {item.koleksi.type}
                                            </span>
                                            <span className="text-xs text-[var(--text-tertiary)]">
                                                Episode {item.episodeNumber}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 mt-4 sm:mt-0 sm:ml-4">
                                    <button 
                                        onClick={() => router.push(`/anime/${item.koleksi.slug}`)}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] shadow-sm transition-all active:scale-95 group/btn"
                                    >
                                        <svg className="w-4 h-4 transition-transform group-hover/btn:scale-110" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                        </svg>
                                        Watch Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                
                    {currentSchedules.length > 8 && (
                        <div className="relative mt-8 flex justify-center">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-[var(--border)] opacity-50" />
                            </div>
                            <button 
                                onClick={() => setShowAll(!showAll)}
                                className="relative flex items-center gap-2 px-6 py-2 text-xs font-black uppercase tracking-widest bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 rounded-full transition-all shadow-sm"
                            >
                                <span>{showAll ? "Collapse" : `Show ${currentSchedules.length - 8} More`}</span>
                                <svg className={`w-3 h-3 transition-transform duration-300 ${showAll ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="py-20 text-center bg-[var(--bg-secondary)]/10 rounded-[2rem] border-2 border-dashed border-[var(--border)] flex flex-col items-center gap-4">
                    <span className="text-5xl opacity-40">📅</span>
                    <div>
                        <p className="text-lg font-bold text-[var(--text-primary)]">TBA (To Be Announced)</p>
                        <p className="text-sm text-[var(--text-tertiary)] mt-1 max-w-[280px] mx-auto">
                            No releases have been localized for this date yet. Check back later!
                        </p>
                    </div>
                    <button 
                         onClick={() => setActiveDay(new Date().toISOString().split('T')[0])}
                         className="mt-2 text-xs font-bold text-[var(--accent)] hover:underline"
                    >
                        Back to Today
                    </button>
                </div>
            )}
        </div>
      </div>
    </section>
  );
}
