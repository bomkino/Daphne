# Daphne — product plan

pitch.dog · 31 Oct 2026 · draft 1 for the studio

A free, open-source laurel maker for filmmakers. It runs in the browser with no account, no watermark and no server. It makes laurels that look designed rather than downloaded, and it gives anyone who wants them every control there is.

The name is **Daphne** (§17.1). In the Greek myth, the nymph Daphne became the first laurel tree. Apollo, god of music, poetry and the arts, wore her leaves from then on and crowned artists and victors with them. Every laurel since comes from her. The site title carries the plain description for search: *Daphne — free festival laurels for filmmakers*.

**What exists today**

| Piece | Where | State |
|---|---|---|
| Procedural engine v2 | `Generator/prototype/engine.mjs` | Works in Node and the browser. Pure functions, no dependencies. |
| Playground | `Generator/prototype/index.html` | All the controls, 78 looks and 18 layouts in groups, badge mode, logo upload, foil, letterpress and grain, shuffle, share links. Four views: the laurel, on your poster (contrast, auto ink, 160 px, palette), the row builder (table, spreadsheet paste, prestige, tiered, ZIP) and motion (end-card MP4, PNG sequence, animated SVG). Exports outlined SVG, PDF and PNG. Festival rules show as notes. Runs locally: `python3 Laurels/Generator/serve.py 5178` (a server that never caches, so edits always reach the browser). |
| Stress test | `Generator/prototype/stress.html?px=160` | 1,702 cases (every preset, layout, form, frame and logo shape, plus 580 random laurels and badges), checked automatically on the real SVG. `qa.html` shows any of them large for visual review; `perf.html` times the heaviest looks. |
| Research | `Generator/research/01 — Laurel anatomy and market.md` | 68 laurels from 23 festivals, festival rules, rival tools, fonts, export needs. |
| First spike | `Generator/spike/` | The engine's first draft and its contact sheet, kept for reference. |

---

## 1. Why this should exist

A laurel is a small piece of proof. Someone outside the production watched the film and chose it. For a first-time director it may be the only proof they have, and it ends up on the poster, the trailer, the pitch deck, the website and every social post.

Making one today goes like this. Download a stock pack. Fight with type in Canva. Pay to remove a watermark or to get a transparent PNG. End up with a laurel that looks like everyone else's, with "INTERNATIO-NAL" broken across two lines. None of the rival tools makes a row of laurels for a poster. None exports outlined SVG, a print PDF or video with transparency. None is open source. Figma has no laurel plugin. (Research §3.)

We can do better than that, and give it away.

### Principles

1. **Free for good.** No account, no watermark, no paid tier and no limits. Everything you make is yours, dedicated CC0.
2. **Beautiful by default.** The first laurel on screen should already be good. Every preset, every shuffle and every edge case lands somewhere a designer would sign off.
3. **Deep when you want it.** Every part of a laurel can be changed: each line of text, where it sits, each leaf, each colour stop, each gap. Simple things stay simple. The depth sits a click away and never gets in the way.
4. **Smart, not clever.** The engine does what a good designer would do: it fits the type to the space, keeps air around it, wraps names well, widens the wreath for long names, and warns before small text gets illegible. It always says what it did, and you can always override it.
5. **Honest.** We ship no festival logos and no lookalikes. We help people use official artwork properly, and we never help anyone fake a selection.
6. **Private.** Everything happens in the browser. A laurel lives in its own share link. There's no gallery, because films often have to keep a selection secret until the festival announces it.
7. **Open.** The code is MIT. Presets, the festival rules list and the branch styles are open data, so others can add to them.
8. **Made with care.** The details matter: optical spacing, real leaf shapes, foil that catches the light, an engraved line that looks drawn. This is the soul of the thing, and it's why people will choose it over a stock pack.

---

## 2. What we learned

**From the festivals** (research §1, 68 designs):

- **Many top-tier festivals have dropped the wreath.** Cannes, Venice, Berlinale, Sundance (since 2024), TIFF (since 2020), IFFR, IDFA and Hot Docs now use badges with no branches. A laurel tool that only does wreaths misses the most prestigious look. → We need a badge mode as good as the wreaths.
- **The year moves around.** In the sample it's on its own bottom line 41% of the time and after the festival name 21%. It's inside or as the hero 13%, missing 10%, and on the status line 9%. With the section or location it's 3%, and on a month line or curved seal 3%. It never sat in a ribbon. → The year is a field you can put anywhere, and joining it onto another line takes one click.
- **Laurels carry more fields than we thought:**
  - status, award, award type, section or strand, festival name, parent organisation, logo;
  - year, month, date range, edition (80 / 72nd / III), location, venue or tour;
  - sponsor, slogan, icon, and a second language.
  
  They run to five text lines plus a logo. → Fields are an open list, not fixed slots.
- **Festivals set rules.** Sundance bans changes to its laurel without written approval and bans shortening the name to "Sundance". It also requires its laurel to be at least as large as any other. Cannes and Berlinale require their own logo. "Submitted to" laurels are frowned on. → §11, guardrails.

**From the Envato and vintage packs we own** (studied for craft, not copied):

These traits made the best ones stunning, and each is now a parameter in the engine:

| Trait | Seen in | Engine control |
|---|---|---|
| Lopsided leaves: one half fuller, like real bay leaves | Heraldic set, gold sets | `leaf.asym` |
| Engraved inline: an outline ring, midrib and side veins | Heraldic set | `leaf.style = inline / engraved` |
| Half-shaded leaves (one half filled, one outlined) | Floral hand-drawn set | `leaf.style = split` |
| Leaves on short stalks | Wreath set ("stem") | `leaf.petiole` |
| Twigs with their own leaves; berries on stalks | Floral set | families `twig`, `sprig` |
| Crossed stems with a band, knot, rosette or bow | Heraldic and Old Laurels | `orn.tie` |
| Empire style: paired leaves with a dot in each fork | 10 Old Laurels | `arr = paired`, `berryPos = axil` |
| Double, nested wreaths | 10 Old Laurels, gold sets | `branch.rows = 2` |
| Mixed wreaths: oak on one side, palm on the other | 26 Old Laurels | `branch.right` |
| Lyre shapes with tips curling outward | 10 Old Laurels | negative `spine.curl` |
| Crowns and stars above the wreath | Heraldic set | icons `crown`, `star`, `stars`; the badge slot |
| Foil with a sheen per leaf, two-tone gold | 40 Gold Laurels | `paint.type = metal`, `scope = leaf`; inner-leaf paint |

The Envato files themselves can't go in the tool. The Envato licence covers pitch.dog's own projects. It says items can't be redistributed "in a tool or template… even if the redistribution is for free". Rebuilding their qualities procedurally gives us the beauty without the problem, and the range is wider than any pack.

**From the prototype and the stress test:**

- Placing text by measuring the real free space between the leaves works. In 370 laurels, no text touched a leaf.
- The real enemy is small sizes. At 160 px tall (a poster row on a 1080 px post), the small capitals in most laurels dropped to 3–6 px. The fix is to ask where the laurel will be used and enforce a pixel floor (§5.8).
- Long names in wide fonts need a wider wreath, not tiny type. Auto-widen fixed most of them (§5.9).
- At 160 px, 57 of the 300 random laurels still carry advice. Their small lines would have to be almost as big as the name. That's a real design conflict, so the tool shouldn't silently "fix" it. It explains the choice: drop a line, move it outside the wreath, or use the Flank form.
- A render takes 5–12 ms in the browser, fast enough for live sliders. After the speed pass (31 Oct) the average across the stress cases is about 5 ms. The heaviest look, a plume wreath with 36 leaves, builds cold in about 100 ms; the same look at its preset count takes 10–70 ms, and every other look stays under 30 ms.

---

## 3. Who it's for, and what they need to do

| Person | Job | What they need from us |
|---|---|---|
| First-time director, selected at a regional festival | Make one laurel for a poster and Instagram today | A great default, their own words, a PNG with a transparent background, done in two minutes |
| Producer with eight selections | Make a matching row for the one-sheet and the EPK | A set editor: one style, the same type size, prestige order, outlined SVG and a print PDF |
| Editor finishing the trailer | Put laurels on the end card | Transparent video or a PNG sequence, the right frame size, an optional draw-on animation |
| Distributor's designer | Fit laurels to a key-art system | Exact control of the brand font, colours and spacing; SVG for Figma, Illustrator and InDesign |
| Festival programmer | Make the official laurel pack for selected films | Their own artwork, colours and rules; a batch of every section; a shareable rules entry |
| Web person | Website strip and email signature | Inline badge form, SVG with alt text, a small file size |
| International team | Laurels in Japanese, Arabic, Korean | Script support, right-to-left text, and fonts that cover the script |

---

## 4. The laurel document

Everything about a laurel is one JSON document, versioned and small enough for a URL. The engine turns it into geometry and type, deterministically: the same document and seed always produce the same laurel.

```text
{ version, seed, form, branch{…}, paint{…}, fields[…], roles{…}, layout{…}, ribbon{…}, canvas{…} }
```

### 4.1 Fields: the words

A field is one piece of text (or an icon) with a kind, a role and a slot. Add as many as you like, and drag to reorder them.

| Kind | Examples | Default role |
|---|---|---|
| status | Official Selection · Winner · Nominee · World Premiere · North American Premiere · Special Mention · Finalist · Opening Night · In Competition | eyebrow |
| festival | Northlight · TIFF · International Documentary Film Festival Amsterdam | hero |
| award | Best Documentary · Grand Jury Prize · Audience Award | hero |
| award type *(new)* | Jury · Audience · Youth Jury | eyebrow |
| section / strand | Midnight · Generation 14plus · Directors' Fortnight · Shorts Programme 3 | sub |
| category | Short Film Competition · Feature Documentary | sub |
| year | 2026 · MMXXVI · '26 | sub |
| month / dates *(new)* | June 2026 · 4–15 June 2026 | sub |
| edition | 75th · 80 · III | eyebrow, or hero |
| location | Park City · Berlin · Lisbon | sub |
| venue / tour *(new)* | Lincoln Center · UK Tour | sub |
| sponsor *(new)* | Presented by … | sub, set smaller |
| second language *(new)* | the festival's name in its own language | sub |
| custom | anything | sub |
| icon | star · three stars · crown · dot · diamond · rule (a horizontal line) · your own SVG | eyebrow |
| logo *(new, built)* | uploaded official artwork (SVG, PNG, WebP or JPEG, up to 3 MB): a line of its own, twice its role's size tall and as wide as its shape, inside, above or below the wreath; optional tint in the line's paint | hero |

**Roles** set relative size and style: eyebrow (small caps above), hero (the name or award, fitted as large as the space allows), sub (small lines below), big (a hero-sized numeral, such as a big year). Each role has its own font, weight, case, tracking, size ratio and colour (§4.5).

**Slots** set where a field sits:

| Slot | What it does | Covers the year placements |
|---|---|---|
| inside | The main stack inside the wreath, fitted to the free space | Own bottom line (41%); as the hero (13%) |
| join above | Appends the field to the previous line with a separator ("TRIBECA 2026", "OFFICIAL SELECTION 2011") | After the name (21%); on the status line (9%); with the location (3%) |
| above / below | A stack outside the wreath | Under the wreath |
| arc top / arc bottom | Text set on a curve around or inside the wreath | Curved seals (3%) |
| ribbon | A banner across the base with the text on it | Never seen in the sample, but a classic. We keep it for its charm. |
| badge | A medallion in the top gap holding an icon or a short text ("1st", "2026") | — |

Any line can also be nudged by dragging it on the canvas. Double-click resets it. The nudge is stored, so the smart layout still runs underneath it.

### 4.2 Forms

| Form | Description | Status |
|---|---|---|
| Open | Two branches, open at the top. The classic. | Built |
| Wreath | Closed, with the stems crossing at the base and an optional band, knot, rosette or bow | Built |
| Single | One branch only: asymmetric and editorial | Built |
| Crown | Branches arch over the text | Built |
| Swoop | Branches sweep under the text | Built |
| Flank | Short branches either side of a line or block: the inline badge | Built |
| Mixed | A different branch on each side (oak and palm) | Built |
| Badge | No branches. Text with an optional frame: seal ring, oval, scalloped medal (these three fit the words to their shape and carry curved text in a band), box, double rules, ticket, film strip or corner marks (these are sized round the words). Any frame can be single or double; the ring, oval, medal, box, ticket and film strip can be filled, and the words then take an auto-contrast ink. This is how the top tier looks now. | Built |
| Bring your own | Upload an official laurel (PNG or SVG). The tool sets its type, or recolours its artwork where the festival allows it (§11). | Planned |

### 4.3 The wreath grammar

A branch is built from parts. Change any one and you get a new laurel that still holds together.

- **Spine:** an elliptical arc, set by width, height, start angle, end angle, tip curl (inward or outward), spiral, and how far the stems cross at the base.
- **Stem:** width and taper.
- **Leaf family:**
  - simple, fern, palm, wheat, needle (pine), trefoil, twig, sprig;
  - star: stars along the branch;
  - custom: any SVG path you paste, such as a film frame or a popcorn kernel.
- **Leaf shape**, for the simple, twig and trefoil families: almond, lance, willow, round, spoon, heart, teardrop, oak, serrate, feather, diamond, blade.
- **Leaf style:** solid, inline (engraved outline), engraved (outline, midrib and veins), split two-tone, plus the line weight.
- **Leaf details:**
  - count, size at the base, size at the tip, a swell in the middle;
  - width, bend, how lopsided;
  - angles out and in, inner-leaf size, stalk length, midrib;
  - jitter (natural variation), hand-drawn wobble;
  - pointing towards the base instead of the tip.
- **Arrangement:** alternate, paired, outer only, inner only, whorled. Spacing curve.
- **Ornaments:**
  - the tip: a leaf, bud, berry, star or nothing;
  - berries, inside, outside or in the forks, at any size;
  - flowers;
  - the tie at the base: band, knot, rosette or bow.
- **Rows:** single or double (nested).
- **Seed:** the leaves' natural variation. Same seed, same laurel.

Planned:

- secondary branching (sprigs off the main stem);
- streamers on the bow;
- hatched and stippled engraving;
- a drawn spine: draw your own curve with the pen;
- a leaf-shape editor: drag the half-width curve.

### 4.4 Colour: every surface is a paint

A paint is one of:

- solid;
- linear gradient, with any number of stops and any angle;
- radial gradient, with centre and radius;
- metal: gold, silver, bronze, rose gold, platinum or copper.

Every gradient applies either across the whole wreath or to each leaf separately. "Each leaf" is what gives the foil look.

Surfaces you can paint:

- the leaves;
- the inner leaves (the same paint dimmed by a depth amount, or a second paint for two-tone wreaths);
- berries and flowers;
- the outline stroke;
- each text role on its own;
- the ribbon and badge, and the text on them;
- the background, or none for a transparent background.

Draw modes are filled, outline, or filled with an outline.

Effects:

- built: drop shadow (blur, offset, strength, colour), glow, and misprint (a second ink printed underneath, slightly off register, as on a Riso), with the choice to apply them to the text and logos as well;
- built (31 Oct, afternoon): **foil** (a crinkled surface over a soft bevel catches a light: shine, crinkle, crinkle size, light angle), **letterpress** (the shapes pressed into the paper: a shadow inside the top-left edge, a light inside the bottom-right, mottled ink and a light rim on the paper) and **grain** (worn ink: specks of paper show through; amount and speck size). They stack with the others. Two presets use them: Hot Foil and Letterpress.
- Effects are SVG filters: they're in the PNG, the video and the SVG, and left out of the PDF (printers make foil and letterpress as their own plates).

### 4.5 Type

- **Five roles:** eyebrow, hero, sub, big, and arc (used for ribbons and badges too). Each has its own font, weight, italic, case (as typed, UPPERCASE, Title Case, lowercase), tracking, size relative to the hero, and colour.
- **Fonts:**
  - a curated set of about 45 Google Fonts, all under the Open Font License, grouped as Sans, Condensed, Classical, Serif, Deco and Character;
  - any other Google font by name;
  - later, your own font: loaded locally, never uploaded, always outlined on export.
- **Planned:** tabular and old-style figures, real small caps where the font has them, a weight axis for variable fonts, optical-size axes, and a second font per role for the second-language line.

### 4.6 Canvas and output

- **Shape:** fit the laurel, square, 4:5, 9:16, 16:9 or 2:3.
- **Padding** is in units of the laurel, so a laurel exported at any size keeps its margins.
- **Background:** any paint, or transparent.

---

## 5. The smart layout engine

These are the rules that make the default good. Each one runs automatically, shows up in the report under the preview, and can be overridden.

1. **Free space is measured, not assumed.**
   - While it builds a branch, the engine collects every outline point.
   - For each 2-unit band of height, it knows how far in the leaves reach.
   - A line of text fits when its half-width, plus padding, clears that boundary at every band it covers, from its cap height to its descender.
2. **Padding grows with the type.**
   - Air = base + k × type size (defaults: 3 units + 0.14 × the hero size).
   - Big type gets more room, small type stays snug, the way a designer spaces it by eye.
3. **The tips never collide.**
   - The gap between the two tips scales with the leaves: tip leaf size, leaf width and stem weight.
   - If the leaves would cross, the arc shortens until they clear.
   - Crossed-stem wreaths are exempt at the base, where crossing is the point.
4. **The text block finds its best height.** It tries nine vertical positions and keeps the one that allows the biggest type, with a gentle pull towards the optical centre (just below the geometric centre in an open laurel). In an enclosing form it stays between the base and the tips.
5. **Wrapping is chosen, not forced.**
   - Any multi-word line can split into two lines; a hero, or a small line of five words or more, into three.
   - Several lines can wrap at once. A small line too wide to ever fit starts wrapped; then the engine adds one wrap at a time to its three best candidates for as long as that buys bigger type. A candidate is dropped after a single try when it can't fit at the size it would need to win.
   - It picks the version with the largest type.
   - Each extra line costs 14%, and an unbalanced split costs up to 18% more. Breaking exactly where two fields were joined ("Northlight 2026") costs a further 28%, so a join holds unless breaking it buys a lot.
   - A line never starts on a separator (·, |, –) and never ends on one or on an ampersand.
6. **Tracking gives before size does.** When a small-caps line is tight, its letter-spacing tightens first, down to a floor (by default 35% of the set value). Only then does the type shrink.
7. **Spacing between lines is optical.** Gaps are measured from cap height, not font size. Lines of different roles are spaced by the smaller of the two sizes. A wrapped line's own continuation sits tightest; separate fields in one role sit a little looser; tracked small caps get more leading than the name, so they read as lines rather than texture. Descenders are counted only when they're there.
8. **A legibility floor in real pixels.**
   - You say where the laurel will be used at its smallest: 600 px, 300 px, a poster row at 160 px, or a tiny 100 px.
   - The engine keeps small text at 6 px or more at that size.
   - If that would make the small lines nearly as big as the name, it tells you what to do instead.
   - When there is simply too much text for the size, it lowers the small-line floor step by step and keeps the arrangement whose smallest text is biggest, the name included, and says so. It never collapses to a tiny name over unreadable lines. As a last resort it shrinks each line to its own room, so nothing runs into the leaves.
9. **Long names widen the wreath.** If the hero would fall below 62% of its comfortable size, the engine widens the wreath by about what the name needs (13–30% a step, up to three steps) and reports it.
10. **The flank form scales to the text.** The branches stand about 1.8 times the height of the text block and sit just clear of its widest line. The block stays within about 2.4 times the branch height wide, so a long name wraps rather than pushing the branches out into a thin strip.
11. **Outside text keeps clear of everything.** Arcs over the top and under the base grow until they clear both the leaves and the text inside, with air at their ends. An arc along the base goes round the outside when there is no room between the text and the base. The badge rises above tendrils and text, the arc rides over the badge, and the ribbon slides down until its rising ends clear the text.
12. **Sets share one type size.** In a row, every laurel takes the smallest hero size the set needs, so the names line up.
13. **The report.** Under the preview, in plain words: the hero size, lines wrapped for size, lines fitted tight, tracking tightened, the wreath widened, and any warnings with what to do about them.

**Next for the engine:**

- optical overshoot for round letters (O, C, S) and pointed ones (A, V);
- numeral handling: tabular figures for years, and an optically centred "1";
- optical centring of the whole wreath, accounting for an open top and heavy bases;
- baseline alignment across a set (the Row view puts every laurel on one centre line; true text baselines across different layouts are still to do);
- automatic contrast checking against the background (built for the poster view, 31 Oct; not yet inside the engine's report);
- "simplify for small sizes": fewer, larger leaves below a size threshold, like the Mini branch in the Figma system.

---

## 6. Choice without chaos

- **Presets.** 78 today in eight groups, each a full look, every one reviewed at full size with a short and a long award:
  - **Festival gold (15):** Classic Gold, Black Tie, Champagne, Laureate, Grand Prix, Victory, Antique Gold, Rose Gold, Platinum, Bronze Jury, Heraldic, Premiere Ribbon, Medal, Crown Jewel, Hot Foil;
  - **Vintage & engraved (11):** Engraved, Empire, Etching, Bookplate, Copperplate, Victorian, Old World, Apothecary, Herbarium, Gazette, Letterpress;
  - **Botanical (15):** Botanical, Olive Grove, Olive Gold, Lavender, Eucalyptus, Myrtle, Cherry Blossom, Ivy, Rosemary, Wildflower, Harvest, Riviera Palm, Fern Silver, Pine Winter, Bay Shorts;
  - **Modern & minimal (8):** Monoline, Hairline, Pearl, Arthouse, Split Tone, Brutalist, Swiss, Big Year;
  - **Deco & geometric (7):** Deco, Gatsby, Stepped Oak, Ginkgo, Odeon, Chrome, Lyre;
  - **Colour & pop (8):** Neon Midnight, Holo, Sorbet, Ember, Ocean, Riso, Documentary, Velvet;
  - **Badges (10):** Gala Seal, Gold Medal, Notary, Wax Seal, Cartouche, Première, Marquee, Admit One, Film Strip, Viewfinder: no branches and no festival marks, typography and a frame;
  - **Forms (4):** Inline Badge, Crown, Swoop, Single Bough.

  Every preset keeps your words, and the thumbnails show them live (drawn lazily as they scroll into view). Overviews: `Presets — overview.jpg`, `Badges — overview.jpg`.
- **Layouts.** A preset is a look; a layout is where the words go. Laurels move things around: sometimes three lines, sometimes four or five, the year in four different places, the status curving over the top. So the two are separate, and any layout works in any look. There are 18 in three groups, each with the share or festivals it comes from (research/01 §1.3):
  - **Where the year goes (7):** Year below (the most common, 41%), Year with the name (21%), Big year (13%), Year with the status (9%), Year with the place, No year (10%), Name and year;
  - **Awards (4):** Winner, Award in full (five lines and stars), Festival first, Star winner;
  - **Extras (7):** Name only, Edition, Status over the top, Seal (the status curves over the top and the year under the base), Medallion, Year on a ribbon, Status above.

  The name line of every layout that isn't about an award takes whichever the user leads with, the festival or the award, so an award laurel keeps its award as the hero when it moves into a seal, a ribbon or a big year.

  A layout never deletes words. A kind it leaves out is hidden, and comes back with the next layout that uses it. A kind it needs arrives with grey example text to type over. Custom lines stay where they are. The card that's lit is the layout your words are actually in, so arranging lines by hand lights the matching card. A few presets bring a layout with them (Premiere Ribbon, Medal, Big Year); a layout you pick yourself stays when you change the look. Overview: `Layouts — overview.jpg`.
- **What makes them beautiful.** The craft that the second pass added, all procedural:
  - *Fold shading:* each leaf is folded along its midrib, with one half darker, so metals read as struck metal, not flat foil.
  - *Leaf styles:* solid, slit (the hairline midrib of the classic vector laurel), carved veins, inline, engraved, hatched (engraver's hatching on the shaded half) and split.
  - *Leaf shapes:* almond, laurel, lance, willow, flame, round, heart, teardrop, spoon, oak, serrate, feather, diamond, blade, fan (ginkgo) and stepped (Deco).
  - *Families:* simple, fern, palm, wheat, needle, trefoil, twig, sprig, plume (quills), spike (lavender), bead (pearls), bloom (five-petal flowers), star and your own SVG path.
  - *Rhythm:* S-curved leaves, fan-out (open at the base, tight at the tip), big–small alternation, swell, lopsided bay leaves.
  - *Ornaments:* berries (round, olive on a stalk, cluster of three), flowers, tendril tips, bud and star tips; ties (band, knot, rosette, bow, bow with fluttering swallow-tail streamers).
  - *Metals:* gold, antique gold, champagne, brass, silver, platinum, chrome, pewter, bronze, copper, rose, onyx, patina, iridescent.
- **Shuffle.** Shuffle the whole look, or just the wreath, the colour or the type. Each draws from curated pools (16 palettes, 20 type pairings, guarded wreath ranges), so every result is usable.
  - Next: lock any part.
  - "Nudge" makes a ±10% mutation of the current look.
  - Shuffle within a preset family.
- **History:** undo and redo (⌘Z and ⇧⌘Z), up to 200 steps.
- **Next:**
  - A/B compare;
  - favourites saved in the browser;
  - your own presets, exported as files to share with a team;
  - "Make it like this": upload a reference laurel and get the closest parameters, judged by eye, not traced.
- **Share links.** The whole document is compressed into the URL hash. A link is the laurel: nothing is stored on a server.

---

## 7. Sets and rows (first-class)

Posters carry rows of three to eight laurels. Rows only look right when everything but the words is the same.

- **Built (31 Oct, the Row view):**
  - a table of laurels: status, festival, award, year; reorder by dragging, show or hide, remove, mark a lead laurel;
  - paste from a spreadsheet (tabs, commas, semicolons or pipes; a header row is used if there is one, otherwise each cell is recognised by what it looks like: a year, a status, an award);
  - one row, tiered (the lead laurel on top, larger) or a grid, with the number per row;
  - order by prestige: wins, then premieres, then selections, the biggest festival names first (an open, editable list in `rules.js`), or as listed;
  - the same type size in every laurel (or fit each one), and every laurel on one centre line;
  - award rows switch to an award layout automatically; other rows keep the look's own layout;
  - official artwork placed in the row at the same height;
  - spacing tied to the laurel size;
  - the festival rules checked across the row (§11);
  - export: row SVG, PDF and PNG, plus a ZIP with every laurel as its own SVG and PNG at one shared scale (so the type matches when placed) and a README.
- **Next:** per-laurel overrides (a different metal for wins), wrapping for mobile web.
- **Official artwork in a set.** Upload an official laurel into the row; it's placed at the same height as the others. When Sundance is named and another laurel leads a tiered row, a note says Sundance asks for size parity, with a Fix button that makes it the lead (§11). Next: a pin that keeps it never smaller, whatever the layout.
- **Batch export:** built as a ZIP of every laurel as SVG and PNG, numbered in row order and named by festival (`01-tribeca.svg`), with official files passed through unchanged. Next: names with the year and status (`2026-tribeca-official-selection.svg`) and the PDF in the ZIP too.

### 7.1 On your poster (built 31 Oct)

A laurel is judged on the poster, not on a swatch. The On poster view:

- takes a poster image (kept on the device, scaled to 2,400 px at most) and lays the laurel over it; drag to place, scroll or the slider to size, Centre to reset;
- reads the poster behind the laurel and gives a contrast score: the worst tenth of the pixels behind the words, against WCAG's 4.5 and 3 ("reads well", "readable when large", "hard to read here");
- **Auto ink** picks the text and leaf colours that read best on that patch, adding a soft shadow or glow when the patch is busy, and gives your own colours back when it's turned off (or when you change a colour by hand);
- offers four looks made from the poster (light, accent, foil, a metal), each with its contrast checked, plus the poster's six-colour palette to click into any paint;
- **At 160 px** shows the laurel at its real poster-row size, one pixel per pixel, beside the large view;
- saves a mockup PNG (poster plus laurel) for sharing a draft. The poster never leaves the browser.

---

## 8. Export

| Format | Details | State |
|---|---|---|
| SVG | Text outlined with HarfBuzz by default (works in every tool, no fonts needed); live text with a font link as an option. Characters the font lacks are drawn in the matching Noto font. A not-affiliated note travels inside the file. Next: named layers, accessible `<title>`/`<desc>`. | Built |
| PNG | Any width (1,000–6,000 px), with or without background, fonts embedded so it matches the preview exactly | Built |
| PDF | Vector, outlined text, at a chosen width (50–200 mm), via svg2pdf. RGB for now. Next: CMYK conversion, a single-colour spot mode for foil or one-colour print, crop marks | Built (RGB) |
| Social | Square, 4:5 and story frames with safe zones; poster-row and end-card templates. The Motion view already renders square, 4:5 and vertical frames; still images in those frames, with safe zones, are next | Partly built |
| MP4 · PNG sequence · animated SVG | The end-card animation (§9): H.264 MP4 through WebCodecs (HD, 4K, square, 4:5, vertical); a transparent PNG sequence in a ZIP for Premiere, Resolve and After Effects; an animated SVG (SMIL) that plays once and holds, for websites | Built |
| WebM with alpha · Lottie | Transparent web video and a Lottie file | Later |
| ProRes 4444 | Optional WebAssembly module, loaded only when asked | Later |
| Set ZIP | Every laurel as SVG and PNG at one shared scale, with a README | Built |
| Poster mockup | The poster with the laurel on it, as a PNG, for sharing a draft | Built |

There is no watermark, ever. IMDb rejects images with third-party branding, and we wouldn't add one anyway.

---

## 9. Motion

- **Draw-on:**
  - the stem grows from the base to the tip;
  - the leaves open in order (the engine already records each leaf's position along the branch);
  - berries pop in;
  - the text rises in after the leaves.
- **Shimmer:** a sheen moves across metal paints.
- **Timing:** duration, easing, stagger and hold. The motion respects reduced-motion settings in the app.
- The animation is deterministic and can be scrubbed, so exports render frame by frame without dropped frames.
- **Uses:** trailer end cards, festival-announcement posts, website heroes.
- **Built (31 Oct, the Motion view):** the leaves are revealed along the stem by a soft-edged stroke (so every family, tie and tendril grows in without per-leaf data), badges fade and scale in, the words rise in one by one, then a shimmer crosses the wreath and the words. Choices: this laurel or the whole row (staggered), grow / fade / already there, rise / fade / already there, shimmer on or off, 3–8 s, five frame sizes, size in frame, background (the look's, black, white, transparent). One timeline drives the preview, the scrubber and every export. With reduced motion set, the preview opens paused on the last frame.

---

## 10. Fonts and scripts

- **Delivery:** a curated set we host ourselves, built from Fontsource or Google Fonts at build time, with each licence bundled. Two reasons to self-host:
  - Google's font-list API needs a key;
  - a 2022 Munich ruling went against loading Google Fonts from Google's servers.
- **What's allowed:**
  - OFL fonts may be outlined in exports (confirmed, research §4.2);
  - Fontshare fonts (including Satoshi) are out: their free licence bans offering them to users of a design tool;
  - your own font loads locally and never leaves the device.
- **The prototype today** fetches font files for outlining from jsDelivr's mirror of the google/fonts repository at `main`. That's fine for a prototype, but `main` moves; the public version should host pinned copies itself.
- **Scripts.** The stress test already sets Cyrillic, Greek, Japanese, Korean, Arabic and Hindi. In the preview they fall back to system fonts. Outlined exports (31 Oct) shape every line with HarfBuzz and draw any character the chosen font lacks in the matching Noto font (Japanese, Korean, Arabic, Hebrew, Devanagari, Bengali, Thai, Armenian, Georgian, symbols), and says which ones it used. Next:
  - the same Noto match in the live preview;
  - right-to-left layout with correct shaping through HarfBuzz;
  - a second-language field;
  - an automatic switch for a role when its font lacks the script's characters.

---

## 11. Guardrails: honesty and law

1. **No festival logos ship.** We ship no festival logos and no lookalikes; presets are named after moods, not festivals. There's an upload slot for official artwork, for people who have it.
2. **A festival rules list,** open data with a source link for each entry. When someone types a festival name, its rules appear:
   - Sundance: no changes, no "Sundance" alone, never smaller than other laurels.
   - Cannes and Berlinale: use their own logo.
   - Others as we document them.
3. **Status values are honest.**
   - "Submitted" and "Semi-finalist" aren't status presets (people can still type them).
   - A gentle note appears when "Official Selection" sits next to "Market", "Short Film Corner" or similar non-selection programmes.
4. **Recolouring official artwork** is offered only where the festival allows it, with that permission shown.
- **Built (31 Oct):** `prototype/rules.js` is the open registry (Sundance, Cannes, Berlinale, Giffoni, Tallahassee, Tribeca, Clermont-Ferrand, each with its source link). The notes show under the laurel and across a row, worded as notes, never blocks: official artwork required or supplied (quiet once a logo is uploaded), Sundance's full name, Tribeca's current name, a tinted logo for a festival that wants its artwork unchanged, "Submitted", markets beside "Official Selection", "Winner" with no award, two "World Premiere" claims in one row, and Sundance's size parity in a tiered row (with a Fix button that makes it the lead).
5. **No watermark, no tracking, no gallery.** Selections can be under embargo, so nothing leaves the browser unless the user shares a link.
6. **Licences in every export.** Output is CC0. Each export's metadata names its fonts and their licences.

---

## 12. Accessibility and craft in the app

- **Keyboard:** every control can be reached by keyboard, and the canvas can be nudged with arrow keys.
- **Contrast:** a checker compares laurel and text against the background, including a photo background.
- **Exported SVGs** carry a title and description: "Official Selection, Northlight Film Festival 2026".
- **Small-size truth:**
  - preview at FilmFreeway-poster scale (about 70 px wide), as a poster-row tile and as an inline badge;
  - the "smallest use" setting drives the legibility floor.
- **Mobile:** the editor works on a phone. Panels become bottom sheets, and the canvas leads.

---

## 13. Robustness and quality

- **Stress suite, kept forever and run in CI:**
  - names and scripts;
  - one to seven lines and every slot;
  - every form;
  - every preset with a long award;
  - twelve extreme wreaths;
  - 300 seeded random laurels.

  Hard failures are text touching a leaf and text under 6 px at the target size; current count, zero. Advisory warnings are tracked as a number we drive down.
- **Visual regression:** snapshots of all presets and the stress cases on every change, compared pixel by pixel.
- **A designer looks at everything.** Numbers catch collisions, not ugliness. Every preset, every new leaf family and every new form is reviewed at full size, with short and long text, before it ships. The first mixed oak-and-palm wreath passed every check and was still ugly: the two sides didn't balance. The engine now scales the second side to match the first side's reach, but the rule stands.
- **Performance budget:** a render under 16 ms on a mid-range laptop and under 40 ms on a mid-range phone. Thumbnails are rendered off the main thread.
- **Determinism:** the same document and seed always give the same laurel, across versions. The document schema is versioned, migrations upgrade old share links, and old links never break.
- **Fuzzing the document:** random and malformed documents must never crash the engine. They fall back to defaults with a warning.
- **Fonts failing:** the layout re-fits when a font finishes loading. A font that fails to load falls back to the nearest family in the same category, with a notice.

---

## 14. Architecture

| Package | What it is |
|---|---|
| `@laurel/engine` | TypeScript port of `engine.mjs`. Pure, no DOM, deterministic. Geometry, layout, report. |
| `@laurel/text` | HarfBuzz (WebAssembly) shaping: real measurement, every script, glyph outlines for export |
| `@laurel/export` | SVG (outlined), PNG, PDF (vector, CMYK), animation frames, ZIP |
| `@laurel/data` | Presets, palettes, type pairings, the festival rules list, the font manifest. JSON, open data, contributions welcome. |
| `app` | The editor: Vite and a light UI framework (Svelte or Preact; we decide in §17). Lives at **pitch.dog/daphne**, built with a `/daphne/` base path. Static files, works offline, no backend. |
| `cli` | `laurel make --preset "Classic Gold" --status "Official Selection" --festival "Northlight" --year 2026 -o out.svg`, plus batch from CSV |
| Figma plugin | The same engine inside Figma, placing editable vectors. The Laurel System we built in Figma becomes its sister project. |
| Framer component | A code component for film websites |

Licences:

- code: MIT;
- presets, rules list and output: CC0;
- fonts: their own licences (OFL), bundled.

---

## 15. Roadmap

Each phase ends when its exit test passes, not on a date.

| Phase | Scope | Exit test |
|---|---|---|
| **0 · Proof** (done) | Engine v2, playground, 76 presets, 18 layouts, badge mode with 8 frames, logo upload, misprint effect, leaf craft pass, stress suite v4 (1,678 cases, geometry checks on the real SVG), research | Zero overlaps; text below the floor only where the engine has warned there's too much of it |
| **1 · First public version** | TypeScript engine; HarfBuzz text; logo upload; the 20 most-asked controls up front, the rest in "More"; 40 presets; outlined SVG, PNG and PDF; share links; mobile editor; rules list v1 (10 festivals); the stress suite in CI | Five filmmakers outside pitch.dog each make a poster row in under ten minutes without help |
| **2 · Sets and print** | Set editor, CSV, row, grid and tiered layouts, batch ZIP, CMYK and spot PDF, contrast checker, small-size preview. *Built in the prototype on 31 Oct except CMYK and spot PDF.* | A real one-sheet with eight laurels goes to print from the tool |
| **3 · Motion** | Draw-on and shimmer, WebM alpha, PNG sequence, Lottie. *Draw-on, shimmer, MP4, PNG sequence and animated SVG built on 31 Oct; WebM alpha and Lottie not yet.* | A trailer end card made in the tool runs in a released trailer |
| **4 · Everywhere** | CLI and npm, Figma plugin, Framer component, script support with Noto and right-to-left | A festival makes its official pack with the CLI |
| **5 · Community** | Preset and rules contributions, translations of the app, a gallery of pitch.dog-made looks (ours, never users' private laurels) | Outside contributors merge presets and rules entries |

---

## 16. Risks

| Risk | Mitigation |
|---|---|
| Too many controls overwhelm newcomers | Presets and shuffle first; the 20 key controls up front, the rest under "More"; plain words; good defaults |
| People use it to fake selections | No logos shipped; honest status presets; the rules list; no "submitted" defaults. We can't stop someone typing, so we make the honest path the easy one. |
| Festivals object to their names in the rules list | Every entry quotes the festival's own published rules with a link. Takedown requests are honoured quickly. |
| Script and font gaps | HarfBuzz and Noto in phase 4; fallbacks with clear notices before that |
| Export fidelity across tools | Outlined SVG and PDF tested in Illustrator, InDesign, Figma, Affinity, Premiere and After Effects as part of CI's manual checklist |
| Scope creep | Each phase has one exit test; new ideas go to a backlog, not into the current phase |
| Maintenance once it's public | Small dependency surface, static hosting, and data contributions that don't need code review of the engine |

---

## 17. Decisions for the studio

1. **Name and home: Daphne, at pitch.dog/daphne** (decided 31 Oct 2026). No separate domain. The app is built for a sub-path, so assets and share links sit under `/daphne/`, for example `pitch.dog/daphne#l=…`. pitch.dog confirmed Daphne over Laurelist on 31 Oct 2026: it carries the laurel's origin story and reads as a someone, while Laurelist reads like a list of selections. Search is handled by the words around the name: always "Daphne — free festival laurel maker" in the page title, the H1 and social cards, and pitch.dog/laurels and pitch.dog/laurel-generator redirect to /daphne. Credit line on exports: "Made with Daphne".
2. **Where it lives.** A public repo under the bomkino GitHub organisation or a new pitch.dog one, and whether it carries pitch.dog branding ("made by pitch.dog") in the app footer.
3. **Licences.** Confirm MIT for the code, CC0 for presets, data and output.
4. **UI framework** for the app: Svelte (smaller and faster) or Preact (closer to the React habits of most contributors). Recommendation: Svelte.
5. **First-version scope.** Confirm phase 1 as written. Badge mode, logo upload, HarfBuzz outlining, the PDF and the rules list are all built in the prototype now, and so are most of phases 2 and 3 (the row builder, the poster preview with contrast and small-size checks, motion). What phase 1 still adds is the TypeScript port and the mobile editor; CMYK and spot PDF, WebM with alpha and Lottie stay later.
6. **Who reviews presets.** Someone at pitch.dog signs off every preset before it ships, so the defaults stay beautiful.

---

## Appendix A · Control inventory (prototype)

| Area | Controls |
|---|---|
| Text | Unlimited fields: kind, text, role, slot, show, join above, nudge (drag), reorder (drag), remove; add status, festival, award, category, location, year, edition, custom, icon, logo (upload, replace, tint) |
| Fit and spacing | Smallest use (legibility floor), auto-widen, max hero, min small, air to leaves, how fast air grows, line spacing, wrapped-line leading, vertical position (smart or fixed), wrapping (smart or never), arc radii, ribbon radius and width, badge size, outside gap, flank fill |
| Badge (Badge form) | Frame (8: seal ring, oval, scalloped medal, box, double rules, ticket, film strip, corner marks), filled, double line, line weight, line gap, ornament (star, dot, diamond, none), size and band width (ring, oval, medal), corner radius (box), frame colour, text on the frame (auto-contrast or any paint) |
| Wreath | Form (7), width, height, start and end angle, tip curl, spiral, cross stems, tip gap (smart or fixed), stem width and taper, rows, tip ornament, berries (how often, where, size), flowers, tie, mixed wreath (different right side, shuffle it) |
| Leaves | Family (11), shape (12), style (4), line weight, count, size at base and tip, width, swell, bend, lopsided, angle out and in, inner size, arrangement (5), spacing, stalks, midrib, jitter, hand-drawn, point to base, custom SVG shape, seed |
| Colour | Paints for the leaves, inner leaves, berries and flowers, outline, main text, small text, ribbon and badge, ribbon text, background. Each one can be none, solid, linear, radial or one of the metals, applied across the wreath or per leaf. Plus inner dimming, draw mode, outline width, shadow, glow, misprint, foil (shine, crinkle, size, light), letterpress (depth, strength), grain (amount, speck size), effects on text. |
| Type | Per role (hero, eyebrow, sub, big, arc): font (45 curated plus any Google font), weight, italic, case, tracking, size ratio, colour |
| Canvas and export | Shape, padding, PNG width, background in or out, SVG text (as shapes or live), PDF width; SVG, PDF and PNG buttons (they save the row in the Row view); share link, reset |
| On poster | Upload or replace the poster, drag to place, scroll or slider to size, centre, auto ink, contrast readout, at 160 px, mockup PNG, colours from the poster (four checked suggestions and the palette) |
| Row | Arrange (one row, tiered, grid), per row, order (prestige or as listed), type size (same or fit each), gap, lead size, the table, + laurel, + official artwork, paste from a spreadsheet, ZIP of separate files |
| Motion | Play, from the start, scrub; animate (laurel or row), leaves, words, shimmer, length, frame, size, background; MP4, PNG sequence, animated SVG |
| Global | Views (laurel, on poster, row, motion), shuffle (all, wreath, colour, type), presets (78, grouped), layouts (18, grouped), undo and redo |

## Appendix B · Files

```text
Laurels/Generator/
  00 — Product plan.md              this document
  research/01 — Laurel anatomy and market.md
  prototype/
    engine.mjs                      the engine (v2)
    index.html · app.js             the playground
    fonts.js                        curated fonts and loaders
    presets.js                      78 presets (looks) in 8 groups
    poster.js                       the On poster view: placement, auto ink, contrast, palette, 160 px, mockup
    row.js                          the Row view: table, paste, prestige, tiered and grid, ZIP
    rules.js                        the festival rules registry and the prestige order (open data)
    motion.js                       the Motion view: the end-card timeline, MP4, PNG sequence, animated SVG
    outline.js                      text to shapes (HarfBuzz, Google Fonts files, Noto fallbacks) and the PDF
    zip.js                          a small ZIP writer
    vendor/                         harfbuzzjs, jsPDF, svg2pdf.js, mp4-muxer (MIT, copied unchanged; see vendor/README.md)
    layouts.js                      18 layouts (where the words go) in 3 groups
    lab.html                        leaf-craft specimens (?only=, ?cols=)
    stress.html · stress.js         the stress suite, 1,702 cases (add ?px=160 for the poster-row floor)
    qa.html                         every preset or layout at full size for visual review (?from=0&to=9&cols=3, ?long=1,
                                    ?text=richlong, ?layout=seal, ?layouts=1&looks=Classic Gold,Swiss, ?frames=1, ?logo=1, ?sheet=1)
    perf.html                       cold and warm render times of the heaviest looks (?extra=30 adds leaves)
    tools/features.mjs              renders a feature sheet in Node (rsvg-convert)
    qa-outline.html                 live text against outlined text, pixel by pixel (?only=, ?texts=, ?pdf=1)
    qa-effects.html                 every look × every effect, large (?looks=, ?fx=)
    tools/cdp-run.mjs               runs a page in headless Chrome on the real clock and prints a result (stress, perf)
    tools/cdp-shot.mjs              a full-page or window screenshot in headless Chrome, with an optional setup script
  serve.py                          no-cache dev server (python3 serve.py 5178)
  Presets — overview.jpg · Layouts — overview.jpg · Badges — overview.jpg · Logos — overview.jpg
  spike/                            first engine draft and its contact sheet
```
