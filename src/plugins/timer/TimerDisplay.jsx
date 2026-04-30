'use client';

/**
 * TimerDisplay.jsx
 *
 * Self-contained UI component for the interval gong timer.
 *
 * Features:
 *  - Circular SVG progress arc showing elapsed / total time
 *  - Section list with completed / active / pending states
 *  - Pause / Resume / Skip / Stop controls
 *  - Extend buttons (+1 min, +5 min)
 *  - Reconciliation dialog (shows what fired in the background)
 *  - Platform warning for iOS limitations
 *
 * Props:
 *  @prop {TimerSection[]}  schedule          - The timer schedule to run.
 *  @prop {Function}        onComplete        - Called with final TimerState when done.
 *  @prop {Function}        onSectionComplete - Called with (sectionId, completedEvents)
 *                                             so the parent can mark tapas parts as done.
 *  @prop {Function}        [onClose]         - Called when the user closes the timer panel.
 *  @prop {string}          [className]       - Extra CSS classes for the container.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTimer } from './useTimer';

// ---------------------------------------------------------------------------
// Utility: format seconds as mm:ss
// ---------------------------------------------------------------------------
const fmt = (sec) => {
  if (sec == null || isNaN(sec)) return '--:--';
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// ---------------------------------------------------------------------------
// Detect iOS (WakeLock + background audio unsupported)
// ---------------------------------------------------------------------------
const isIOS = () =>
  typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !window.MSStream;

// ---------------------------------------------------------------------------
// Circular progress arc (pure SVG)
// ---------------------------------------------------------------------------
const CircularProgress = ({ progress, size = 200, stroke = 10, children }) => {
  const r     = (size - stroke) / 2;
  const circ  = 2 * Math.PI * r;
  const dash  = circ * Math.min(1, Math.max(0, progress));

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Background track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className="text-indigo-500 transition-all duration-500"
        />
      </svg>
      {/* Centre content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Individual event row
// ---------------------------------------------------------------------------
const EventRow = ({ event, status }) => {
  const icons   = { completed: '✓', active: '◉', pending: '○' };
  const colours = {
    completed: 'text-green-600 dark:text-green-400',
    active:    'text-indigo-600 dark:text-indigo-400 font-semibold',
    pending:   'text-gray-400 dark:text-gray-600',
  };
  const gongDots = { soft: '·', medium: '··', deep: '···' };

  return (
    <li className={`flex items-center gap-2 py-1 text-sm ${colours[status]}`}>
      <span className="w-4 text-center">{icons[status]}</span>
      <span className="flex-1 truncate">{event.name}</span>
      <span className="text-xs opacity-60">{gongDots[event.gongType] ?? '·'}</span>
      <span className="text-xs font-mono w-14 text-right">{fmt(event.offsetSec)}</span>
    </li>
  );
};

// ---------------------------------------------------------------------------
// Reconciliation dialog
// ---------------------------------------------------------------------------
const ReconciliationDialog = ({ report, onConfirm, onDismiss }) => {
  if (!report) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <h3 className="text-lg font-bold mb-1 dark:text-white">
          {report.isComplete ? '⏱ Timer abgeschlossen' : '⏱ Timer lief im Hintergrund'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {report.isComplete
            ? 'Der Timer wurde vollständig im Hintergrund abgeschlossen.'
            : `${report.newCompletedCount} Abschnitt${report.newCompletedCount !== 1 ? 'e' : ''} wurden im Hintergrund abgeschlossen.`}
        </p>

        {/* Completed events list */}
        {report.completedEvents.length > 0 && (
          <ul className="mb-4 divide-y divide-gray-100 dark:divide-gray-700">
            {report.completedEvents.map((e, i) => (
              <li key={i} className="py-1 text-sm flex items-center gap-2 text-green-600 dark:text-green-400">
                <span>✓</span>
                <span className="flex-1">{e.name}</span>
                <span className="text-xs font-mono text-gray-400">{fmt(e.offsetSec)}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Current section if timer is still running */}
        {!report.isComplete && report.nextEvent && (
          <p className="text-sm bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3 mb-4">
            Läuft gerade: <strong>{report.nextEvent.name}</strong>
            <br />
            Nächster Gong in: <strong>{fmt(report.nextEventSec)}</strong>
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Ignorieren
          </button>
          <button
            onClick={() => onConfirm(report)}
            className="flex-1 px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
          >
            Als erledigt markieren
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main TimerDisplay component
// ---------------------------------------------------------------------------
export const TimerDisplay = ({
  schedule,
  onComplete,
  onSectionComplete,
  onClose,
  className = '',
}) => {
  const [started, setStarted]       = useState(false);
  const [showEvents, setShowEvents] = useState(true);

  // Handle reconciliation: forward completed sections to the parent
  const handleReconcile = useCallback((report) => {
    if (onSectionComplete && report.completedEvents.length > 0) {
      // Parent can decide whether to show a confirmation dialog
      onSectionComplete(
        report.completedEvents.map(e => e.sectionId),
        report.completedEvents,
      );
    }
  }, [onSectionComplete]);

  const {
    timerState: s,
    reconciliationReport,
    start, pause, resume, stop, skip, extend,
    dismissReconciliation,
  } = useTimer({
    onComplete: (finalState) => {
      // Notify parent that the timer finished
      onComplete?.(finalState);
    },
    onReconcile: handleReconcile,
  });

  // ── Start handler ──────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    if (!schedule || schedule.length === 0) return;
    await start(schedule);
    setStarted(true);
  }, [schedule, start]);

  const handleStop = useCallback(() => {
    stop();
    setStarted(false);
  }, [stop]);

  // Confirm reconciliation and mark parts done
  const handleConfirmReconciliation = useCallback((report) => {
    if (onSectionComplete) {
      onSectionComplete(
        report.completedEvents.map(e => e.sectionId),
        report.completedEvents,
      );
    }
    dismissReconciliation();
  }, [onSectionComplete, dismissReconciliation]);

  // ── Derived display values ─────────────────────────────────────────────
  const elapsed    = s.elapsedSec   ?? 0;
  const remaining  = (s.totalSec ?? 0) - elapsed;
  const progress   = s.progress     ?? 0;
  const nextSec    = s.nextEventSec;

  // Colour pulse when a gong is about to fire (< 3 seconds away)
  const imminent   = nextSec != null && nextSec < 3;

  return (
    <>
      {/* Reconciliation dialog – rendered outside normal flow */}
      <ReconciliationDialog
        report={reconciliationReport}
        onConfirm={handleConfirmReconciliation}
        onDismiss={dismissReconciliation}
      />

      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col gap-5 ${className}`}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold dark:text-white">
            🔔 Gong-Timer
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
              aria-label="Close timer"
            >
              ×
            </button>
          )}
        </div>

        {/* iOS platform warning */}
        {isIOS() && s.running && (
          <p className="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg px-3 py-2">
            ⚠️ iOS: Bitte lasse den Bildschirm aktiv, damit die Töne zuverlässig abgespielt werden.
          </p>
        )}

        {/* ── Circular progress + countdown ──────────────────────────── */}
        <div className="flex justify-center">
          <CircularProgress progress={progress} size={180} stroke={10}>
            <span className={`text-3xl font-mono font-bold tabular-nums transition-colors
              ${imminent ? 'text-orange-500 animate-pulse' : 'dark:text-white'}`}>
              {fmt(nextSec ?? remaining)}
            </span>
            <span className="text-xs text-gray-400 mt-1">
              {s.running
                ? (nextSec != null ? `nächster Gong` : 'fertig')
                : (started ? 'fertig' : 'bereit')}
            </span>
            {s.running && (
              <span className="text-xs text-indigo-500 mt-0.5 font-medium">
                {s.completedCount}/{s.totalEvents} Gongs
              </span>
            )}
          </CircularProgress>
        </div>

        {/* Current section label */}
        {s.running && s.currentSectionName && (
          <p className="text-center text-sm text-gray-600 dark:text-gray-300 -mt-2">
            {s.currentSectionName}
          </p>
        )}

        {/* ── Primary controls ───────────────────────────────────────── */}
        <div className="flex gap-2 justify-center flex-wrap">

          {/* Start / Resume / Pause */}
          {!s.running && !started && (
            <button
              onClick={handleStart}
              className="px-6 py-2 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition-colors"
            >
              ▶ Starten
            </button>
          )}

          {s.running && !s.isPaused && (
            <button
              onClick={pause}
              className="px-5 py-2 bg-amber-500 text-white rounded-full font-medium hover:bg-amber-600 transition-colors"
            >
              ⏸ Pause
            </button>
          )}

          {s.running && s.isPaused && (
            <button
              onClick={resume}
              className="px-5 py-2 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors"
            >
              ▶ Weiter
            </button>
          )}

          {/* Skip to next section */}
          {s.running && (
            <button
              onClick={skip}
              title="Zum nächsten Gong springen"
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              ⏭ Skip
            </button>
          )}

          {/* Stop */}
          {(s.running || started) && (
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full font-medium hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
            >
              ■ Stop
            </button>
          )}
        </div>

        {/* ── Extend controls ─────────────────────────────────────────── */}
        {s.running && (
          <div className="flex gap-2 justify-center items-center">
            <span className="text-xs text-gray-400 mr-1">Verlängern:</span>
            {[1, 2, 5].map(m => (
              <button
                key={m}
                onClick={() => extend(m * 60)}
                className="px-3 py-1 text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors"
              >
                +{m} min
              </button>
            ))}
          </div>
        )}

        {/* ── Overall progress bar ────────────────────────────────────── */}
        {s.running && (
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{fmt(elapsed)}</span>
              <span>{fmt(s.totalSec)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Event list ──────────────────────────────────────────────── */}
        {s.events && s.events.length > 0 && (
          <div>
            <button
              onClick={() => setShowEvents(v => !v)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1 mb-1"
            >
              {showEvents ? '▼' : '▶'} Ablaufplan ({s.events.length} Gongs)
            </button>

            {showEvents && (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-52 overflow-y-auto pr-1">
                {s.events.map((event, idx) => {
                  let status = 'pending';
                  if (idx < s.completedCount) status = 'completed';
                  else if (idx === s.completedCount) status = 'active';
                  return <EventRow key={idx} event={event} status={status} />;
                })}
              </ul>
            )}
          </div>
        )}

        {/* ── Completion message ──────────────────────────────────────── */}
        {started && s.isComplete && (
          <div className="text-center py-2">
            <p className="text-2xl mb-1">🙏</p>
            <p className="text-green-600 dark:text-green-400 font-semibold text-sm">
              Timer abgeschlossen!
            </p>
          </div>
        )}

      </div>
    </>
  );
};

export default TimerDisplay;
