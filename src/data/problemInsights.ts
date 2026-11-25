import { AlgorithmProblem } from './visualizerProblems';
import { SolverLanguage } from '../types';

export interface ProblemComplexityResult {
  time: string;
  space: string;
  notes: string[];
}

export interface ProblemSubmissionRecord {
  id: string;
  problemId: string;
  language: SolverLanguage;
  verdict:
    | 'Accepted'
    | 'Wrong Answer'
    | 'Runtime Error'
    | 'Compile Error'
    | 'Time Limit Exceeded';
  passedCount: number;
  totalCount: number;
  runtimeMs: number;
  code: string;
  complexity?: ProblemComplexityResult;
  createdAt: string;
}

const SUBMISSIONS_STORAGE_KEY = 'polyglotmesh_submissions_v1';

export function loadProblemSubmissions(problemId?: string): ProblemSubmissionRecord[] {
  try {
    const raw = window.localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(
      (item): item is ProblemSubmissionRecord =>
        Boolean(item && typeof item.id === 'string' && typeof item.problemId === 'string')
    );
    return problemId ? valid.filter((s) => s.problemId === problemId) : valid;
  } catch {
    return [];
  }
}

export function saveProblemSubmission(record: ProblemSubmissionRecord): ProblemSubmissionRecord[] {
  try {
    const existing = loadProblemSubmissions();
    const updated = [record, ...existing].slice(0, 250);
    window.localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(updated));
    return updated.filter((s) => s.problemId === record.problemId);
  } catch {
    return [record];
  }
}

/**
 * Deterministic Problem of the Day derived purely from today's YYYY-MM-DD key.
 */
export function getDailyChallengeProblem(
  problems: AlgorithmProblem[],
  date: Date = new Date()
): AlgorithmProblem {
  if (problems.length === 0) {
    throw new Error('Problem list is empty');
  }
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const seedStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i += 1) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const index = (hash >>> 0) % problems.length;
  return problems[index];
}

const CUSTOM_HINTS: Record<string, [string, string]> = {
  'two-sum': [
    'Instead of checking all O(n²) pairs with nested loops, think about what value you need to complete target - n as you scan once.',
    'Store each visited number and its index in a hash map so complement lookups run in O(1) average time.'
  ],
  'lc-217-contains-duplicate': [
    'Think about how you can detect whether an element was already seen in O(1) lookup time rather than comparing pairs.',
    'A hash set tracks distinct values encountered so far; returning early as soon as a duplicate appears gives O(n) time.'
  ],
  'lc-242-valid-anagram': [
    'Two strings are anagrams if and only if every character appears with the exact same multiplicity.',
    'Compare character frequency counts using a fixed 26-letter array or hash map after verifying both strings have equal length.'
  ],
  'lc-49-group-anagrams': [
    'Words belong to the same anagram group when they share a canonical signature.',
    'Use either the sorted character tuple or a 26-count character frequency tuple as the dictionary key.'
  ],
  'lc-125-valid-palindrome': [
    'Use two pointers starting at the left and right ends of the string moving inward.',
    'Skip non-alphanumeric characters at either pointer and compare lowercased characters without allocating a reversed copy for O(1) extra space.'
  ],
  'lc-15-3sum': [
    'Sorting the array first lets you avoid duplicate triplets and reduces the inner search to a sorted Two Sum problem.',
    'Fix one index i, skip duplicate values of nums[i], and run converging left/right pointers over the remaining suffix.'
  ],
  'lc-42-trapping-rain-water': [
    'Water trapped above bar i equals min(maxLeft[i], maxRight[i]) - height[i], clamped at 0.',
    'With two inward pointers tracking leftMax and rightMax, you can always commit the smaller boundary in O(1) space.'
  ],
  'lc-121-best-time-to-buy-and-sell-stock': [
    'To maximize sell - buy on a future day, track the lowest price seen before today.',
    'Maintain minPrice and bestProfit in a single left-to-right pass for O(n) time and O(1) space.'
  ],
  'lc-3-longest-substring-without-repeating-characters': [
    'Maintain a sliding window [left, right] invariant where every character inside the window is unique.',
    'Track each character’s last seen index so left can jump directly past any repeating character inside the current window.'
  ],
  'lc-20-valid-parentheses': [
    'The most recently opened unmatched bracket must be the very first one closed.',
    'Push opening brackets onto a stack (or map each opener to its expected closer) and ensure the stack is empty at the end.'
  ],
  'lc-704-binary-search': [
    'Because the input array is sorted, comparing the midpoint eliminates half of the remaining search interval each step.',
    'Keep inclusive bounds [lo, hi] with mid = lo + (hi - lo) // 2 and shrink strictly on every branch.'
  ],
  'lc-206-reverse-linked-list': [
    'Reversing a singly linked list in-place only requires redirecting each node.next pointer to its predecessor.',
    'Hold three references (prev, curr, nxt) so saving curr.next before rewiring prevents losing the rest of the list.'
  ],
  'lc-226-invert-binary-tree': [
    'Inverting a tree means swapping left and right children at every node.',
    'Apply DFS recursion (or BFS queue) to swap node.left and node.right and recursively invert both subtrees.'
  ],
  'lc-53-maximum-subarray': [
    'If the running subarray sum ending before index i is negative, carrying it forward only hurts the sum starting at i.',
    'Use Kadane’s algorithm: cur = max(num, cur + num) and update global best at each element.'
  ],
  'lc-322-coin-change': [
    'Think of minimum coins for amount x as 1 + min(dp[x - coin]) across valid coins.',
    'Build a 1-D DP array of size amount + 1 initialized to infinity (with dp[0] = 0) and iterate bottom-up.'
  ],
  'lc-200-number-of-islands': [
    'Each island corresponds to a 4-directionally connected component of "1" cells in the grid.',
    'Traverse the grid; whenever an unvisited "1" appears, increment count and flood-fill (DFS/BFS) to mark its whole component.'
  ],
  'container-with-most-water': [
    'Area is limited by the shorter vertical line: width * min(height[lo], height[hi]).',
    'Start widest at both ends and move the pointer pointing to the shorter line inward—moving the taller line can never improve min height while shrinking width.'
  ],
  'merge-intervals': [
    'Overlapping intervals become adjacent once all intervals are sorted by start time.',
    'Compare each interval’s start against the last merged interval’s end; extend the end on overlap, otherwise append.'
  ],
  'largest-island': [
    'Scan every cell; each unvisited land cell seeds a new connected component whose size you accumulate via DFS or BFS.',
    'Mark visited land cells as 0 (or in a visited set) so no cell is counted twice.'
  ],
  'lowest-common-ancestor': [
    'If two pointers start at different depths, swapping each pointer to the other starting node upon reaching root equalizes total path distance.',
    'Run the two-pointer synchronization loop until both references point to the exact same ancestor node.'
  ]
};

const CATEGORY_HINTS: Record<string, [string, string]> = {
  'Arrays & Hashing': [
    'Consider whether pre-indexing elements in a hash map or hash set eliminates nested linear scans.',
    'Frequency maps, prefix/suffix products, or canonical keys often reduce lookup overhead from O(n) to O(1).'
  ],
  'Two Pointers': [
    'Check if sorting or starting pointers at opposite ends (or slow/fast speeds) lets you shrink the candidate space linearly.',
    'Maintain a clear invariant explaining why discarding the left or right boundary cannot miss an optimal answer.'
  ],
  'Sliding Window': [
    'Expand the right boundary incrementally and shrink the left boundary only when the window invariant breaks.',
    'Track window frequencies or counts incrementally so adding/removing a boundary element stays O(1).'
  ],
  Stack: [
    'Use a LIFO stack when decisions depend on matching pairs, nested evaluation, or maintaining a monotonic sequence.',
    'With monotonic stacks, pop elements whose invariant is violated by the incoming element—each item enters and leaves at most once.'
  ],
  'Binary Search': [
    'Look for a monotonic predicate f(mid) where all values below a boundary evaluate false and above evaluate true.',
    'Verify inclusive vs. exclusive loop bounds carefully so the search space shrinks strictly without infinite loops.'
  ],
  Intervals: [
    'Sort intervals by start time (or end time for greedy removal) so overlaps can be inspected in a single sweep.',
    'Track the active boundary end or use a min-heap keyed by earliest ending interval.'
  ],
  'Linked List': [
    'Use a dummy sentinel head node whenever the head itself might be modified, removed, or merged.',
    'Fast/slow pointers (2x vs 1x speed) or reversing in-place with prev/curr/nxt solve cycle, midpoint, and reorder problems in O(1) space.'
  ],
  Trees: [
    'Frame the problem recursively: what value must a subtree return to its parent, and what global state updates per node?',
    'Use BFS (deque level-by-level) for depth/right-side views, or recursive DFS for height, path, and BST range invariants.'
  ],
  'Heap / Priority Queue': [
    'Use a min-heap or max-heap whenever you repeatedly query the top-K, smallest, or largest element dynamically.',
    'In Python, negate values for a max-heap with heapq; keep heap size bounded to K when only K elements matter.'
  ],
  Greedy: [
    'Test whether making the locally optimal boundary choice (farthest reach, earliest finish, running prefix) preserves global feasibility.',
    'Reset or advance your greedy state whenever the running aggregate turns unfavorable.'
  ],
  Backtracking: [
    'Model the search as a decision tree: choose an option, recurse deeper, and undo (pop/unmark) before trying the next branch.',
    'Sort the input first if duplicates must be skipped at the same recursion level.'
  ],
  Tries: [
    'Store shared string prefixes in a character-keyed tree with an end-of-word marker on terminal nodes.',
    'Wildcard searches branch cleanly over children at "." while exact characters follow a single dictionary edge.'
  ],
  Graphs: [
    'Represent edges as an adjacency list and maintain a visited set to avoid revisiting nodes in cyclic graphs.',
    'Use BFS for shortest unweighted paths / multi-source level spread, DFS for components, and Kahn’s in-degree queue for topological order.'
  ],
  'Advanced Graphs': [
    'Select the right graph primitive: Dijkstra + min-heap for positive weights, Bellman-Ford/BFS with stop counts for bounded flights, or Union-Find / Prim for MST.',
    'Track best distance per state and skip stale heap entries whose popped distance exceeds the recorded optimum.'
  ],
  'Math & Geometry': [
    'Look for clean coordinate invariants, cycle detection via fast/slow steps, or layer-by-layer matrix boundary traversal.',
    'Handle carries, signs, and edge cases like zero or negative exponents explicitly.'
  ],
  '1-D Dynamic Programming': [
    'Define dp[i] clearly in words (e.g., best answer using prefix 0..i or exact state i) and write the recurrence from smaller subproblems.',
    'Notice when dp[i] only depends on dp[i - 1] and dp[i - 2]—you can often compress memory to O(1).'
  ],
  '2-D Dynamic Programming': [
    'Model subproblems on two indices (i, j) across two strings, grid coordinates, or (index, capacity/state).',
    'Initialize base border rows/columns for empty prefixes before filling transitions row by row.'
  ],
  'Bit Manipulation': [
    'Use XOR properties (x ^ x = 0, x ^ 0 = x) to cancel duplicates and isolate missing or unique numbers.',
    'Remember n & (n - 1) clears the lowest set bit, and shifts/masks extract individual bits cleanly.'
  ]
};

/**
 * Generates concise conceptual hints (zero code spoilers).
 */
export function getProblemHints(problem: AlgorithmProblem): [string, string] {
  if (CUSTOM_HINTS[problem.id]) {
    return CUSTOM_HINTS[problem.id];
  }
  const cat = problem.category || problem.topics[0] || '';
  if (CATEGORY_HINTS[cat]) {
    return CATEGORY_HINTS[cat];
  }
  return [
    `Identify the bottleneck in a brute-force solution and check how ${problem.topics.slice(0, 2).join(' / ')} reduces repeated work.`,
    'Trace the smallest edge case (empty, single element, or duplicate values) before coding the main loop or recurrence.'
  ];
}
