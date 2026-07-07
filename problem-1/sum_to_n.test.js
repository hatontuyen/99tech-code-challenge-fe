/**
 * Zero-dependency test runner: `node sum_to_n.test.js`
 * Cross-checks all three implementations against each other and against
 * known values, including edge cases (0, negatives, large n).
 */
const { sum_to_n_a, sum_to_n_b, sum_to_n_c } = require('./sum_to_n');

const impls = { sum_to_n_a, sum_to_n_b, sum_to_n_c };

const cases = [
  [0, 0],
  [1, 1],
  [2, 3],
  [5, 15],
  [10, 55],
  [100, 5050],
  [-1, -1],
  [-5, -15],
  [1_000_000, 500000500000],
];

let failures = 0;

for (const [n, expected] of cases) {
  for (const [name, fn] of Object.entries(impls)) {
    const actual = fn(n);
    if (actual !== expected) {
      failures++;
      console.error(`FAIL ${name}(${n}) = ${actual}, expected ${expected}`);
    }
  }
}

// Property check: all three agree on random integers, and f(-n) === -f(n).
for (let i = 0; i < 500; i++) {
  const n = Math.floor(Math.random() * 200_000) - 100_000;
  const a = sum_to_n_a(n);
  if (sum_to_n_b(n) !== a || sum_to_n_c(n) !== a) {
    failures++;
    console.error(`FAIL implementations disagree at n=${n}`);
  }
  if (sum_to_n_a(-n) !== -a) {
    failures++;
    console.error(`FAIL odd-function property violated at n=${n}`);
  }
}

if (failures === 0) {
  console.log(`PASS all ${cases.length} fixed cases + 500 randomized property checks (x3 implementations)`);
  process.exit(0);
} else {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
