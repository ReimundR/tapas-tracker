/**
 * useTimer.js
 *
 * React hook that wraps TimerEngine and exposes a clean interface
 * to any component in the Tapas Tracker app.
 *
 * Usage:
 *   const {
 *     timerState,
 *     reconciliationReport,
 *     start, pause, resume, stop, skip, extend,
 *     dismissReconciliation,
 *   } = useTimer({ onComplete: (state) => markTapasPartsAsDone(state) });
 *
 *   // Start a session:
 *   start([
 *     { id: 'opening',   name: 'Opening',  duration: 60,  gongType: 'soft',   repeat: 1 },
 *     { id: 'intervals', name: 'Interval', duration: 120, gongType: 'medium', repeat: 5 },
 *     { id: 'closing',   name: 'Closing',  duration: 120, gongType: 'deep',   repeat: 1 },
 *   ]);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTimerEngine } from './timerEngine';

// ---------------------------------------------------------------------------
// Type documentation (JSDoc – works without TypeScript)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} TimerSection
 * @property {string} id          - Unique identifier (used in reconciliation callbacks).
 * @property {string} name        - Display label shown in the UI.
 * @property {number} duration    - Seconds until the gong fires at the end of this section.
 * @property {'soft'|'medium'|'deep'} gongType - Sound character.
 * @property {number} [repeat=1] - How many times to repeat this section.
 */

/**
 * @typedef {Object} TimerState
 * @property {boolean} running
 * @property {boolean} isPaused
 * @property {number}  elapsedSec
 * @property {number}  totalSec
 * @property {number}  progress           0–1
 * @property {number}  completedCount     Events fired so far.
 * @property {number}  totalEvents
 * @property {string}  currentSectionName Label of the section currently running.
 * @property {number}  sectionElapsed     Seconds elapsed in the current section.
 * @property {Object|null} nextEvent      The next scheduled gong event.
 * @property {number|null} nextEventSec   Seconds until next gong.
 * @property {Object[]}    events         Full flat event list.
 * @property {boolean}     isComplete
 */

/**
 * @typedef {Object} ReconciliationReport
 * @property {number}   elapsedSec            Total elapsed seconds (wall clock).
 * @property {Object[]} completedEvents        Events that fired while app was hidden.
 * @property {number}   newCompletedCount      Convenience: completedEvents.length.
 * @property {Object|null} nextEvent           Next pending event (null if done).
 * @property {number|null} nextEventSec        Seconds until next event.
 * @property {string}   currentSectionName
 * @property {number}   sectionElapsed         Seconds elapsed in current section.
 * @property {boolean}  isComplete             Timer finished completely in background.
 */

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @param {Object}   options
 * @param {Function} [options.onComplete]
 *   Called once when all timer events have fired.
 *   Receives the final TimerState.
 *   Use this to auto-mark tapas parts as done.
 *
 * @param {Function} [options.onReconcile]
 *   Called when the app returns to foreground and background events
 *   are detected. Receives a ReconciliationReport.
 *   Use this to prompt the user to mark completed parts as done.
 *   If omitted, the hook stores the report in `reconciliationReport`.
 */
export function useTimer({ onComplete, onReconcile } = {}) {
  const [timerState,           setTimerState]           = useState({ running: false, isPaused: false });
  const [reconciliationReport, setReconciliationReport] = useState(null);

  // Keep callback refs stable so the engine can call the latest version
  // without needing to re-register on every render.
  const onCompleteRef   = useRef(onComplete);
  const onReconcileRef  = useRef(onReconcile);
  onCompleteRef.current  = onComplete;
  onReconcileRef.current = onReconcile;

  const engine = getTimerEngine();

  // -------------------------------------------------------------------------
  // Wire up engine callbacks on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    // State change: forward engine state to React
    engine.onStateChange = (state) => {
      setTimerState(state);
    };

    // Completion: fire the app-level callback
    engine.onComplete = () => {
      const finalState = engine.getState();
      setTimerState(finalState);
      onCompleteRef.current?.(finalState);
    };

    // Visibility change: reconcile background progress
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      const report = engine.reconcile();
      if (!report || report.newCompletedCount === 0) return;

      if (onReconcileRef.current) {
        onReconcileRef.current(report);
      } else {
        setReconciliationReport(report);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // On mount: check whether a timer was running before the page reload
    const orphanReport = engine.reconcile();
    if (orphanReport && orphanReport.newCompletedCount > 0) {
      if (onReconcileRef.current) {
        onReconcileRef.current(orphanReport);
      } else {
        setReconciliationReport(orphanReport);
      }
    }

    // Sync initial state (may be a restored session)
    setTimerState(engine.getState());

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      engine.onStateChange = null;
      engine.onComplete    = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Public controls (memoised so they are stable references)
  // -------------------------------------------------------------------------

  /**
   * Start a new timer session.
   * Calls engine.init() automatically (handles AudioContext unlock).
   * MUST be called from a user-gesture handler (click/tap).
   *
   * @param {TimerSection[]} sections
   */
  const start = useCallback(async (sections) => {
    await engine.init();
    engine.start(sections);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Pause the timer. Audio timeline freezes; wall clock is noted. */
  const pause = useCallback(() => engine.pause(), []); // eslint-disable-line

  /** Resume from pause. */
  const resume = useCallback(() => engine.resume(), []); // eslint-disable-line

  /** Stop the timer completely. Cleans up audio, WakeLock, MediaSession. */
  const stop = useCallback(() => engine.stop(), []); // eslint-disable-line

  /**
   * Skip to the start of the next event.
   * Cancels remaining audio in current section and reschedules.
   */
  const skip = useCallback(() => engine.skip(), []); // eslint-disable-line

  /**
   * Extend the current section by `extraSec` seconds.
   * Pushes all future events forward.
   *
   * @param {number} extraSec
   */
  const extend = useCallback((extraSec) => engine.extend(extraSec), []); // eslint-disable-line

  /**
   * Dismiss the reconciliation dialog without acting on it.
   * Also clears the persisted session data.
   */
  const dismissReconciliation = useCallback(() => {
    setReconciliationReport(null);
    engine.clearPersistedSession();
  }, []); // eslint-disable-line

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------
  return {
    // ── State ──────────────────────────────────────────────────────────────
    /** @type {TimerState} */
    timerState,

    /** @type {ReconciliationReport|null}
     *  Non-null when the app detected that background events fired.
     *  Show a dialog asking the user to confirm completed parts. */
    reconciliationReport,

    // ── Controls ───────────────────────────────────────────────────────────
    start,
    pause,
    resume,
    stop,
    skip,
    extend,
    dismissReconciliation,
  };
}
