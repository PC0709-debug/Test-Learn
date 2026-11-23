// answer.js — checking typed answers fairly.
//
// Big picture: typed recall is the hardest (and best) practice, but it must
// not punish typos or "the". Both the answer and your guess are normalised
// (lowercase, accents and punctuation removed), then compared with a small
// typo allowance. Numbers must match exactly: 1913 is not 1912.

const Answer = (() => {
  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // ō -> o, é -> e
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9%$.\s-]/g, ' ')
      .replace(/(^|\s)(the|a|an)(?=\s)/g, ' ')
      .replace(/[-\s]+/g, ' ')
      .replace(/\.(?!\d)/g, '')
      .trim();
  }

  // Edit distance: how many single-letter changes turn one word into another.
  function distance(a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[a.length][b.length];
  }

  const digits = s => (s.match(/\d+(\.\d+)?/g) || []).join(',');

  function matches(guess, card) {
    const g = norm(guess);
    if (!g) return false;
    const targets = [card.a, ...(card.accept || []), card.romaji].filter(Boolean).map(norm);
    for (const t of targets) {
      if (g === t) return true;
      // Any digits must match exactly.
      if (digits(t) && digits(g) !== digits(t)) continue;
      // Allow ~1 typo per 6 letters, none for very short answers.
      const allowed = t.length <= 3 ? 0 : Math.max(1, Math.floor(t.length / 6));
      if (distance(g, t) <= allowed) return true;
    }
    return false;
  }

  return { matches, norm };
})();
