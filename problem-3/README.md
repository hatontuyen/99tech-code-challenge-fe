# Problem 3 — Messy React: issues & refactor

- Full issue list below (ordered by severity: bugs → correctness risks → performance → maintainability).
- Refactored code: [`WalletPage.refactored.tsx`](./WalletPage.refactored.tsx)

**Assumptions:** `useWalletBalances`, `usePrices`, `WalletRow`, `Box`/`BoxProps` are provided elsewhere in the codebase (the snippet doesn't import them); the refactor keeps those contracts unchanged. The corrected filter intent is "show funded balances on known chains" — the original kept empty wallets and dropped funded ones, which I treat as a bug rather than a requirement.

---

## 1. Outright bugs (this code doesn't work)

### 1.1 `lhsPriority` is undefined — runtime crash
```ts
const balancePriority = getPriority(balance.blockchain);
if (lhsPriority > -99) {   // ❌ ReferenceError: lhsPriority is not defined
```
The variable is declared as `balancePriority` but referenced as `lhsPriority`. The first render throws. **Fix:** use `balancePriority`.

### 1.2 The filter logic is inverted — keeps empty wallets, drops funded ones
```ts
if (balancePriority > -99) {
  if (balance.amount <= 0) {
    return true;      // ❌ keeps only zero/negative balances
  }
}
return false;         // ❌ drops every positive balance
```
A wallet page that only shows balances you *don't* have. **Fix:** `return balancePriority > -99 && balance.amount > 0`.

### 1.3 `balance.blockchain` does not exist on `WalletBalance`
```ts
interface WalletBalance {
  currency: string;
  amount: number;      // ❌ no `blockchain` field
}
```
`getPriority(balance.blockchain)` is a type error; the code only compiles because `getPriority` accepts `any` (see 2.1). **Fix:** add `blockchain: Blockchain` to the interface.

### 1.4 `rows` maps `sortedBalances` but pretends it's `FormattedWalletBalance`
```ts
const rows = sortedBalances.map((balance: FormattedWalletBalance, ...) => {
  ...
  formattedAmount={balance.formatted}   // ❌ undefined — formatting never applied
```
`formattedBalances` is computed and then **never used**; `rows` reads `.formatted` off objects that don't have it. The type annotation silences the compiler instead of fixing the data flow. **Fix:** map over the formatted array (or format inline in one pass).

### 1.5 `classes` is undefined
`className={classes.row}` — `classes` is never imported or created. Another ReferenceError.

---

## 2. Correctness risks

### 2.1 `getPriority(blockchain: any)` throws away type safety
`any` is what allowed bug 1.3 to compile. **Fix:** a `Blockchain` union type and a `Record<Blockchain, number>` lookup — the compiler then guarantees exhaustiveness, and a lookup table is easier to maintain than a `switch`.

### 2.2 The sort comparator has no return for the equal case
```ts
if (leftPriority > rightPriority) return -1;
else if (rightPriority > leftPriority) return 1;
// ❌ implicitly returns undefined when equal
```
Returning `undefined` violates the comparator's declared contract (must return a number) — TypeScript with `noImplicitReturns` rejects this outright. At runtime it happens to work by accident: the spec coerces `undefined` → `NaN` → `+0` ("elements are equal"), and sort is guaranteed stable since ES2019 — but the code is *relying on an obscure coercion chain* instead of stating the intent, and Zilliqa and Neo share priority 20, so this path *is* hit: their relative order silently depends on input order rather than on any deliberate rule. **Fix:** `return rightPriority - leftPriority` (and add a deterministic tie-breaker, e.g. currency name).

### 2.3 `prices[balance.currency]` can be `undefined` → `NaN`
`usdValue = prices[balance.currency] * balance.amount` renders `NaN` for any token without a price. **Fix:** `(prices[balance.currency] ?? 0) * balance.amount`.

### 2.4 `key={index}` on a filtered + sorted list
Indexes change whenever balances/prices change order, causing React to mis-reconcile rows (wrong state/animation attached to wrong token, wasted re-renders). **Fix:** a stable identity — `key={\`${balance.blockchain}-${balance.currency}\`}`.

### 2.5 `toFixed()` with no argument
Rounds to **0 decimal places** — a 0.95 ETH balance displays as "1". For a finance UI this is a real correctness issue, not cosmetics. **Fix:** explicit decimals or `Intl.NumberFormat`.

---

## 3. Computational inefficiencies

### 3.1 `getPriority` is called O(n log n) times
It runs once per element in `filter`, then **twice per comparison** in `sort`. **Fix:** compute the priority once per balance (decorate → sort), or at minimum memoize per item.

### 3.2 `useMemo` has a wrong dependency: `prices`
The memoized computation never reads `prices`, but lists it as a dependency — so every price tick (which for crypto prices is constant) re-filters and re-sorts the entire list for nothing. This is the single biggest *real-world* perf issue here. **Fix:** depend on `[balances]` only.

### 3.3 `formattedBalances` and `rows` are rebuilt every render, and one is dead code
`formattedBalances` is pure waste (never used — see 1.4). `rows` re-runs on every render even when nothing changed. **Fix:** delete the dead computation and memoize the *expensive* work (filter/sort/format). The per-row map itself is O(n) cheap and deliberately stays at render, so the price-dependent `usdValue` never drags `prices` into the pipeline's dependencies (see Refactor summary #2).

### 3.4 `getPriority` is re-created every render
It's a pure function with no closure over props/state — it should live outside the component (module scope), not be reallocated per render.

---

## 4. Maintainability / idiom

- **`React.FC<Props>` + `(props: Props)`** — double annotation; `React.FC` is also discouraged (implicit `children`, blocks generics). Type the props destructure directly.
- **`children` is destructured and never rendered** — either render it or don't accept it.
- **`interface Props extends BoxProps {}`** — an empty interface adds a name with no information; use `BoxProps` directly (or `type Props = BoxProps`).
- **`FormattedWalletBalance` duplicates `WalletBalance`** — should be `interface FormattedWalletBalance extends WalletBalance { formatted: string }` so the two can't drift apart.
- **Spreading `{...rest}` onto a raw `<div>`** — `BoxProps` presumably targets a `<Box>`; passing arbitrary system props to a plain div silently drops them.

---

## Refactor summary

The refactored version ([`WalletPage.refactored.tsx`](./WalletPage.refactored.tsx)):

1. Fixes all five bugs (filter logic, undefined vars, missing field, unused formatting, undefined `classes`).
2. Collapses the list work into **one memoized pipeline** (decorate → filter → sort) with priorities computed exactly once per item, depending on `balances` only. USD value — the sole price-dependent number — is computed at render time, so a price tick re-multiplies n numbers but never re-runs the filter/sort/format (the §3.2 issue stays fixed instead of being reintroduced under a now-"legitimate" dependency).
3. Replaces the `switch`/`any` with a typed `Record<Blockchain, number>` at module scope.
4. Uses stable keys, guards missing prices, formats with explicit precision.
