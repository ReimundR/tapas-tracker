/**
 * timerEngine.js
 *
 * Core interval-timer engine for Tapas Tracker.
 * Handles audio scheduling, pause/resume, skip, extend,
 * MediaSession integration, WakeLock, and crash recovery.
 *
 * Design principles:
 *  - Wall clock (Date.now()) is always the source of truth,
 *    not audioCtx.currentTime, which may freeze on iOS/battery-save.
 *  - All future gong events are pre-scheduled into the Web Audio API
 *    scheduler, which runs even when the tab is throttled.
 *  - On skip/extend: cancel all future BufferSources and reschedule.
 *  - Session state is persisted to localStorage so it survives crashes.
 *
 * Public API: see getTimerEngine() at the bottom of this file.
 */

const STORAGE_KEY = 'tapas_timer_session';

// ---------------------------------------------------------------------------
// Synthesised gong presets (oscillator-based, no external files needed).
// Replace _synthesizeGongs() with real audio file loading for production.
// ---------------------------------------------------------------------------
const GONG_PRESETS = {
  soft:   { frequencies: [432, 864],        decay: 2.5, gain: 0.55 },
  medium: { frequencies: [528, 1056, 1584], decay: 3.8, gain: 0.50 },
  deep:   { frequencies: [256, 512, 768],   decay: 5.5, gain: 0.60 },
};

// ---------------------------------------------------------------------------
// TimerEngine class
// ---------------------------------------------------------------------------
export class TimerEngine {
  constructor() {
    this.audioCtx        = null;   // Web Audio context
    this.gongBuffers     = {};     // pre-built AudioBuffer per gong type
    this.scheduledItems  = [];     // { source, fireTime, eventIndex }
    this.session         = null;   // active session object (see _startSession)
    this.isPaused        = false;
    this.pausedAt        = null;   // wall-clock ms when paused
    this.totalPausedMs   = 0;      // accumulated pause duration in ms
    this.wakeLock        = null;   // Screen WakeLock handle
    this.tickHandle      = null;   // setInterval for UI ticks

    /** Callback fired ~2×/sec with the current TimerState.
     *  Set this from the React hook before calling start(). */
    this.onStateChange = null;

    /** Callback fired once when all events have completed. */
    this.onComplete = null;
  }

  // -------------------------------------------------------------------------
  // Initialisation (must be called from a user-gesture handler)
  // -------------------------------------------------------------------------

  /**
   * Initialise the AudioContext and pre-build gong sound buffers.
   * Safe to call multiple times (idempotent).
   */
  async init() {
    if (this.audioCtx) return;
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this._synthesizeGongs();
  }

  /** Build synthesised gong buffers for every preset type. */
  _synthesizeGongs() {
    for (const [type, preset] of Object.entries(GONG_PRESETS)) {
      this.gongBuffers[type] = this._buildGongBuffer(preset);
    }
  }

  /**
   * Create an AudioBuffer for a gong using additive synthesis.
   * Each harmonic decays exponentially; the result sounds bell-like.
   */
  _buildGongBuffer({ frequencies, decay, gain }) {
    const sr     = this.audioCtx.sampleRate;
    const length = Math.ceil(sr * (decay * 2));           // 2× decay time
    const buffer = this.audioCtx.createBuffer(1, length, sr);
    const data   = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sr;
      let sample = 0;
      frequencies.forEach((f, idx) => {
        const amplitude = 1 / (idx + 1);                  // falling harmonics
        sample += amplitude * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / decay);
      });
      data[i] = sample * gain / frequencies.length;
    }
    return buffer;
  }

  // -------------------------------------------------------------------------
  // Schedule helpers
  // -------------------------------------------------------------------------

  /**
   * Expand the user-supplied section array into a flat list of gong events.
   *
   * Input section shape:
   *   { id, name, duration (sec), gongType, repeat? }
   *
   * Output event shape:
   *   { sectionId, name, gongType, offsetSec, repeatIndex, totalRepeats }
   */
  _flattenSections(sections) {
    const events = [];
    let cursor   = 0;

    for (const section of sections) {
      const count = Math.max(1, section.repeat ?? 1);
      for (let r = 0; r < count; r++) {
        cursor += section.duration;
        events.push({
          sectionId:    section.id,
          name:         count > 1 ? `${section.name} ${r + 1}/${count}` : section.name,
          gongType:     section.gongType ?? 'medium',
          offsetSec:    cursor,
          repeatIndex:  r,
          totalRepeats: count,
        });
      }
    }
    return events;
  }

  // -------------------------------------------------------------------------
  // Public controls
  // -------------------------------------------------------------------------

  /**
   * Start a new timer session.
   *
   * @param {Array}  sections  - Array of TimerSection objects (see _flattenSections).
   */
  start(sections) {
    if (!this.audioCtx) {
      throw new Error('TimerEngine: call init() before start()');
    }

    // Stop any running session first
    if (this.session) this.stop();

    const events = this._flattenSections(sections);

    this.session = {
      sections,            // original config (for saving)
      events,              // flat list of gong events
      startWallClock: Date.now(),
      totalPausedMs:  0,
      completed:      false,
    };

    this.totalPausedMs = 0;
    this.isPaused      = false;

    this._saveSession();
    this._scheduleFromIndex(0);
    this._requestWakeLock();
    this._updateMediaSession();
    this._startTick();
  }

  /** Pause the timer (freezes audio timeline and wall-clock accounting). */
  pause() {
    if (!this.session || this.isPaused) return;
    this.isPaused = true;
    this.pausedAt = Date.now();
    this.audioCtx.suspend();
    this._updateMediaSession();
    this._notify();
  }

  /** Resume from pause. */
  resume() {
    if (!this.session || !this.isPaused) return;
    this.totalPausedMs            += Date.now() - this.pausedAt;
    this.session.totalPausedMs     = this.totalPausedMs;
    this.isPaused                  = false;
    this.pausedAt                  = null;
    this.audioCtx.resume();
    this._saveSession();
    this._updateMediaSession();
    this._notify();
  }

  /**
   * Skip to the beginning of the next event.
   * All future sources are cancelled and rescheduled from that point.
   */
  skip() {
    if (!this.session) return;
    const { events }   = this.session;
    const elapsedSec   = this._elapsedSec();

    // Find the index of the next future event
    const nextIdx = events.findIndex(e => e.offsetSec > elapsedSec);
    if (nextIdx === -1) return; // already past the last event

    // Shift the virtual start so that the next event fires "now + ε"
    const jump = events[nextIdx].offsetSec - elapsedSec;
    this.session.startWallClock -= jump * 1000;

    this._saveSession();
    this._scheduleFromIndex(nextIdx);
    this._updateMediaSession();
    this._notify();
  }

  /**
   * Extend the current (upcoming) interval by extraSec seconds.
   * Pushes all future events forward in time.
   *
   * @param {number} extraSec - Seconds to add (positive only).
   */
  extend(extraSec) {
    if (!this.session || extraSec <= 0) return;
    const { events } = this.session;
    const elapsedSec = this._elapsedSec();

    // Find first upcoming event
    const nextIdx = events.findIndex(e => e.offsetSec > elapsedSec);
    if (nextIdx === -1) return;

    // Shift all future events
    for (let i = nextIdx; i < events.length; i++) {
      events[i].offsetSec += extraSec;
    }

    this._saveSession();
    this._scheduleFromIndex(nextIdx);
    this._updateMediaSession();
    this._notify();
  }

  /** Stop the timer and clean up all resources. */
  stop() {
    this._cancelAllFuture();
    this._stopTick();
    this._releaseWakeLock();
    this._clearMediaSession();

    if (this.session) {
      this.session.completed = true;
      this._saveSession();
    }

    this.session       = null;
    this.isPaused      = false;
    this.totalPausedMs = 0;
    this._notify();
  }

  // -------------------------------------------------------------------------
  // Reconciliation (called when app returns to foreground)
  // -------------------------------------------------------------------------

  /**
   * Calculate how many events fired while the app was in the background.
   * Must be called when document.visibilityState becomes 'visible'.
   *
   * Returns a ReconciliationReport or null if no session was active.
   * The calling code should show the report to the user and offer
   * to mark completed tapas parts as done.
   *
   * After reconcile(), any remaining future events are automatically
   * rescheduled in the live AudioContext.
   */
  reconcile() {
    // Try to restore from localStorage if the live session is gone
    // (e.g. page was reloaded / app was killed)
    if (!this.session) {
      const saved = this._loadSession();
      if (!saved || saved.completed) return null;
      // Restore session into memory (audio cannot be restored, only state)
      this.session       = saved;
      this.totalPausedMs = saved.totalPausedMs ?? 0;
    }

    const report = this._buildReport();

    if (!report.isComplete && !this.isPaused) {
      // Resume audio context in case the browser suspended it
      this.audioCtx?.resume();
      this._scheduleFromIndex(report.nextEventIndex);
      this._updateMediaSession();
    }

    if (report.isComplete) {
      this.session.completed = true;
      this._saveSession();
      this._stopTick();
      this.onComplete?.();
    }

    return report;
  }

  // -------------------------------------------------------------------------
  // State query
  // -------------------------------------------------------------------------

  /**
   * Return the current TimerState snapshot.
   * Called internally by the tick loop; also callable directly.
   *
   * @returns {TimerState}
   */
  getState() {
    if (!this.session) {
      return { running: false, isPaused: false };
    }

    const { events }  = this.session;
    const elapsedSec  = this._elapsedSec();
    const totalSec    = events.length > 0 ? events[events.length - 1].offsetSec : 0;

    // Count events that have already fired
    const completedCount = events.filter(e => e.offsetSec <= elapsedSec).length;
    const isComplete     = completedCount >= events.length;

    // Next upcoming event
    const nextEvent    = events[completedCount] ?? null;
    const nextEventSec = nextEvent ? Math.max(0, nextEvent.offsetSec - elapsedSec) : null;

    // Current section label (between previous and next event)
    const prevEvent       = events[completedCount - 1] ?? null;
    const sectionElapsed  = elapsedSec - (prevEvent?.offsetSec ?? 0);
    const currentSectionName = nextEvent?.name ?? prevEvent?.name ?? '';

    return {
      running:             !isComplete,
      isPaused:            this.isPaused,
      elapsedSec,
      totalSec,
      progress:            totalSec > 0 ? Math.min(elapsedSec / totalSec, 1) : 0,
      completedCount,
      totalEvents:         events.length,
      currentSectionName,
      sectionElapsed,
      nextEvent,
      nextEventSec,
      events,
      isComplete,
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Schedule all events from `fromIndex` onward into the AudioContext.
   * Existing future sources are cancelled first.
   */
  _scheduleFromIndex(fromIndex) {
    this._cancelAllFuture();

    const { events } = this.session;
    const now        = this.audioCtx.currentTime;
    const elapsedSec = this._elapsedSec();

    for (let i = fromIndex; i < events.length; i++) {
      const delay = events[i].offsetSec - elapsedSec;
      if (delay <= 0) continue; // already passed

      const source    = this.audioCtx.createBufferSource();
      source.buffer   = this.gongBuffers[events[i].gongType] ?? this.gongBuffers.medium;
      source.connect(this.audioCtx.destination);

      const fireTime = now + delay;
      source.start(fireTime);

      this.scheduledItems.push({ source, fireTime, eventIndex: i });
    }
  }

  /** Stop and discard all future scheduled audio sources. */
  _cancelAllFuture() {
    const now = this.audioCtx?.currentTime ?? 0;
    this.scheduledItems.forEach(({ source, fireTime }) => {
      if (fireTime > now) {
        try { source.stop(); } catch (_) { /* already fired or not started */ }
      }
    });
    this.scheduledItems = [];
  }

  /**
   * Elapsed seconds since timer start, minus all paused time.
   * Uses wall clock (Date.now()) as source of truth.
   */
  _elapsedSec() {
    if (!this.session) return 0;
    const wallNow = this.isPaused ? this.pausedAt : Date.now();
    return (wallNow - this.session.startWallClock - this.totalPausedMs) / 1000;
  }

  /** Build a ReconciliationReport from current session state. */
  _buildReport() {
    const { events } = this.session;
    const elapsedSec = this._elapsedSec();

    const completedEvents = events.filter(e => e.offsetSec <= elapsedSec);
    const nextEventIndex  = completedEvents.length;
    const isComplete      = nextEventIndex >= events.length;

    const nextEvent       = isComplete ? null : events[nextEventIndex];
    const prevEvent       = completedEvents[completedEvents.length - 1] ?? null;

    return {
      elapsedSec,
      completedEvents,           // events that fired in the background
      nextEvent,                 // next event still pending (or null)
      nextEventIndex,            // index into events array
      nextEventSec:  nextEvent ? nextEvent.offsetSec - elapsedSec : null,
      currentSectionName: nextEvent?.name ?? '',
      sectionElapsed: elapsedSec - (prevEvent?.offsetSec ?? 0),
      isComplete,
      /** Number of newly completed events – useful for deciding whether
       *  to show the reconciliation dialog at all. */
      newCompletedCount: completedEvents.length,
    };
  }

  // -------------------------------------------------------------------------
  // Tick loop (drives UI updates)
  // -------------------------------------------------------------------------

  _startTick() {
    this._stopTick();
    this.tickHandle = setInterval(() => {
      const state = this.getState();
      this._notify(state);
      this._updateMediaSession(state);

      if (state.isComplete) {
        this._stopTick();
        this.session.completed = true;
        this._saveSession();
        this._releaseWakeLock();
        this._clearMediaSession();
        this.onComplete?.();
      }
    }, 500);
  }

  _stopTick() {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  _notify(state) {
    this.onStateChange?.(state ?? this.getState());
  }

  // -------------------------------------------------------------------------
  // MediaSession API (notification bar / lock-screen controls)
  // -------------------------------------------------------------------------

  _updateMediaSession(state) {
    if (!('mediaSession' in navigator) || !this.session) return;
    const s = state ?? this.getState();

    navigator.mediaSession.metadata = new MediaMetadata({
      title:  `Tapas Timer – ${s.completedCount}/${s.totalEvents}`,
      artist: s.nextEvent
        ? `${s.nextEvent.name} in ${Math.ceil(s.nextEventSec ?? 0)}s`
        : 'Complete',
      album:  'Tapas Tracker',
    });

    navigator.mediaSession.playbackState = this.isPaused ? 'paused' : 'playing';

    // Wire up lock-screen / notification buttons
    navigator.mediaSession.setActionHandler('pause',     () => this.pause());
    navigator.mediaSession.setActionHandler('play',      () => this.resume());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.skip());
  }

  _clearMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata     = null;
    navigator.mediaSession.playbackState = 'none';
    ['pause', 'play', 'nexttrack'].forEach(a => {
      try { navigator.mediaSession.setActionHandler(a, null); } catch (_) {}
    });
  }

  // -------------------------------------------------------------------------
  // WakeLock (keeps the screen on while timer is running)
  // -------------------------------------------------------------------------

  async _requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      // Re-acquire after visibility change (browser releases it automatically)
      document.addEventListener('visibilitychange', this._reacquireWakeLock);
    } catch (_) { /* not critical */ }
  }

  _reacquireWakeLock = async () => {
    if (document.visibilityState === 'visible' && this.session && !this.isPaused) {
      await this._requestWakeLock();
    }
  };

  _releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
    document.removeEventListener('visibilitychange', this._reacquireWakeLock);
  }

  // -------------------------------------------------------------------------
  // Session persistence (localStorage)
  // -------------------------------------------------------------------------

  _saveSession() {
    if (!this.session) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
    } catch (e) {
      console.warn('TimerEngine: localStorage write failed', e);
    }
  }

  _loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  /** Clear persisted session data (call after the user dismisses recovery). */
  clearPersistedSession() {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// ---------------------------------------------------------------------------
// Singleton accessor
// ---------------------------------------------------------------------------

let _instance = null;

/**
 * Returns the shared TimerEngine singleton.
 * Always use this instead of `new TimerEngine()`.
 */
export const getTimerEngine = () => {
  if (!_instance) _instance = new TimerEngine();
  return _instance;
};
