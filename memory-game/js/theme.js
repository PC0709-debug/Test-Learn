// theme.js — the world of The Ticker: rooms, monsters, perks, ranks and
// the mentor's lines.
//
// Big picture: this file is pure data. Keeping the "content of the world"
// apart from the game rules (app.js) means you can rename a monster or add
// a perk without touching any logic.

const WORLD = {
  // The memory palace: a 1920s exchange building, one room per deck.
  // Each room has fixed spots ("loci"). Every card is pinned to one spot,
  // so recalling the room and spot helps recall the card. That is the
  // method of loci.
  rooms: {
    vault: {
      name: 'The Vault', floor: 'Sub-basement',
      blurb: 'Accounting, valuation, LBOs, M&A and fund mechanics.',
      loci: ['the brass time-lock dial', 'the wall of safe-deposit boxes', 'the gold-bar trolley', 'the iron ledger stand',
             'the coupon-clipping desk', 'the great round door', 'the counting table', "the night guard's stool"],
    },
    sectors: {
      name: 'The Boardroom', floor: '12th floor',
      blurb: 'Software, data, payments and healthcare business models.',
      loci: ['the long walnut table', 'the chairman’s high-backed chair', 'the cigar humidor', 'the oil portrait of the founder',
             'the brass speaking tube', 'the leather blotter', 'the globe bar', 'the tall arched window'],
    },
    floor: {
      name: 'The Trading Floor', floor: 'Ground floor',
      blurb: 'The Fed, rates, macro data and market history.',
      loci: ['the clattering ticker machine', 'the giant chalk quote board', 'the opening bell', 'Post No. 4 trading booth',
             'the pneumatic tube station', 'the visitors’ gallery rail', 'the telephone bank', 'the paper-strewn floor'],
    },
    library: {
      name: "The Partners' Library", floor: '9th floor',
      blurb: 'History, inventions, financial history and philosophy.',
      loci: ['the marble bust of a philosopher', 'the rolling ladder', 'the fireplace mantel', 'the reading lamp with green shade',
             'the map table', 'the grandfather clock', 'the locked rare-books case', 'the leather wingback chair'],
    },
    observatory: {
      name: 'The Rooftop Observatory', floor: 'Roof',
      blurb: 'Space, physics, biology, health and modern technology.',
      loci: ['the brass telescope', 'the star chart on the dome', 'the weather vane', 'the orrery of the planets',
             'the specimen cabinet', 'the radio mast', 'the chalkboard of equations', 'the parapet facing the harbor'],
    },
    fareast: {
      name: 'The Far East Desk', floor: '7th floor',
      blurb: 'Japanese words, history and culture.',
      loci: ['the lacquered writing box', 'the folding screen of cranes', 'the tea kettle', 'the paper lantern',
             'the bonsai on the sill', 'the scroll of calligraphy', 'the steamship timetable', 'the abacus'],
    },
    telegraph: {
      name: 'The Telegraph Room', floor: '3rd floor',
      blurb: 'Coding terms you learn while building this game.',
      loci: ['the Morse key', 'the cable rack', 'the codebook shelf', 'the switchboard',
             'the stack of punched tape', 'the operator’s green visor', 'the message pigeonholes', 'the humming dynamo'],
    },
  },

  // Monsters are the great panics and their agents. `tier` sets which floor
  // they appear on; `art` picks a drawing in art.js.
  monsters: [
    { id: 'gremlin',  name: 'The Ticker Gremlin',    tier: 1, art: 'gremlin', line: 'It chews the tape and garbles every quote.' },
    { id: 'bucket',   name: 'The Bucket-Shop Swindler', tier: 1, art: 'swindler', line: 'He takes your bets and never places the trade.' },
    { id: 'margin',   name: 'The Margin Call',       tier: 1, art: 'phone', line: 'The telephone rings. It is never good news.' },
    { id: 'short',    name: 'The Short Seller',      tier: 2, art: 'swindler', line: 'He has borrowed your shares and wants them to fall.' },
    { id: 'bubble',   name: 'The Bubble',            tier: 2, art: 'bubble', line: 'Bigger and shinier every minute. Until it isn’t.' },
    { id: 'run',      name: 'The Run on the Bank',   tier: 2, art: 'crowd', line: 'A line of depositors stretches round the block.' },
    { id: 'bear',     name: 'The Great Bear',        tier: 3, art: 'bear', line: 'It swipes downward. Always downward.' },
    { id: 'p1907',    name: 'The Panic of 1907',     tier: 3, art: 'crowd', line: 'Trust companies totter. Someone must stem the tide.' },
  ],
  boss: { id: 'black-tuesday', name: 'Black Tuesday', tier: 4, art: 'boss', line: 'October 29, 1929. The tape runs hours behind and the floor is in chaos.' },

  // Perks: pick one after each room. `unlock` = gold needed to add it to the
  // pool permanently (0 = available from the start).
  perks: {
    hint:     { name: 'Insider Tip',       icon: '✉', unlock: 0,   desc: '2 charges. Strike two wrong options, or reveal the first letter.' },
    hedge:    { name: 'Hedge',             icon: '⚖', unlock: 0,   desc: 'The next wrong answer costs no capital.' },
    dividend: { name: 'Dividend',          icon: '$',      unlock: 0,   desc: 'Restore 30 capital now.' },
    bluechip: { name: 'Blue Chip',         icon: '◆', unlock: 30,  desc: '+25 max capital, and heal 25.' },
    tape:     { name: 'Ticker Tape',       icon: '≡', unlock: 60,  desc: 'Memory hooks show before you answer.' },
    leverage: { name: 'Leverage',          icon: '×', unlock: 50,  desc: 'Hit 50% harder. Wrong answers cost 50% more.' },
    compound: { name: 'Compound Interest', icon: '%',      unlock: 80,  desc: 'Streak bonus grows twice as fast.' },
    audit:    { name: 'Second Look',       icon: '↺', unlock: 100, desc: 'Once per room, retry a wrong answer.' },
  },

  // Ranks by lifetime gold earned.
  ranks: [
    { gold: 0,    title: 'Runner' },
    { gold: 50,   title: 'Clerk' },
    { gold: 150,  title: 'Broker' },
    { gold: 400,  title: 'Specialist' },
    { gold: 900,  title: 'Partner' },
    { gold: 2000, title: 'Seat Holder' },
    { gold: 4000, title: 'Tycoon' },
  ],

  // Augustus, the owl who keeps the Exchange. Original lines, no quotes
  // attributed to real people.
  mentor: {
    name: 'Augustus',
    greet: [
      'Good morning. The tape waits for no one, but it rewards those who return.',
      'Memory is a ledger. Make an entry today and it compounds.',
      'Calm hands, clear head. The market panics so that you need not.',
      'What you recall under pressure is what you truly own.',
      'Small deposits, made daily, build the largest vaults.',
    ],
    right: ['Correct. Noted in the ledger.', 'Well struck.', 'Steady work.', 'The tape agrees with you.', 'Precisely.'],
    wrong: ['A loss, not a ruin. Study the entry and move on.', 'The market forgives the prepared. Review it.', 'Mark it down. It will come back to you soon.'],
    win: ['The panic subsides. Well held.', 'Order restored on the floor.', 'You kept your head while others lost theirs.'],
    lose: ['Capital exhausted. Every great house has failed once. Open again tomorrow.', 'The firm is closed for today. The lessons remain on the books.'],
  },
};
