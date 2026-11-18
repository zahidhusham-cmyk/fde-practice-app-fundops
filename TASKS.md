# Tasks

> **Format:** 45 minutes, shared screen, AI agent allowed. You're not expected to finish everything.
> Pick the work in order unless told otherwise. Explain what you're doing and why as you go.

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
