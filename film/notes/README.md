# New-project kit

*Six working files, and this note, that keep a project's state on disk, so any chat, and the same chat after a compaction, starts warm. A website chat kept files like these across new chats and stayed on track.*

This folder is the same in `bomkino/website-learnings`, `bomkino/deck-learnings` and `bomkino/remotion-starter-kit`, so a project can start from whichever repo it reads first. Change it in all three.

## Set it up

1. Copy this folder into the project's repo as `notes/`, and fill in the brackets in every file.
2. Make sure the project's `AGENTS.md` carries these two lines near the top, with a `CLAUDE.md` holding `@AGENTS.md` so Claude Code and Codex read the same file. A site started from `website-learnings/templates/site-AGENTS.md`, a deck started from `deck-learnings/templates/deck-AGENTS.md`, and a piece started from a copy of `bomkino/remotion-starter-kit`, already have them; any other repo gets them by hand:

   > Read `notes/handover.md` first, every session and after every compaction. Keep `notes/tasks.md`, `notes/decisions.md`, `notes/kay-words.md`, `notes/learnings.md` and `notes/journey.md` current as you work. The files win over any summary.
   >
   > When compacting, keep the list of changed files, the check to run, the open decisions, and the path `notes/handover.md`.

3. Commit `notes/` with the work, by path, and push at each milestone. A cloud thread that can't resume continues from a fresh clone, so unpushed work is lost.
4. If Codex laid groundwork for the project first, the first Claude message says: "Read groundwork/START.md first and open the rest only when a task needs it." The hand-off is described in `website-learnings/templates/codex-groundwork.md`.

In a Claude Code Project, the project instructions (up to 16,000 characters in October 2026) reach every thread: put the paste-in line there (it is the same in each learnings repo's README). A repo's own rules go in its root `CLAUDE.md`, because a thread loads that and `.claude/rules/` up front, and a subfolder's `CLAUDE.md` isn't loaded up front. A thread can add another `bomkino` repo when a task needs it.

## The files

| File | Holds | Write it |
|---|---|---|
| `handover.md` | Read me first: what the project is, where things stand, rules that must survive, what's verified, what only a person can check | Before a break, before a long or risky step, and whenever the context is getting long. Replace stale lines, and keep it under a screen |
| `tasks.md` | The living task sheet and tracker: now, next, blocked, done, and a short log | As each step lands, not at the end. One step in progress at a time |
| `decisions.md` | One line per decision, with its reason and who made it | The moment it's made. A decision without its reason gets re-argued |
| `kay-words.md` | The studio's messages, word for word, dated. Kay, Em and Jen often write as one, so "Kay" here means the studio; a client's words, when relayed, go in too, marked as theirs | As they arrive. The studio's own words win over any summary of them |
| `learnings.md` | What you learn as you go, in the shape the learnings repos use | When something works, breaks or surprises you. It becomes the write-up at the end |
| `journey.md` | The creative path as it happens: what the client gave us, what we noticed and chose, and why | When a choice changes the look, the words or the story. It becomes the journey the client sees |

## Surviving a compaction

Claude Code compacts a long conversation into a summary, in cloud threads too, and a summary drops detail. Files on disk don't. Anything an invoked skill said is cut to about 5,000 tokens at compaction (Claude Code's skills docs, October 2026), so the files, not the skill, hold the state.

- **Before:** update `handover.md` and `tasks.md`, and commit them. If you can see a compaction coming, do it now.
- **After:** read `handover.md`, then `tasks.md`. Where the summary and the files disagree, trust the files, then fix whichever is wrong.
- **For very long work,** a fresh session beats a compaction. Start it with: read `notes/handover.md`, `notes/tasks.md` and `git log`, then continue.
- **When a chat's context has rotted,** start a new chat from a dated folder: a start-here file, the topic brief, Kay's words, and a paste-in line given as plain text (`bomkino/website-learnings/guides/working.md`, "Notes that survive a new chat").

## At the end

Write up the project's learnings for its repo with its `templates/learnings-prompt.md` (each of the three repos has one), working from `learnings.md` and `decisions.md`. Write the client's journey from `journey.md`, starting at what they gave us.
