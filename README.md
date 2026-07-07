# 99Tech Code Challenge — Frontend

| Problem | Solution | Highlights |
|---|---|---|
| [Problem 1](./problem-1) — Three ways to sum to n | `sum_to_n.js` + zero-dep test suite | O(1) closed form, O(n) oracle, stack-safe O(log n)-depth recursion; handles *any* integer (incl. negatives) as the spec states; 500 randomized cross-checks |
| [Problem 2](./problem-2) — Currency swap form | Vite + React 18 + strict TS, no UI libraries | Live Switcheo prices (deduped), bi-directional quoting, searchable token picker with keyboard nav, fee/min-received breakdown, all 4 network states designed, a11y. Flows verified end-to-end with Playwright |
| [Problem 3](./problem-3) — Messy React | Issue analysis + refactor | 5 outright bugs, 5 correctness risks, 4 perf issues identified and explained, each with the fix; single memoized pipeline refactor |

## Quick start

```bash
# Problem 1
node problem-1/sum_to_n.test.js

# Problem 2
cd problem-2 && npm install && npm run dev
npm run e2e    # 8 Playwright end-to-end tests (starts the dev server itself)

# Problem 3
open problem-3/README.md
```
