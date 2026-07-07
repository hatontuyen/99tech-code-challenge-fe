# Problem 1 — Three ways to sum to n

## Files

- [`sum_to_n.js`](./sum_to_n.js) — the three implementations
- [`sum_to_n.test.js`](./sum_to_n.test.js) — zero-dependency test suite (`node sum_to_n.test.js`)

## The three implementations

| | Approach | Time | Space | When you'd pick it |
|---|---|---|---|---|
| `sum_to_n_a` | Gauss closed-form `n(n+1)/2` | O(1) | O(1) | Production. Constant time, no iteration. |
| `sum_to_n_b` | Iterative loop | O(n) | O(1) | Reference/oracle — trivially correct by inspection, used to validate the others. |
| `sum_to_n_c` | Divide-and-conquer recursion | O(n) | O(log n) stack | Demonstrates recursion **without** the stack-overflow trap of naive `n + f(n-1)`, which crashes around n ≈ 10⁴. |

## Assumptions (declared per the challenge instructions)

The spec doesn't define behavior for `n <= 0` while stating the input is *any* integer. Rather than leave it undefined (infinite loop / garbage, depending on implementation), I chose the least surprising extension — summation *from the origin toward n* — and made all three implementations consistent with it. In a real ticket I'd confirm this expectation with the spec author first.

## Design decisions

**"Any integer" is taken seriously.** The spec says the input is *any* integer, so all three handle `n <= 0` consistently instead of looping forever or returning garbage:

- `sum_to_n(0) === 0`
- `sum_to_n(-5) === -15` (symmetric: `sum_to_n(-n) === -sum_to_n(n)`)

**Safe-integer reasoning is documented, not assumed.** The closed form computes `n * (n + 1)` before dividing; that intermediate is exactly 2× the final result, so if the result fits in `Number.MAX_SAFE_INTEGER` (guaranteed by the task), the intermediate is still exact.

**The implementations verify each other.** The test file cross-checks all three on fixed edge cases plus 500 randomized inputs, and asserts the odd-function property `f(-n) === -f(n)`.

## Run it

```bash
node sum_to_n.test.js
# PASS all 9 fixed cases + 500 randomized property checks (x3 implementations)
```
