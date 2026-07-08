/**
 * Problem 1: Three ways to sum to n
 * --------------------------------
 * Task: sum_to_n(5) === 1 + 2 + 3 + 4 + 5 === 15
 *
 * The task says `n` is "any integer", so each implementation also handles
 * n <= 0 in a consistent, documented way:
 *   - n === 0  -> 0
 *   - n  <  0  -> symmetric sum, i.e. sum_to_n(-5) === (-1) + (-2) + ... + (-5) === -15
 * This keeps the function total (no surprising NaN / infinite loop) and makes
 * sum_to_n an odd function: sum_to_n(-n) === -sum_to_n(n).
 */

/**
 * A) Closed-form arithmetic series (Gauss formula).
 *
 * Time:  O(1)
 * Space: O(1)
 *
 * This is the one you'd ship to production: constant time regardless of n,
 * no iteration, no stack usage. The multiplication n * (n + 1) stays exact,
 * but not because it fits in 2^53 — at the largest safe n it is ~2^54.
 * Above 2^53 doubles represent only *even* integers exactly, and a product
 * of two consecutive integers is always even, so the intermediate (2x the
 * result, result <= MAX_SAFE_INTEGER per the task) is exactly representable.
 * The test file pins this at the exact boundary (n = 134,217,727).
 */
var sum_to_n_a = function (n) {
  var sign = n < 0 ? -1 : 1;
  var m = Math.abs(n);
  return (sign * (m * (m + 1))) / 2;
};

/**
 * B) Iterative accumulation.
 *
 * Time:  O(n)
 * Space: O(1)
 *
 * The most literal translation of "summation to n". Worth having as a
 * reference implementation: it is trivially correct by inspection, so it
 * doubles as an oracle to test the clever versions against.
 */
var sum_to_n_b = function (n) {
  var sign = n < 0 ? -1 : 1;
  var m = Math.abs(n);
  var sum = 0;
  for (var i = 1; i <= m; i++) {
    sum += i;
  }
  return sign * sum;
};

/**
 * C) Recursion with a divide-and-conquer range sum.
 *
 * Time:  O(n) additions in total
 * Space: O(log n) call stack
 *
 * Instead of the naive `n + sum_to_n(n - 1)` (which blows the call stack
 * around n ~ 10^4 in most engines), this splits the range [lo, hi] in half
 * and recurses on each half. Depth is O(log n), so it comfortably handles
 * any n whose sum fits in a safe integer — while still being a genuinely
 * recursive, formula-free implementation.
 */
var sum_to_n_c = function (n) {
  var sign = n < 0 ? -1 : 1;
  var m = Math.abs(n);

  function rangeSum(lo, hi) {
    if (lo > hi) return 0;
    if (lo === hi) return lo;
    var mid = (lo + hi) >>> 1;
    return rangeSum(lo, mid) + rangeSum(mid + 1, hi);
  }

  return sign * rangeSum(1, m);
};

// Node/CommonJS export so the test file can import these; harmless in a browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sum_to_n_a, sum_to_n_b, sum_to_n_c };
}
