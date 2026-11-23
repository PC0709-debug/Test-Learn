// srs.js — the spaced-repetition engine (the "brain" of The Ticker).
//
// Big picture: every card lives in a numbered "box" (the Leitner system).
// A right answer moves the card up one box, and higher boxes wait longer
// before the card comes back. A wrong answer drops it to box 1, so it
// returns tomorrow. This re-tests you just before you would forget.
//
// Nothing here touches the screen. It only does date maths on card records,
// which keeps it easy to read and test on its own.

const SRS = (() => {
  // Days to wait before a card in each box is due again.
  // Box 0 = never seen. Box 7 = "retired": you know it cold.
  const INTERVALS = [0, 1, 3, 7, 14, 30, 60, 120];
  const DAY = 24 * 60 * 60 * 1000;

  // Today as a whole number of days. Comparing whole days avoids timezone
  // surprises like "due at 11:59pm".
  function today(now = Date.now()) {
    const d = new Date(now);
    return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DAY);
  }

  // A fresh record for a card you have never seen.
  function blank() {
    return { box: 0, due: 0, seen: 0, right: 0, wrong: 0, last: 0 };
  }

  // Record an answer and return the updated record (a new object; the input is
  // not changed, which makes bugs easier to spot).
  function grade(rec, correct, now = Date.now()) {
    const r = { ...(rec || blank()) };
    const t = today(now);
    r.seen += 1;
    r.last = t;
    if (correct) {
      r.right += 1;
      r.box = Math.min(r.box + 1, INTERVALS.length - 1);
    } else {
      r.wrong += 1;
      r.box = 1; // back to the start of the ladder
    }
    r.due = t + INTERVALS[r.box];
    return r;
  }

  const isNew = rec => !rec || rec.box === 0;
  const isDue = (rec, now) => !isNew(rec) && rec.due <= today(now);

  // How the question is asked. New and shaky cards are multiple choice,
  // and known cards make you type the answer, which is harder and better
  // practice.
  function mode(rec) {
    if (!rec || rec.box < 3) return 'choice';
    return 'typed';
  }

  // Pick cards for a fight: overdue first (most overdue first), then new ones.
  // `pool` is a list of card objects; `progress` maps card id -> record.
  function pick(pool, progress, count, now = Date.now(), exclude = new Set()) {
    const t = today(now);
    const due = [], fresh = [], rest = [];
    for (const c of pool) {
      if (exclude.has(c.id)) continue;
      const r = progress[c.id];
      if (isDue(r, now)) due.push(c);
      else if (isNew(r)) fresh.push(c);
      else rest.push(c);
    }
    due.sort((a, b) => progress[a.id].due - progress[b.id].due);
    shuffle(fresh);
    // Not-yet-due cards are the last resort, weakest box first.
    rest.sort((a, b) => progress[a.id].box - progress[b.id].box || progress[a.id].due - progress[b.id].due);
    return [...due, ...fresh, ...rest].slice(0, count).map(c => c);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function stats(pool, progress, now = Date.now()) {
    let due = 0, fresh = 0, learning = 0, known = 0;
    for (const c of pool) {
      const r = progress[c.id];
      if (isNew(r)) fresh++;
      else {
        if (isDue(r, now)) due++;
        if (r.box >= 4) known++; else learning++;
      }
    }
    return { due, fresh, learning, known, total: pool.length };
  }

  return { INTERVALS, today, blank, grade, isNew, isDue, mode, pick, shuffle, stats };
})();
