# Practice guide

The real interview runs in a browser editor with a built-in AI agent pinned to a **small, fast model (Haiku-class)**.
That model is weaker than what you normally use, so your prompts have to do more of the work, and the interviewers
grade **how you work and what you prompt** as much as the result.

## Setup to mimic the interview

1. Clone, `npm install`, start Postgres, `npm run db:reset`. Do all of this *before* starting the timer.
2. In Cursor, pick the **smallest model available** (Claude Haiku if it's listed) and turn off auto/max mode.
3. Use **agent mode** once you've approved a plan. Don't leave the agent stuck in plan mode.
4. Set a **45-minute timer**. Open `TASKS.md` only when the timer starts.
5. Don't open `INTERVIEWER_NOTES.md` until you're done.

## Suggested 45 minutes

| Time | What |
| --- | --- |
| 0–6 | Read README + TASKS. Run `npm test` and `npm run typecheck`. Click through the app. Ask the agent for a map of the layers. |
| 6–20 | Task 1: reproduce, read the code, decide on the fix yourself, prompt for it, review the diff, run the tests. |
| 20–40 | Task 2 or Task 3 (say which and why). Plan → implement → test → review. |
| 40–45 | Run all checks, summarize what you did, what you'd do next, and any risks. |

## Prompt template

Write prompts the way you'd write a ticket for a junior engineer:

```
Goal:        <one sentence: what should be true when this is done>
Context:     <what you found: file + function, the symptom, why it happens>
Files:       <exact files it may change; what it must NOT touch>
Constraints: <follow the existing pattern in X; money is integer cents; parameterized SQL only;
              write in a transaction; don't change the schema/signature unless needed>
Done when:   <tests to add/pass, `npm test` + `npm run typecheck` green, behaviour to check by hand>
```

Example (for a feature, not a spoiler):

```
Goal: add GET /api/lps/:lpId returning one LP with commitment, called and unfunded.
Context: listLpBalances in src/db/queries/lps.ts already computes these per fund.
Files: src/db/queries/lps.ts, a new route in src/routes/lps.ts, test/lps.api.test.ts. Don't modify other routes.
Constraints: follow the route -> service -> query layering used by funds. 404 via NotFoundError. Parameterized SQL.
Done when: new tests for 200 + 404 pass, npm test and npm run typecheck are green.
```

Tips for a weak model:
- **One step per prompt.** "Add the query" → review → "add the service" → review. That beats one giant prompt.
- **Name files and functions explicitly.** Don't make it search.
- **Paste the error or failing test output** instead of describing it.
- **Ask it to explain before it edits** when you're unsure ("why does this sum drift?"). Then decide the fix yourself.
- **Reject and re-prompt** when a diff is too big or touches files you didn't name.

## Habits they're looking for

- **Narrate:** say what you think before you ask the agent ("I think it's per-LP rounding; let's confirm").
- **Review every diff**, especially money math and SQL. Read it out loud briefly.
- **Run `npm test` + `npm run typecheck` after every change.**
- **Commit per task** with a clear message.
- **Name tradeoffs and risks** you didn't have time to address (concurrency, idempotency, historical data).

## Afterwards

Export the chat, compare against `INTERVIEWER_NOTES.md`, and note: where you lost time, which prompts were vague,
and what you shipped without reviewing.
