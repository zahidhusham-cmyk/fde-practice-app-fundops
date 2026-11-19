# Tasks

> **Format:** 45 minutes, shared screen, AI agent allowed. You're not expected to finish everything.
> Pick the work in order unless told otherwise. Explain what you're doing and why as you go.

> **Running a realistic Tenex-style session:** start each practice run on a fresh branch off `main`
> (`git switch main && git pull && git switch -c practice/<task>-<date>`, then `npm run db:reset`). Pick **one**
> standalone feature from Tasks 5–9 below, set a **45-minute timer**, and use the smallest model available
> (Haiku). Spend the first few minutes exploring the codebase before you prompt anything.
> On `main`, `npm test` has one known failure, which belongs to Task 1. If you're doing Tasks 5–9, leave it alone and
> don't add any new failures.

---

**From:** Priya Raman, Head of Fund Operations
**Subject:** A few things for the fund ops tool

Hi,

Thanks for picking this up. You'll be working on the internal tool the ops team uses to run capital calls and
investor statements. The README explains the terms if they're new to you. Here's what's on our list:

### 1. Capital call allocations don't add up

Our controller was reconciling last quarter and says the per-investor amounts on some capital calls don't add
up to the amount we actually called. It's only small amounts, but our LPs' accountants notice small amounts.
Could you work out what's going on, fix it, and make sure it can't quietly come back?

### 2. Record distributions from the app

Right now distributions only get into the system when engineering loads them by hand. We'd like ops to record a
distribution for a fund from the fund page (date, amount, short description) and have it split across the
LPs the same way capital calls are. It should show up in the fund's distribution list and on each LP's numbers
straight away. Whatever was true of the capital call totals in item 1 needs to be true here too.

### 3. Don't call more than an investor committed

Nothing stops someone creating a call that asks an LP for more than they have left on their commitment. That
should never get through. If a call would do that, reject it with a clear error the ops team can act on,
and make sure the page shows that error.

### 4. (Stretch) Q3 statement question

One of our LPs emailed to say their Q3 statement is missing a capital call they definitely paid. Could you
take a look?

Thanks,
Priya

---

# Standalone features (one per 45-minute session)

Each of these stands on its own. You don't need to have done Tasks 1–4 first.

---

**From:** Priya Raman, Head of Fund Operations
**Subject:** Tracking who has actually paid a capital call

### 5. Track capital call payments (pending vs. paid)

When we issue a capital call, the tool tells us what each LP owes, but nothing tells us who has actually wired
the money. Right now Tom keeps that in a spreadsheet, and it's already wrong once this quarter.

We'd like to see, for a given call, which LPs have paid their share and which haven't, and to mark an LP's share
as paid when the wire lands, including the date it arrived. On the fund page we'd also like to see how much is
still outstanding, both per call and overall.

I'm not sure yet how this should interact with the "unfunded" numbers or the quarterly statements. Happy to talk
it through. I'm also not sure what we should do about the calls that are already in the system.

---

**From:** Priya Raman, Head of Fund Operations
**Subject:** New investor joining Growth Fund I

### 6. Onboard a new LP to a fund

We're admitting a new investor to one of our funds next month, and today the only way to add an LP is to ask
engineering. Could ops add a new LP with their commitment straight from the fund page?

Once they're in, they should be part of every future capital call and distribution split like everyone else.
The calls and distributions we've already made must not change. Those amounts have been sent to investors and
can't move.

---

**From:** Priya Raman, Head of Fund Operations
**Subject:** Recallable distributions

### 7. Recallable distributions

Some of the money we send back to LPs is "recallable": under the fund agreement we're allowed to call it again
later, so it goes back onto the LP's unfunded commitment. Normal profit distributions are not recallable and
don't change what an LP still owes us.

We need to be able to say whether a distribution is recallable, and for the fund page's unfunded numbers and the
LPs' quarterly statements to reflect that correctly. Some of the distributions already in the system were
recallable, so we need a way to flag existing ones as well as new ones.

---

**From:** Priya Raman, Head of Fund Operations
**Subject:** Management fees on quarterly statements

### 8. Quarterly management fees on LP statements

Each of our funds charges an annual management fee as a percentage of commitment. Today they're all 2.00% a year,
billed quarterly (so 0.50% a quarter), but the rate is set fund by fund and the next fund may be different.

LPs keep asking us to show the fee on their quarterly statement. Could the statement show the management fee for
that quarter, plus a net cash flow or summary line, so they can see the whole quarter at a glance? Our controller
will check these to the cent, so please make sure the numbers reconcile.

---

**From:** Priya Raman, Head of Fund Operations
**Subject:** Quarter-end: all LP statements in one place

### 9. Fund-wide quarterly statement summary & CSV export

At quarter end someone opens all eight LP statements for each fund one by one and copies the numbers into Excel.
It takes most of a morning and it's easy to get wrong.

Could we have a quarter summary for a fund that shows every LP's statement numbers for a chosen quarter on one
screen? We'd also like a "Download CSV" button on the fund page that gives us the same data as a file our
controller can open in Excel. The dollar amounts should look right, and it needs to cope with LP names that have
commas, quotes or ampersands in them. Some of our investors have very long legal names.

Thanks,
Priya
