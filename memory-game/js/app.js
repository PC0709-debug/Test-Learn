// app.js — the game itself: screens, the roguelike run, and Daily 5.
//
// Big picture: the app is one HTML page. Each "screen" (home, fight, palace…)
// is a function that builds HTML and puts it in <main id="app">. Buttons
// carry a data-action="…" attribute; one click listener at the bottom routes
// every tap to the right handler. This is called event delegation.
//
// Data flow:  cards-data.js (the facts) ─┐
//             store.js (your save) ──────┼─> app.js (rules + screens) ─> screen
//             srs.js (when to re-test) ──┘

(() => {
  const $app = document.getElementById('app');
  const save = Store.load();
  FX.configure(save.settings);

  // ---------- helpers ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];
  const today = () => SRS.today();

  function hash(str) { let h = 0; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
  function locusOf(card) { const room = WORLD.rooms[card.deck]; return room ? room.loci[hash(card.id) % room.loci.length] : ''; }

  const ALL = (window.TICKER_CARDS || []);
  function activeDecks() { return save.settings.decks || Object.keys(WORLD.rooms); }
  function pool(deck) {
    const decks = deck ? [deck] : activeDecks();
    return ALL.filter(c => decks.includes(c.deck) && !save.reported[c.id]);
  }
  function rank() { let r = WORLD.ranks[0]; for (const x of WORLD.ranks) if (save.meta.lifetime >= x.gold) r = x; return r; }
  function nextRank() { return WORLD.ranks.find(x => x.gold > save.meta.lifetime); }

  function applyTheme() {
    const t = save.settings.theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  function earn(g) { save.meta.gold += g; save.meta.lifetime += g; }

  function show(html) {
    $app.innerHTML = html;
    window.scrollTo(0, 0);
    document.getElementById('typed-input')?.focus();
  }

  // The scrolling ticker tape across the top of every screen.
  function tape() {
    const s = SRS.stats(pool(), save.progress);
    const items = [
      `STREAK ${save.streak.count}D`, `DUE ${s.due}`, `NEW ${s.fresh}`, `KNOWN ${s.known}`,
      `GOLD $${save.meta.gold}`, `RANK ${rank().title.toUpperCase()}`,
      ...Object.entries(WORLD.rooms).map(([k, r]) => { const st = SRS.stats(pool(k), save.progress); return `${r.name.replace('The ', '').toUpperCase()} ${st.known}/${st.total}`; }),
    ];
    const line = items.map(i => `<span>${esc(i)}</span>`).join('<span class="dot">◆</span>');
    document.getElementById('tape').innerHTML = `<div class="tape-track">${line}<span class="dot">◆</span>${line}</div>`;
  }

  // ---------- HOME ----------
  function home() {
    tape();
    const s = SRS.stats(pool(), save.progress);
    const dailyDone = save.daily.day === today() && save.daily.done >= 5;
    const nr = nextRank();
    show(`
      <section class="masthead">
        ${ART.sunburst}
        <h1>The Ticker</h1>
        <p class="edition">Memory Exchange · Est. 1929 Edition</p>
      </section>

      <section class="mentor card-frame">
        ${ART.owl}
        <div>
          <p class="mentor-name">${WORLD.mentor.name} says</p>
          <p class="mentor-line">“${esc(pickOne(WORLD.mentor.greet))}”</p>
        </div>
      </section>

      <section class="stats">
        <div><b>${save.streak.count}</b><span>day streak</span></div>
        <div><b>${s.due}</b><span>due today</span></div>
        <div><b>${s.known}</b><span>known of ${s.total}</span></div>
        <div><b>$${save.meta.gold}</b><span>${esc(rank().title)}${nr ? ` · next at $${nr.gold}` : ''}</span></div>
      </section>

      ${ALL.length ? '' : '<p class="notice">No cards loaded yet. The verified deck ships with the next update.</p>'}

      <nav class="menu">
        <button class="btn primary" data-action="daily">${dailyDone ? '✓ Daily 5 done · play again' : '☀ Daily 5'}<small>${dailyDone ? 'Streak kept for today' : 'Five due cards keep your streak'}</small></button>
        <button class="btn primary" data-action="run">⚖ Open the Market<small>Run the Exchange: five rooms, then Black Tuesday</small></button>
        <button class="btn" data-action="palace">⌂ Walk the Palace<small>Your rooms and what you have pinned in them</small></button>
        <button class="btn" data-action="seat">★ The Seat<small>Spend gold to unlock perks</small></button>
        <button class="btn" data-action="settings">⚙ Settings</button>
      </nav>`);
  }

  // ---------- QUESTION CARD (shared by Daily 5 and fights) ----------
  // Renders one card and calls onDone(correct) after the player continues.
  let Q = null; // the question currently on screen

  function choicesFor(card) {
    const opts = SRS.shuffle([card.a, ...(card.wrong || []).slice(0, 3)]);
    return opts;
  }

  function cardHTML(card, opts) {
    const room = WORLD.rooms[card.deck];
    const mode = opts.forceTyped ? 'typed' : SRS.mode(save.progress[card.id]);
    Q = { card, mode, opts, choices: mode === 'choice' ? choicesFor(card) : null, struck: [], hinted: false, retried: false };
    const showHook = opts.showHook && card.hook;
    return `
      <article class="qcard card-frame" id="qcard">
        <header class="qmeta">
          <span class="locus">⌖ ${esc(room ? room.name : card.deck)} · ${esc(locusOf(card))}</span>
          <button class="flag" data-action="report" title="Report this card">⚑</button>
        </header>
        <p class="topic">${esc(card.topic || '')}</p>
        <h2 class="q">${esc(card.q)}</h2>
        ${showHook ? `<p class="hook">≡ ${esc(card.hook)}</p>` : ''}
        <div id="answer-zone">${answerZone()}</div>
        ${opts.tools || ''}
      </article>`;
  }

  function answerZone() {
    if (Q.mode === 'choice') {
      return `<div class="choices">${Q.choices.map((c, i) =>
        `<button class="choice${Q.struck.includes(c) ? ' struck' : ''}" data-action="choose" data-i="${i}" ${Q.struck.includes(c) ? 'disabled' : ''}>${esc(c)}</button>`).join('')}</div>`;
    }
    return `<form class="typed" data-action="typed">
        <input id="typed-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer" enterkeyhint="go">
        <button class="btn primary" type="submit">Answer</button>
        <button class="btn ghost" type="button" data-action="giveup">I don't know</button>
      </form>
      ${Q.hinted ? `<p class="hint-line">Starts with “${esc(Q.card.a[0])}” · ${Q.card.a.length} characters</p>` : ''}`;
  }

  function revealHTML(card, correct, guess) {
    const vocab = card.say || card.kana;
    const answer = vocab
      ? `<div class="vocab"><p class="say">${esc(card.say || '')}</p><p class="kana">${esc(card.kana || '')}${card.kanji && card.kanji !== card.kana ? ` <span class="kanji">(${esc(card.kanji)})</span>` : ''}</p><p class="romaji">${esc(card.romaji || card.a)}</p></div>`
      : `<p class="answer">${esc(card.a)}</p>`;
    const srcs = (card.sources || []).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title || s.url)}</a>`).join(' · ');
    return `
      <div class="reveal ${correct ? 'good' : 'bad'}">
        <p class="verdict">${correct ? '✓ ' + esc(pickOne(WORLD.mentor.right)) : '✗ ' + esc(pickOne(WORLD.mentor.wrong))}</p>
        ${!correct && guess ? `<p class="your">You said: ${esc(guess)}</p>` : ''}
        ${answer}
        ${card.explain ? `<p class="explain">${esc(card.explain)}</p>` : ''}
        ${card.hook ? `<p class="hook">≡ Pin it: ${esc(card.hook)} — at ${esc(locusOf(card))}.</p>` : ''}
        ${srcs ? `<p class="sources">Sources: ${srcs}</p>` : ''}
        <button class="btn primary" data-action="next">Continue →</button>
      </div>`;
  }

  function resolve(correct, guess) {
    const card = Q.card;
    // "Second Look" perk: one retry per room on a wrong answer.
    if (!correct && Q.opts.canRetry && Q.opts.canRetry() && !Q.retried) {
      Q.retried = true; Q.opts.useRetry();
      FX.play('wrong'); FX.buzz(30);
      const z = document.getElementById('answer-zone');
      z.insertAdjacentHTML('afterbegin', '<p class="hint-line">↺ Second Look: not quite. Try once more.</p>');
      return;
    }
    save.progress[card.id] = SRS.grade(save.progress[card.id], correct);
    Store.save();
    FX.play(correct ? 'right' : 'wrong');
    FX.buzz(correct ? 12 : [30, 60, 30]);
    document.getElementById('answer-zone').innerHTML = revealHTML(card, correct, guess);
    const tools = document.querySelector('.tools'); if (tools) tools.remove();
    Q.result = correct;
    if (Q.opts.onAnswer) Q.opts.onAnswer(correct);
  }

  // ---------- DAILY 5 ----------
  let daily = null;
  function startDaily() {
    const cards = SRS.pick(pool(), save.progress, 5);
    if (!cards.length) return home();
    daily = { cards, i: 0, right: 0 };
    FX.play('bell');
    dailyCard();
  }
  function dailyCard() {
    const card = daily.cards[daily.i];
    tape();
    show(`
      <header class="bar"><button class="btn ghost" data-action="home">←</button><span>Daily 5 · ${daily.i + 1} of ${daily.cards.length}</span><span>${'◆'.repeat(daily.right)}${'◇'.repeat(daily.i - daily.right)}</span></header>
      ${cardHTML(card, { showHook: false, onAnswer: ok => { if (ok) daily.right++; }, onNext: dailyNext })}`);
  }
  function dailyNext() {
    daily.i++;
    if (daily.i < daily.cards.length) return dailyCard();
    // Streak bookkeeping: count the day once.
    const t = today();
    if (save.daily.day !== t) save.daily = { day: t, done: 0 };
    save.daily.done += daily.cards.length;
    if (save.streak.lastDay !== t) {
      save.streak.count = save.streak.lastDay === t - 1 ? save.streak.count + 1 : 1;
      save.streak.lastDay = t;
      save.streak.best = Math.max(save.streak.best, save.streak.count);
    }
    earn(daily.right);
    Store.save();
    FX.play('victory');
    show(`
      <section class="result card-frame">
        ${ART.owl}
        <h2>Daily 5 complete</h2>
        <p class="big">${daily.right} / ${daily.cards.length}</p>
        <p>Streak: <b>${save.streak.count} day${save.streak.count === 1 ? '' : 's'}</b> (best ${save.streak.best}) · +$${daily.right} gold</p>
        <div class="menu">
          <button class="btn primary" data-action="run">⚖ Open the Market</button>
          <button class="btn" data-action="home">Back to the lobby</button>
        </div>
      </section>`);
  }

  // ---------- THE RUN (roguelike) ----------
  const FLOORS = 6; // 5 rooms + Black Tuesday
  let run = null;

  function startRun() {
    if (!pool().length) return home();
    run = { floor: 1, cap: 100, maxCap: 100, charges: { hint: 0, hedge: 0 }, flags: {}, gold: 0, used: new Set(), right: 0, wrong: 0 };
    save.meta.runs++; Store.save();
    FX.play('bell');
    doors();
  }

  function decksWithCards() { return activeDecks().filter(d => pool(d).length); }

  function doors() {
    tape();
    if (run.floor === FLOORS) return fight(null, WORLD.boss);
    const decks = SRS.shuffle(decksWithCards()).slice(0, 2);
    const tier = run.floor <= 2 ? 1 : run.floor <= 4 ? 2 : 3;
    const opts = decks.map(d => ({ deck: d, monster: pickOne(WORLD.monsters.filter(m => m.tier === tier)) }));
    run.doors = opts;
    show(`
      ${runBar()}
      <section class="doors">
        <h2 class="deco-h">Floor ${run.floor} of ${FLOORS}</h2>
        <p class="sub">Choose a door. Each room holds a panic.</p>
        ${opts.map((o, i) => {
          const r = WORLD.rooms[o.deck]; const st = SRS.stats(pool(o.deck), save.progress);
          return `<button class="door card-frame" data-action="door" data-i="${i}">
            <span class="door-floor">${esc(r.floor)}</span>
            <span class="door-name">${esc(r.name)}</span>
            <span class="door-blurb">${esc(r.blurb)}</span>
            <span class="door-meta">${st.due} due · ${st.fresh} new · inside: ${esc(o.monster.name)}</span>
          </button>`; }).join('')}
      </section>`);
  }

  function runBar() {
    const pct = Math.max(0, Math.round(100 * run.cap / run.maxCap));
    const perks = Object.keys(run.flags).filter(k => run.flags[k]).map(k => WORLD.perks[k].icon).join(' ');
    return `<header class="bar run-bar">
      <button class="btn ghost" data-action="quit" title="Leave run">✕</button>
      <div class="meter"><span>Capital $${run.cap}k</span><i style="width:${pct}%"></i></div>
      <span class="charges">${run.charges.hint ? `✉${run.charges.hint}` : ''} ${run.charges.hedge ? `⚖${run.charges.hedge}` : ''} ${perks}</span>
    </header>`;
  }

  function fight(deck, monster) {
    const boss = monster.id === WORLD.boss.id;
    const hp = boss ? 120 : 30 + (run.floor - 1) * 12;
    run.room = { deck, monster, hp, maxHp: hp, combo: 0, retryUsed: false };
    if (boss) FX.play('ticker');
    nextQuestion();
  }

  function nextQuestion() {
    const room = run.room;
    let card = SRS.pick(room.deck ? pool(room.deck) : pool(), save.progress, 1, Date.now(), run.used)[0];
    if (!card) { run.used.clear(); card = SRS.pick(room.deck ? pool(room.deck) : pool(), save.progress, 1)[0]; }
    run.used.add(card.id);
    const m = room.monster; const pct = Math.max(0, Math.round(100 * room.hp / room.maxHp));
    const tools = `<div class="tools">
        ${run.charges.hint ? `<button class="btn ghost" data-action="hint">✉ Insider Tip (${run.charges.hint})</button>` : ''}
        ${run.charges.hedge ? `<span class="pill">⚖ Hedged</span>` : ''}
      </div>`;
    tape();
    show(`
      ${runBar()}
      <section class="monster card-frame ${m.id === WORLD.boss.id ? 'boss' : ''}">
        <div class="monster-art" id="monster-art">${ART.monsters[m.art]}</div>
        <div class="monster-info">
          <h3>${esc(m.name)}</h3>
          <p class="monster-line">${esc(m.line)}</p>
          <div class="meter enemy"><span>Panic ${room.hp}/${room.maxHp}</span><i style="width:${pct}%"></i></div>
          ${room.combo > 1 ? `<p class="combo">Streak ×${room.combo}</p>` : ''}
        </div>
      </section>
      ${cardHTML(card, {
        forceTyped: m.id === WORLD.boss.id && (save.progress[card.id]?.box || 0) >= 2,
        showHook: !!run.flags.tape,
        tools,
        canRetry: () => run.flags.audit && !room.retryUsed,
        useRetry: () => { room.retryUsed = true; },
        onAnswer: ok => combat(ok, card),
        onNext: afterAnswer,
      })}`);
  }

  function combat(ok, card) {
    const room = run.room;
    if (ok) {
      room.combo++; run.right++;
      const comboStep = run.flags.compound ? 0.4 : 0.2;
      const mult = Math.min(2.5, 1 + comboStep * (room.combo - 1));
      const diff = [1, 1, 1.2, 1.5][card.difficulty || 1];
      const dmg = Math.round(12 * mult * diff * (run.flags.leverage ? 1.5 : 1));
      room.hp = Math.max(0, room.hp - dmg);
      run.gold += 1;
      FX.play('hit');
      flash(`-${dmg}`, 'hit');
    } else {
      room.combo = 0; run.wrong++;
      if (run.charges.hedge) { run.charges.hedge--; flash('Hedged', 'hedge'); }
      else {
        const boss = room.monster.id === WORLD.boss.id;
        const loss = Math.round((boss ? 20 : 10 + 3 * run.floor) * (run.flags.leverage ? 1.5 : 1));
        run.cap = Math.max(0, run.cap - loss);
        FX.play('hurt');
        flash(`-$${loss}k`, 'hurt');
      }
    }
  }

  function flash(text, kind) {
    const art = document.getElementById('monster-art');
    if (!art) return;
    art.insertAdjacentHTML('beforeend', `<span class="pop ${kind}">${esc(text)}</span>`);
    art.classList.remove('shake'); void art.offsetWidth; art.classList.add('shake');
  }

  function afterAnswer() {
    const room = run.room;
    if (run.cap <= 0) return endRun(false);
    if (room.hp <= 0) {
      if (room.monster.id === WORLD.boss.id) return endRun(true);
      run.gold += 5 + run.floor;
      FX.play('victory');
      return perkChoice();
    }
    nextQuestion();
  }

  function perkChoice() {
    const pool = save.meta.unlocked.filter(k => !(['tape', 'leverage', 'compound', 'audit'].includes(k) && run.flags[k]));
    const offer = SRS.shuffle([...pool]).slice(0, 3);
    run.offer = offer;
    show(`
      ${runBar()}
      <section class="result card-frame">
        <h2>${esc(pickOne(WORLD.mentor.win))}</h2>
        <p class="sub">${esc(run.room.monster.name)} is beaten. Choose one advantage.</p>
        <div class="perks">${offer.map((k, i) => { const p = WORLD.perks[k]; return `
          <button class="perk card-frame" data-action="perk" data-i="${i}"><span class="perk-icon">${p.icon}</span><b>${esc(p.name)}</b><small>${esc(p.desc)}</small></button>`; }).join('')}
        </div>
      </section>`);
  }

  function takePerk(k) {
    if (k === 'hint') run.charges.hint += 2;
    else if (k === 'hedge') run.charges.hedge += 1;
    else if (k === 'dividend') run.cap = Math.min(run.maxCap, run.cap + 30);
    else if (k === 'bluechip') { run.maxCap += 25; run.cap = Math.min(run.maxCap, run.cap + 25); }
    else run.flags[k] = true;
    FX.play('right');
    run.floor++;
    doors();
  }

  function endRun(won) {
    if (won) run.gold += 25;
    earn(run.gold);
    save.meta.bestFloor = Math.max(save.meta.bestFloor, run.floor);
    if (won) save.meta.wins++;
    Store.save();
    FX.play(won ? 'victory' : 'defeat');
    tape();
    show(`
      <section class="result card-frame">
        ${won ? ART.owl : ART.monsters.boss}
        <h2>${won ? 'The Market Holds' : 'Closed for the Day'}</h2>
        <p class="mentor-line">“${esc(won ? 'You faced Black Tuesday and kept your head. The Exchange stands.' : pickOne(WORLD.mentor.lose))}”</p>
        <p class="big">+$${run.gold} gold</p>
        <p>Floor ${run.floor} of ${FLOORS} · ${run.right} right · ${run.wrong} wrong</p>
        <div class="menu">
          <button class="btn primary" data-action="run">Run it again</button>
          <button class="btn" data-action="home">Back to the lobby</button>
        </div>
      </section>`);
    run = null;
  }

  // ---------- THE PALACE ----------
  function palace(deck) {
    tape();
    if (!deck) {
      return show(`
        <header class="bar"><button class="btn ghost" data-action="home">←</button><span>The Memory Palace</span><span></span></header>
        <p class="sub center">Each room of the Exchange holds one subject. Every card is pinned to a spot in its room.
        Picture the spot when you recall the card. This is the method of loci.</p>
        <div class="rooms">${Object.entries(WORLD.rooms).map(([k, r]) => { const st = SRS.stats(pool(k), save.progress); return `
          <button class="door card-frame" data-action="room" data-deck="${k}">
            <span class="door-floor">${esc(r.floor)}</span><span class="door-name">${esc(r.name)}</span>
            <span class="door-blurb">${esc(r.blurb)}</span>
            <span class="door-meta">${st.known} known · ${st.learning} learning · ${st.fresh} unseen</span>
          </button>`; }).join('')}</div>`);
    }
    const r = WORLD.rooms[deck];
    const cards = pool(deck);
    const byLocus = Object.fromEntries(r.loci.map(l => [l, []]));
    for (const c of cards) byLocus[locusOf(c)].push(c);
    show(`
      <header class="bar"><button class="btn ghost" data-action="palace">←</button><span>${esc(r.name)}</span><span></span></header>
      <p class="sub center">Walk the room clockwise. Seen cards show their answer; unseen ones stay sealed.</p>
      ${r.loci.map(l => { const list = byLocus[l]; const seen = list.filter(c => !SRS.isNew(save.progress[c.id])); return `
        <details class="locus-block card-frame">
          <summary><b>${esc(l)}</b><span>${seen.length}/${list.length}</span></summary>
          ${list.map(c => SRS.isNew(save.progress[c.id])
            ? `<p class="sealed">■ Sealed card · ${esc(c.topic || '')}</p>`
            : `<p class="pinned"><span>${esc(c.q)}</span><b>${esc(c.say ? `${c.say} (${c.kana})` : c.a)}</b></p>`).join('')}
        </details>`; }).join('')}`);
  }

  // ---------- THE SEAT (unlocks) ----------
  function seat() {
    tape();
    show(`
      <header class="bar"><button class="btn ghost" data-action="home">←</button><span>The Seat · $${save.meta.gold} gold</span><span></span></header>
      <p class="sub center">Rank: <b>${esc(rank().title)}</b>. Unlocked perks can be offered after each room you clear.</p>
      <div class="perks">${Object.entries(WORLD.perks).map(([k, p]) => { const have = save.meta.unlocked.includes(k); return `
        <button class="perk card-frame ${have ? 'owned' : ''}" data-action="unlock" data-key="${k}" ${have || save.meta.gold < p.unlock ? 'disabled' : ''}>
          <span class="perk-icon">${p.icon}</span><b>${esc(p.name)}</b><small>${esc(p.desc)}</small>
          <em>${have ? 'Unlocked' : `$${p.unlock}`}</em></button>`; }).join('')}</div>`);
  }

  // ---------- SETTINGS ----------
  function settings() {
    tape();
    const st = save.settings; const decks = activeDecks();
    const reported = Object.keys(save.reported);
    show(`
      <header class="bar"><button class="btn ghost" data-action="home">←</button><span>Settings</span><span></span></header>
      <section class="card-frame settings">
        <h3>Appearance</h3>
        <div class="seg">${['auto', 'light', 'dark'].map(t => `<button class="${st.theme === t ? 'on' : ''}" data-action="theme" data-v="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
        <h3>Feedback</h3>
        <label class="row"><span>Sound</span><input type="checkbox" switch data-action="toggle" data-k="sound" ${st.sound ? 'checked' : ''}></label>
        <label class="row"><span>Haptics</span><input type="checkbox" switch data-action="toggle" data-k="haptics" ${st.haptics ? 'checked' : ''}></label>
        <h3>Rooms in play</h3>
        ${Object.entries(WORLD.rooms).map(([k, r]) => `<label class="row"><span>${esc(r.name)} <small>(${pool(k).length})</small></span><input type="checkbox" switch data-action="deck" data-k="${k}" ${decks.includes(k) ? 'checked' : ''}></label>`).join('')}
        <h3>Reported cards (${reported.length})</h3>
        <p class="sub">Cards you flag with ⚑ leave play at once. Copy the list and send it to Claude to re-check.</p>
        <button class="btn" data-action="copy-reported" ${reported.length ? '' : 'disabled'}>Copy reported list</button>
        <h3>Your save</h3>
        <button class="btn" data-action="export">Copy save to clipboard</button>
        <button class="btn" data-action="import">Paste a save</button>
        <button class="btn danger" data-action="reset">Erase all progress</button>
        <p class="sub">${ALL.length} cards in this edition. Each passed an independent source-traced check scored 90+/100.</p>
      </section>`);
  }

  // ---------- ROUTER: every tap lands here ----------
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || el.tagName === 'FORM') return;
    const a = el.dataset.action;
    if (!['toggle', 'deck'].includes(a)) FX.play('tap');
    switch (a) {
      case 'home': return home();
      case 'daily': return startDaily();
      case 'run': return startRun();
      case 'palace': return palace();
      case 'room': return palace(el.dataset.deck);
      case 'seat': return seat();
      case 'settings': return settings();
      case 'door': { const o = run.doors[+el.dataset.i]; return fight(o.deck, o.monster); }
      case 'perk': return takePerk(run.offer[+el.dataset.i]);
      case 'quit': if (confirm('Leave this run? Gold earned so far is kept.')) endRun(false); return;
      case 'choose': {
        const pick = Q.choices[+el.dataset.i];
        return resolve(pick === Q.card.a, pick);
      }
      case 'giveup': return resolve(false, '');
      case 'hint': {
        if (!run || !run.charges.hint) return;
        run.charges.hint--;
        if (Q.mode === 'choice') Q.struck = SRS.shuffle(Q.choices.filter(c => c !== Q.card.a)).slice(0, 2);
        else Q.hinted = true;
        document.getElementById('answer-zone').innerHTML = answerZone();
        el.textContent = `✉ Insider Tip (${run.charges.hint})`;
        if (!run.charges.hint) el.remove();
        return;
      }
      case 'next': return Q.opts.onNext();
      case 'report': {
        const note = prompt('What looks wrong with this card? (optional)', '');
        if (note === null) return;
        save.reported[Q.card.id] = { at: new Date().toISOString(), note, q: Q.card.q, a: Q.card.a };
        Store.save();
        el.textContent = '⚑ Reported'; el.disabled = true;
        return;
      }
      case 'unlock': {
        const k = el.dataset.key; const p = WORLD.perks[k];
        if (save.meta.gold >= p.unlock && !save.meta.unlocked.includes(k)) {
          save.meta.gold -= p.unlock; save.meta.unlocked.push(k); Store.save(); FX.play('victory');
        }
        return seat();
      }
      case 'theme': save.settings.theme = el.dataset.v; Store.save(); applyTheme(); return settings();
      case 'copy-reported': return copy(JSON.stringify(save.reported, null, 1));
      case 'export': return copy(Store.exportText());
      case 'import': {
        const text = prompt('Paste your save text:');
        if (!text) return;
        try { Store.importText(text); location.reload(); } catch (err) { alert('That does not look like a Ticker save.'); }
        return;
      }
      case 'reset': if (confirm('Erase all progress, gold and streak? This cannot be undone.')) { Store.reset(); location.reload(); } return;
    }
  });

  // Checkbox switches fire "change", not a plain click.
  document.addEventListener('change', e => {
    const el = e.target; const a = el.dataset?.action;
    if (a === 'toggle') { save.settings[el.dataset.k] = el.checked; FX.configure(save.settings); Store.save(); if (el.checked) FX.play('tap'); }
    if (a === 'deck') {
      const set = new Set(activeDecks());
      el.checked ? set.add(el.dataset.k) : set.delete(el.dataset.k);
      if (!set.size) { el.checked = true; return alert('Keep at least one room open.'); }
      save.settings.decks = [...set]; Store.save(); tape();
    }
  });

  // Typed answers are a <form>, so pressing Go on the keyboard submits it.
  document.addEventListener('submit', e => {
    if (e.target.dataset.action !== 'typed') return;
    e.preventDefault();
    const guess = document.getElementById('typed-input').value;
    if (!guess.trim()) return;
    resolve(Answer.matches(guess, Q.card), guess);
  });

  function copy(text) {
    navigator.clipboard?.writeText(text).then(() => alert('Copied.'), () => prompt('Copy this:', text));
  }

  // ---------- start ----------
  applyTheme();
  FX.setupHaptics();
  home();

  // Register the service worker so the whole game works offline (see sw.js).
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
