// session.js — the timing math for one focus session.
//
// Big idea: a session is a list of "clean segments" — stretches where you stayed
// focused. An interruption (leaving the app, picking the phone up, tapping End early)
// closes the current segment. Clean time = the sum of all segments.

export class Session {
  constructor(mode, targetMinutes) {
    this.id = Date.now().toString(36);
    this.mode = mode;                       // 'trained' | 'pure'
    this.targetMs = targetMinutes ? targetMinutes * 60000 : null; // null = untimed
    this.start = Date.now();
    this.cleanMs = 0;        // finished segments added together
    this.longestMs = 0;      // longest unbroken segment (your personal best)
    this.segStart = null;    // when the current segment began (null = paused)
    this.interruptions = []; // { t, kind: 'left' | 'pickup' | 'end', reason }
  }

  get isRunning() { return this.segStart !== null; }

  // Start (or restart) counting clean time.
  resume(now = Date.now()) {
    if (this.segStart === null) this.segStart = now;
  }

  // Stop counting. If `kind` is given, log it as an interruption.
  pause(kind, now = Date.now()) {
    if (this.segStart !== null) {
      const seg = now - this.segStart;
      this.cleanMs += seg;
      this.longestMs = Math.max(this.longestMs, seg);
      this.segStart = null;
    }
    if (kind) this.interruptions.push({ t: now, kind, reason: null });
  }

  // Tag the most recent interruption with why it happened (from the urge log).
  setReason(reason) {
    const last = this.interruptions.at(-1);
    if (last) last.reason = reason;
  }

  clean(now = Date.now()) {
    return this.cleanMs + (this.segStart !== null ? now - this.segStart : 0);
  }

  remaining(now = Date.now()) {
    return this.targetMs === null ? null : Math.max(0, this.targetMs - this.clean(now));
  }

  // A plain object we can save to storage. Doesn't change the session.
  toRecord(completed, now = Date.now()) {
    const current = this.segStart !== null ? now - this.segStart : 0;
    return {
      id: this.id,
      start: this.start,
      end: now,
      mode: this.mode,
      targetMin: this.targetMs ? this.targetMs / 60000 : null,
      cleanMs: this.cleanMs + current,
      longestMs: Math.max(this.longestMs, current),
      completed,
      interruptions: this.interruptions.map(i => ({ ...i })),
    };
  }
}
