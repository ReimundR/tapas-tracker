/**
 * index.js  –  Public API for the Tapas Timer module
 *
 * Import from this file in the rest of the app:
 *
 *   import { TimerDisplay, useTimer, buildSchedule } from '@/app/components/timer';
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Integration example (TapasDetail.jsx):
 *
 *   const schedule = buildSchedule.meditationWithIntervals({
 *     openingSilenceSec: 60,
 *     intervalSec: 120,
 *     intervalCount: 5,
 *   });
 *
 *   <TimerDisplay
 *     schedule={schedule}
 *     onComplete={(finalState) => {
 *       console.log('Timer done', finalState);
 *     }}
 *     onSectionComplete={(sectionIds, events) => {
 *       // Mark the relevant tapas parts as done in Firestore
 *       sectionIds.forEach(id => markPartAsDone(tapas.id, id));
 *     }}
 *   />
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * If you need low-level control (e.g. to drive a custom UI):
 *
 *   const { timerState, start, pause, skip, extend } = useTimer({
 *     onComplete: (state) => { ... },
 *     onReconcile: (report) => {
 *       // report.completedEvents = what fired in the background
 *       showReconciliationDialog(report);
 *     },
 *   });
 */

export { TimerDisplay }      from './TimerDisplay';
export { useTimer }          from './useTimer';
export { getTimerEngine }    from './timerEngine';

// ---------------------------------------------------------------------------
// Schedule builder helpers
// Pre-built schedule templates for common Tapas use cases.
// ---------------------------------------------------------------------------

/**
 * Build a fully custom schedule from an array of section configs.
 * This is the low-level builder – use the presets below for common patterns.
 *
 * @param {Array<{
 *   id:        string,
 *   name:      string,
 *   duration:  number,      // seconds
 *   gongType:  'soft'|'medium'|'deep',
 *   repeat?:   number,
 * }>} sections
 * @returns {TimerSection[]}
 */
const custom = (sections) => sections;

/**
 * Classic meditation timer:
 *   1. Opening silence  → soft gong
 *   2. N equal intervals → medium gong
 *   3. Closing period   → deep gong (= end gong)
 *
 * @param {Object} opts
 * @param {number} opts.openingSilenceSec   Default: 60
 * @param {number} opts.intervalSec         Default: 120
 * @param {number} opts.intervalCount       Default: 5
 * @param {number} [opts.closingSec]        Default: same as intervalSec
 */
const meditationWithIntervals = ({
  openingSilenceSec = 60,
  intervalSec       = 120,
  intervalCount     = 5,
  closingSec,
}) => [
  {
    id:       'opening',
    name:     'Öffnung',
    duration: openingSilenceSec,
    gongType: 'soft',
    repeat:   1,
  },
  {
    id:       'interval',
    name:     'Intervall',
    duration: intervalSec,
    gongType: 'medium',
    repeat:   Math.max(1, intervalCount - 1), // last interval uses 'deep'
  },
  {
    id:       'closing',
    name:     'Abschluss',
    duration: closingSec ?? intervalSec,
    gongType: 'deep',
    repeat:   1,
  },
];

/**
 * Simple countdown: one gong after `durationSec` seconds.
 *
 * @param {Object} opts
 * @param {number} opts.durationSec
 * @param {string} [opts.name]
 */
const countdown = ({ durationSec, name = 'Timer' }) => [
  {
    id:       'countdown',
    name,
    duration: durationSec,
    gongType: 'deep',
    repeat:   1,
  },
];

/**
 * Pomodoro-style: work → short break, repeated N times, then long break.
 *
 * @param {Object} opts
 * @param {number} [opts.workSec]       Default: 25 * 60
 * @param {number} [opts.shortBreakSec] Default: 5 * 60
 * @param {number} [opts.longBreakSec]  Default: 15 * 60
 * @param {number} [opts.cycles]        Default: 4
 */
const pomodoro = ({
  workSec       = 25 * 60,
  shortBreakSec = 5  * 60,
  longBreakSec  = 15 * 60,
  cycles        = 4,
}) => {
  const sections = [];
  for (let i = 0; i < cycles - 1; i++) {
    sections.push({ id: `work-${i}`,       name: `Arbeit ${i + 1}`,     duration: workSec,       gongType: 'medium' });
    sections.push({ id: `shortbreak-${i}`, name: `Pause ${i + 1}`,      duration: shortBreakSec, gongType: 'soft'   });
  }
  sections.push({ id: `work-${cycles - 1}`,  name: `Arbeit ${cycles}`, duration: workSec,       gongType: 'medium' });
  sections.push({ id: 'longbreak',           name: 'Lange Pause',      duration: longBreakSec,  gongType: 'deep'   });
  return sections;
};

/**
 * Free-form schedule from a list of time offsets (seconds from start).
 * Useful when the user configures exact timestamps rather than durations.
 *
 * @param {Array<{ name: string, offsetSec: number, gongType?: string }>} gongPoints
 */
const fromAbsoluteOffsets = (gongPoints) => {
  const sorted = [...gongPoints].sort((a, b) => a.offsetSec - b.offsetSec);
  return sorted.map((p, i) => ({
    id:       `point-${i}`,
    name:     p.name,
    duration: i === 0 ? p.offsetSec : p.offsetSec - sorted[i - 1].offsetSec,
    gongType: p.gongType ?? 'medium',
    repeat:   1,
  }));
};

/** Namespace collecting all schedule builder functions. */
export const buildSchedule = {
  custom,
  meditationWithIntervals,
  countdown,
  pomodoro,
  fromAbsoluteOffsets,
};
