import { SupportedLanguage } from '../types';
import { CURRICULUM_PROBLEMS, CURRICULUM_CATEGORIES } from './curriculumProblems';

export interface TwoSumStep {
  step: number;
  activeLinePy: number;
  activeLineJs: number;
  i: number | null;
  n: number | null;
  need: number | null;
  seen: Array<{ key: number; value: number }>;
  checkingKey: number | null;
  hitPair: [number, number] | null;
  returnValue: [number, number] | null;
  caption: string;
}

export interface LinkedListStep {
  step: number;
  slow: number | null;
  fast: number | null;
  reversedFrom: number | null;
  leftPtr: number | null;
  rightPtr: number | null;
  matchedIndices: number[];
  caption: string;
}

export interface IntervalBar {
  id: string;
  label: string;
  start: number;
  end: number;
  state: 'idle' | 'active' | 'merged' | 'dim';
}

export interface MergeIntervalsStep {
  step: number;
  rows: IntervalBar[];
  merged: Array<{ start: number; end: number; highlight?: boolean }>;
  caption: string;
}

export interface WaterStep {
  step: number;
  lo: number;
  hi: number;
  area: number;
  largestArea: number;
  waterHeight: number;
  caption: string;
}

export interface IslandStep {
  step: number;
  activeCell: [number, number] | null;
  visitedLand: string[];
  currentIsland: string[];
  scannedWater: string[];
  currentSize: number;
  largestSize: number;
  caption: string;
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface AlgorithmProblem {
  id: string;
  week?: number;
  category?: string;
  leetcodeNumber?: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string[];
  description: string;
  examples: ProblemExample[];
  expectedPrintSubstring: string;
  hasVisualiser?: boolean;
  illustrationKey?: 'two-sum' | 'palindrome' | 'merge-intervals' | 'water' | 'island' | 'lca';
  pythonCode: string;
  javascriptCode: string;
}

export const TWO_SUM_NUMS = [11, 2, 15, 7, 8, 1];
export const TWO_SUM_TARGET = 10;

export const TWO_SUM_PYTHON = `def twoSum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    raise ValueError('no answer')

print(twoSum([11, 2, 15, 7, 8, 1], 10))`;

export const TWO_SUM_JS = `function twoSum(nums, target) {
  const seen = {};
  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    if ((target - n) in seen) {
      return [seen[target - n], i];
    }
    seen[n] = i;
  }
  throw new Error('no answer');
}

console.log(JSON.stringify(twoSum([11, 2, 15, 7, 8, 1], 10)));`;

export const TWO_SUM_STEPS: TwoSumStep[] = [
  {
    step: 1,
    activeLinePy: 2,
    activeLineJs: 2,
    i: null,
    n: null,
    need: null,
    seen: [],
    checkingKey: null,
    hitPair: null,
    returnValue: null,
    caption: 'Initialize empty hash table seen = {}'
  },
  {
    step: 2,
    activeLinePy: 3,
    activeLineJs: 3,
    i: 0,
    n: 11,
    need: null,
    seen: [],
    checkingKey: null,
    hitPair: null,
    returnValue: null,
    caption: 'Iteration i = 0, element n = 11'
  },
  {
    step: 3,
    activeLinePy: 4,
    activeLineJs: 5,
    i: 0,
    n: 11,
    need: -1,
    seen: [],
    checkingKey: -1,
    hitPair: null,
    returnValue: null,
    caption: 'Check complement 10 - 11 = -1 in seen -> False'
  },
  {
    step: 4,
    activeLinePy: 6,
    activeLineJs: 8,
    i: 0,
    n: 11,
    need: -1,
    seen: [{ key: 11, value: 0 }],
    checkingKey: null,
    hitPair: null,
    returnValue: null,
    caption: 'Record value in hash map: seen[11] = 0'
  },
  {
    step: 5,
    activeLinePy: 3,
    activeLineJs: 3,
    i: 1,
    n: 2,
    need: null,
    seen: [{ key: 11, value: 0 }],
    checkingKey: null,
    hitPair: null,
    returnValue: null,
    caption: 'Iteration i = 1, element n = 2'
  },
  {
    step: 6,
    activeLinePy: 4,
    activeLineJs: 5,
    i: 1,
    n: 2,
    need: 8,
    seen: [{ key: 11, value: 0 }],
    checkingKey: 8,
    hitPair: null,
    returnValue: null,
    caption: 'Check complement 10 - 2 = 8 in seen -> False'
  },
  {
    step: 7,
    activeLinePy: 6,
    activeLineJs: 8,
    i: 1,
    n: 2,
    need: 8,
    seen: [
      { key: 11, value: 0 },
      { key: 2, value: 1 }
    ],
    checkingKey: null,
    hitPair: null,
    returnValue: null,
    caption: 'Record value in hash map: seen[2] = 1'
  },
  {
    step: 8,
    activeLinePy: 3,
    activeLineJs: 3,
    i: 2,
    n: 15,
    need: null,
    seen: [
      { key: 11, value: 0 },
      { key: 2, value: 1 }
    ],
    checkingKey: null,
    hitPair: null,
    returnValue: null,
    caption: 'Iteration i = 2, element n = 15'
  },
  {
    step: 9,
    activeLinePy: 4,
    activeLineJs: 5,
    i: 2,
    n: 15,
    need: -5,
    seen: [
      { key: 11, value: 0 },
      { key: 2, value: 1 }
    ],
    checkingKey: -5,
    hitPair: null,
    returnValue: null,
    caption: 'Check complement 10 - 15 = -5 in seen -> False'
  },
  {
    step: 10,
    activeLinePy: 6,
    activeLineJs: 8,
    i: 2,
    n: 15,
    need: -5,
    seen: [
      { key: 11, value: 0 },
      { key: 2, value: 1 },
      { key: 15, value: 2 }
    ],
    checkingKey: null,
    hitPair: null,
    returnValue: null,
    caption: 'Record value in hash map: seen[15] = 2'
  },
  {
    step: 11,
    activeLinePy: 3,
    activeLineJs: 3,
    i: 3,
    n: 7,
    need: null,
    seen: [
      { key: 11, value: 0 },
      { key: 2, value: 1 },
      { key: 15, value: 2 }
    ],
    checkingKey: null,
    hitPair: null,
    returnValue: null,
    caption: 'Iteration i = 3, element n = 7'
  },
  {
    step: 12,
    activeLinePy: 4,
    activeLineJs: 5,
    i: 3,
    n: 7,
    need: 3,
    seen: [
      { key: 11, value: 0 },
      { key: 2, value: 1 },
      { key: 15, value: 2 }
    ],
    checkingKey: 3,
    hitPair: null,
    returnValue: null,
    caption: 'Check complement 10 - 7 = 3 in seen -> False'
  },
  {
    step: 13,
    activeLinePy: 6,
    activeLineJs: 8,
    i: 3,
    n: 7,
    need: 3,
    seen: [
      { key: 11, value: 0 },
      { key: 2, value: 1 },
      { key: 15, value: 2 },
      { key: 7, value: 3 }
    ],
    checkingKey: null,
    hitPair: null,
    returnValue: null,
    caption: 'Record value in hash map: seen[7] = 3'
  },
  {
    step: 14,
    activeLinePy: 3,
    activeLineJs: 3,
    i: 4,
    n: 8,
    need: null,
    seen: [
      { key: 11, value: 0 },
      { key: 2, value: 1 },
      { key: 15, value: 2 },
      { key: 7, value: 3 }
    ],
    checkingKey: null,
    hitPair: null,
    returnValue: null,
    caption: 'Iteration i = 4, element n = 8'
  },
  {
    step: 15,
    activeLinePy: 4,
    activeLineJs: 5,
    i: 4,
    n: 8,
    need: 2,
    seen: [
      { key: 11, value: 0 },
      { key: 2, value: 1 },
      { key: 15, value: 2 },
      { key: 7, value: 3 }
    ],
    checkingKey: 2,
    hitPair: [1, 4],
    returnValue: null,
    caption: 'Match found: complement 10 - 8 = 2 exists at seen[2] = 1'
  },
  {
    step: 16,
    activeLinePy: 5,
    activeLineJs: 6,
    i: 4,
    n: 8,
    need: 2,
    seen: [
      { key: 11, value: 0 },
      { key: 2, value: 1 },
      { key: 15, value: 2 },
      { key: 7, value: 3 }
    ],
    checkingKey: 2,
    hitPair: [1, 4],
    returnValue: [1, 4],
    caption: 'Return [seen[2], 4] -> [1, 4] (2 + 8 = 10)'
  }
];

export const PALINDROME_LIST_NODES = [1, 2, 3, 2, 1];

export const PALINDROME_LIST_STEPS: LinkedListStep[] = [
  {
    step: 1,
    slow: 0,
    fast: 0,
    reversedFrom: null,
    leftPtr: null,
    rightPtr: null,
    matchedIndices: [],
    caption: 'move slow 1 step, fast 2 steps'
  },
  {
    step: 2,
    slow: 1,
    fast: 2,
    reversedFrom: null,
    leftPtr: null,
    rightPtr: null,
    matchedIndices: [],
    caption: 'move slow 1 step, fast 2 steps'
  },
  {
    step: 3,
    slow: 2,
    fast: 4,
    reversedFrom: null,
    leftPtr: null,
    rightPtr: null,
    matchedIndices: [],
    caption: 'fast reached tail; slow points at middle node (3)'
  },
  {
    step: 4,
    slow: 2,
    fast: null,
    reversedFrom: 3,
    leftPtr: null,
    rightPtr: null,
    matchedIndices: [],
    caption: 'reverse pointers in second half starting from middle'
  },
  {
    step: 5,
    slow: null,
    fast: null,
    reversedFrom: 2,
    leftPtr: 0,
    rightPtr: 4,
    matchedIndices: [],
    caption: 'compare head (1) and reversed tail (1)'
  },
  {
    step: 6,
    slow: null,
    fast: null,
    reversedFrom: 2,
    leftPtr: 1,
    rightPtr: 3,
    matchedIndices: [0, 4],
    caption: 'values match (1 == 1); advance pointers inward'
  },
  {
    step: 7,
    slow: null,
    fast: null,
    reversedFrom: 2,
    leftPtr: 2,
    rightPtr: 2,
    matchedIndices: [0, 1, 3, 4],
    caption: 'values match (2 == 2); pointers meet at center (3)'
  },
  {
    step: 8,
    slow: null,
    fast: null,
    reversedFrom: 2,
    leftPtr: null,
    rightPtr: null,
    matchedIndices: [0, 1, 2, 3, 4],
    caption: 'All halves match -> return True'
  }
];

export const MERGE_INTERVALS_STEPS: MergeIntervalsStep[] = [
  {
    step: 1,
    rows: [
      { id: 'a', label: '[2, 6]', start: 2, end: 6, state: 'idle' },
      { id: 'b', label: '[15, 18]', start: 15, end: 18, state: 'idle' },
      { id: 'c', label: '[1, 3]', start: 1, end: 3, state: 'idle' },
      { id: 'd', label: '[8, 10]', start: 8, end: 10, state: 'idle' }
    ],
    merged: [],
    caption: 'Sort the intervals'
  },
  {
    step: 2,
    rows: [
      { id: 'c', label: '[1, 3]', start: 1, end: 3, state: 'active' },
      { id: 'a', label: '[2, 6]', start: 2, end: 6, state: 'idle' },
      { id: 'd', label: '[8, 10]', start: 8, end: 10, state: 'idle' },
      { id: 'b', label: '[15, 18]', start: 15, end: 18, state: 'idle' }
    ],
    merged: [{ start: 1, end: 3, highlight: true }],
    caption: 'Sorted by start coordinate; push [1, 3] to merged'
  },
  {
    step: 3,
    rows: [
      { id: 'c', label: '[1, 3]', start: 1, end: 3, state: 'merged' },
      { id: 'a', label: '[2, 6]', start: 2, end: 6, state: 'active' },
      { id: 'd', label: '[8, 10]', start: 8, end: 10, state: 'idle' },
      { id: 'b', label: '[15, 18]', start: 15, end: 18, state: 'idle' }
    ],
    merged: [{ start: 1, end: 6, highlight: true }],
    caption: '[2, 6] overlaps [1, 3] (2 <= 3) -> extend to [1, 6]'
  },
  {
    step: 4,
    rows: [
      { id: 'c', label: '[1, 3]', start: 1, end: 3, state: 'dim' },
      { id: 'a', label: '[2, 6]', start: 2, end: 6, state: 'dim' },
      { id: 'd', label: '[8, 10]', start: 8, end: 10, state: 'active' },
      { id: 'b', label: '[15, 18]', start: 15, end: 18, state: 'idle' }
    ],
    merged: [
      { start: 1, end: 6 },
      { start: 8, end: 10, highlight: true }
    ],
    caption: '[8, 10] does not overlap [1, 6] (8 > 6) -> append [8, 10]'
  },
  {
    step: 5,
    rows: [
      { id: 'c', label: '[1, 3]', start: 1, end: 3, state: 'dim' },
      { id: 'a', label: '[2, 6]', start: 2, end: 6, state: 'dim' },
      { id: 'd', label: '[8, 10]', start: 8, end: 10, state: 'dim' },
      { id: 'b', label: '[15, 18]', start: 15, end: 18, state: 'active' }
    ],
    merged: [
      { start: 1, end: 6 },
      { start: 8, end: 10 },
      { start: 15, end: 18, highlight: true }
    ],
    caption: '[15, 18] does not overlap [8, 10] -> append [15, 18]'
  },
  {
    step: 6,
    rows: [
      { id: 'c', label: '[1, 3]', start: 1, end: 3, state: 'merged' },
      { id: 'a', label: '[2, 6]', start: 2, end: 6, state: 'merged' },
      { id: 'd', label: '[8, 10]', start: 8, end: 10, state: 'merged' },
      { id: 'b', label: '[15, 18]', start: 15, end: 18, state: 'merged' }
    ],
    merged: [
      { start: 1, end: 6, highlight: true },
      { start: 8, end: 10, highlight: true },
      { start: 15, end: 18, highlight: true }
    ],
    caption: 'Done -> [[1, 6], [8, 10], [15, 18]]'
  }
];

export const WATER_BARS = [2, 9, 4, 1, 7, 3];

export const WATER_STEPS: WaterStep[] = [
  {
    step: 1,
    lo: 0,
    hi: 5,
    area: 10,
    largestArea: 10,
    waterHeight: 2,
    caption: 'area = 5 * 2 = 10, largest_area = 10'
  },
  {
    step: 2,
    lo: 1,
    hi: 5,
    area: 12,
    largestArea: 12,
    waterHeight: 3,
    caption: 'area = 4 * 3 = 12, largest_area = 12'
  },
  {
    step: 3,
    lo: 1,
    hi: 4,
    area: 21,
    largestArea: 21,
    waterHeight: 7,
    caption: 'area = 3 * 7 = 21, largest_area = 21'
  },
  {
    step: 4,
    lo: 1,
    hi: 3,
    area: 2,
    largestArea: 21,
    waterHeight: 1,
    caption: 'area = 2 * 1 = 2, largest_area = 21'
  },
  {
    step: 5,
    lo: 1,
    hi: 2,
    area: 4,
    largestArea: 21,
    waterHeight: 4,
    caption: 'area = 1 * 4 = 4, largest_area = 21'
  },
  {
    step: 6,
    lo: 1,
    hi: 1,
    area: 0,
    largestArea: 21,
    waterHeight: 0,
    caption: 'pointers meet; largest_area = 21'
  }
];

export const ISLAND_GRID = [
  [1, 1, 0, 0],
  [1, 0, 0, 1],
  [0, 0, 1, 1],
  [0, 0, 1, 0]
];

function buildIslandSteps(): IslandStep[] {
  const rows = ISLAND_GRID.length;
  const cols = ISLAND_GRID[0].length;
  const visited = new Set<string>();
  const scannedWater = new Set<string>();
  const steps: IslandStep[] = [];
  let largestSize = 0;

  const key = (r: number, c: number) => `${r},${c}`;

  const dfs = (r: number, c: number, currentIsland: Set<string>) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return 0;
    const k = key(r, c);
    if (ISLAND_GRID[r][c] === 0) {
      scannedWater.add(k);
      steps.push({
        step: steps.length + 1,
        activeCell: [r, c],
        visitedLand: Array.from(visited),
        currentIsland: Array.from(currentIsland),
        scannedWater: Array.from(scannedWater),
        currentSize: currentIsland.size,
        largestSize,
        caption: `water at (${r}, ${c}), size = ${currentIsland.size}`
      });
      return 0;
    }
    if (visited.has(k)) return 0;

    visited.add(k);
    currentIsland.add(k);
    largestSize = Math.max(largestSize, currentIsland.size);
    steps.push({
      step: steps.length + 1,
      activeCell: [r, c],
      visitedLand: Array.from(visited),
      currentIsland: Array.from(currentIsland),
      scannedWater: Array.from(scannedWater),
      currentSize: currentIsland.size,
      largestSize,
      caption: `land, size = ${currentIsland.size}`
    });

    dfs(r, c + 1, currentIsland);
    dfs(r + 1, c, currentIsland);
    dfs(r, c - 1, currentIsland);
    dfs(r - 1, c, currentIsland);
    return currentIsland.size;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = key(r, c);
      if (ISLAND_GRID[r][c] === 1 && !visited.has(k)) {
        const islandSet = new Set<string>();
        dfs(r, c, islandSet);
      } else if (ISLAND_GRID[r][c] === 0 && !scannedWater.has(k)) {
        scannedWater.add(k);
        steps.push({
          step: steps.length + 1,
          activeCell: [r, c],
          visitedLand: Array.from(visited),
          currentIsland: [],
          scannedWater: Array.from(scannedWater),
          currentSize: 0,
          largestSize,
          caption: `scan (${r}, ${c}): water (0), largest = ${largestSize}`
        });
      }
    }
  }

  steps.push({
    step: steps.length + 1,
    activeCell: null,
    visitedLand: Array.from(visited),
    currentIsland: ['1,3', '2,3', '2,2', '3,2'],
    scannedWater: Array.from(scannedWater),
    currentSize: largestSize,
    largestSize,
    caption: `DFS complete -> largest island size = ${largestSize}`
  });

  return steps;
}

export const ISLAND_STEPS: IslandStep[] = buildIslandSteps();

export const ALL_TOPICS: string[] = [...CURRICULUM_CATEGORIES];

const FEATURED_PROBLEMS: AlgorithmProblem[] = [
  {
    id: 'two-sum',
    week: 1,
    category: 'Arrays & Hashing',
    leetcodeNumber: 1,
    title: 'Two Sum',
    difficulty: 'easy',
    topics: ['Arrays & Hashing', 'Array', 'Hash table'],
    description:
      'Given an array of integers nums and an integer target, return the indexes of the two numbers that add up to target.',
    examples: [
      {
        input: 'nums = [11, 2, 15, 7, 8, 1], target = 10',
        output: '[1, 4]',
        explanation: 'nums[1] + nums[4] == 2 + 8 == 10'
      }
    ],
    expectedPrintSubstring: '[1, 4]',
    hasVisualiser: true,
    illustrationKey: 'two-sum',
    pythonCode: TWO_SUM_PYTHON,
    javascriptCode: TWO_SUM_JS
  },
  {
    id: 'move-zeroes',
    title: 'Move Zeroes',
    difficulty: 'easy',
    topics: ['Two Pointers', 'Array', 'Two pointers'],
    description:
      'Given an integer array nums, move all 0s to the end while preserving the relative order of the non-zero elements.',
    examples: [
      {
        input: 'nums = [0, 1, 0, 3, 12]',
        output: '[1, 3, 12, 0, 0]'
      }
    ],
    expectedPrintSubstring: '[1, 3, 12, 0, 0]',
    pythonCode: `def moveZeroes(nums: list[int]) -> list[int]:
    write = 0
    for read in range(len(nums)):
        if nums[read] != 0:
            nums[write], nums[read] = nums[read], nums[write]
            write += 1
    return nums

print(moveZeroes([0, 1, 0, 3, 12]))`,
    javascriptCode: `function moveZeroes(nums) {
  let write = 0;
  for (let read = 0; read < nums.length; read++) {
    if (nums[read] !== 0) {
      [nums[write], nums[read]] = [nums[read], nums[write]];
      write++;
    }
  }
  return nums;
}

console.log(JSON.stringify(moveZeroes([0, 1, 0, 3, 12])));`
  },
  {
    id: 'palindrome-linked-list',
    title: 'Palindrome Linked List',
    difficulty: 'medium',
    topics: ['Linked List', 'Linked list', 'Two pointers'],
    description:
      'Given the head of a singly linked list, return true if the values read the same forwards and backwards.',
    examples: [
      {
        input: 'head = [1, 2, 3, 2, 1]',
        output: 'True',
        explanation: 'Reversing the second half [3, 2, 1] matches the first half.'
      }
    ],
    expectedPrintSubstring: 'true',
    hasVisualiser: true,
    illustrationKey: 'palindrome',
    pythonCode: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def isPalindrome(head: ListNode) -> bool:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next

    prev = None
    while slow:
        nxt = slow.next
        slow.next = prev
        prev = slow
        slow = nxt

    left, right = head, prev
    while right:
        if left.val != right.val:
            return False
        left, right = left.next, right.next
    return True

head = ListNode(1, ListNode(2, ListNode(3, ListNode(2, ListNode(1)))))
print("Palindrome:", isPalindrome(head))`,
    javascriptCode: `class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}

function isPalindrome(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }

  let prev = null;
  while (slow) {
    const nxt = slow.next;
    slow.next = prev;
    prev = slow;
    slow = nxt;
  }

  let left = head, right = prev;
  while (right) {
    if (left.val !== right.val) return false;
    left = left.next;
    right = right.next;
  }
  return true;
}

const head = new ListNode(1, new ListNode(2, new ListNode(3, new ListNode(2, new ListNode(1)))));
console.log("Palindrome:", isPalindrome(head));`
  },
  {
    id: 'local-minimum',
    title: 'Local Minimum',
    difficulty: 'medium',
    topics: ['Binary Search', 'Array', 'Binary search'],
    description:
      'Find any index i in an array such that nums[i] is smaller than its adjacent neighbors in O(log n) time.',
    examples: [
      {
        input: 'nums = [9, 6, 3, 14, 5, 7, 4]',
        output: 'index=2, value=3'
      }
    ],
    expectedPrintSubstring: 'value=3',
    pythonCode: `def findLocalMinimum(nums: list[int]) -> int:
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] > nums[mid + 1]:
            lo = mid + 1
        else:
            hi = mid
    return lo

arr = [9, 6, 3, 14, 5, 7, 4]
idx = findLocalMinimum(arr)
print(f"Local minimum index={idx}, value={arr[idx]}")`,
    javascriptCode: `function findLocalMinimum(nums) {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] > nums[mid + 1]) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

const arr = [9, 6, 3, 14, 5, 7, 4];
const idx = findLocalMinimum(arr);
console.log(\`Local minimum index=\${idx}, value=\${arr[idx]}\`);`
  },
  {
    id: 'product-except-self',
    week: 1,
    category: 'Arrays & Hashing',
    leetcodeNumber: 238,
    title: 'Product of Array Except Self',
    difficulty: 'medium',
    topics: ['Arrays & Hashing', 'Array', 'Prefix sum'],
    description:
      'Return an array answer such that answer[i] equals the product of all elements of nums except nums[i] without division.',
    examples: [
      {
        input: 'nums = [1, 2, 3, 4]',
        output: '[24, 12, 8, 6]'
      }
    ],
    expectedPrintSubstring: '24',
    pythonCode: `def productExceptSelf(nums: list[int]) -> list[int]:
    res = [1] * len(nums)
    prefix = 1
    for i in range(len(nums)):
        res[i] = prefix
        prefix *= nums[i]
    postfix = 1
    for i in range(len(nums) - 1, -1, -1):
        res[i] *= postfix
        postfix *= nums[i]
    return res

print(productExceptSelf([1, 2, 3, 4]))`,
    javascriptCode: `function productExceptSelf(nums) {
  const res = new Array(nums.length).fill(1);
  let prefix = 1;
  for (let i = 0; i < nums.length; i++) {
    res[i] = prefix;
    prefix *= nums[i];
  }
  let postfix = 1;
  for (let i = nums.length - 1; i >= 0; i--) {
    res[i] *= postfix;
    postfix *= nums[i];
  }
  return res;
}

console.log(JSON.stringify(productExceptSelf([1, 2, 3, 4])));`
  },
  {
    id: 'container-with-most-water',
    week: 1,
    category: 'Two Pointers',
    leetcodeNumber: 11,
    title: 'Container With Most Water',
    difficulty: 'medium',
    topics: ['Two Pointers', 'Array', 'Two pointers', 'Greedy'],
    description:
      'You are given an integer array lines, where each element is the height of a vertical line standing at that index. Two lines and the axis between them form a container. Find the two lines that form the largest container and return its area.',
    examples: [
      {
        input: 'lines = [2, 9, 4, 1, 7, 3]',
        output: '21',
        explanation: 'Lines at indices 1 (height 9) and 4 (height 7) hold width 3 * height 7 = 21.'
      }
    ],
    expectedPrintSubstring: '21',
    hasVisualiser: true,
    illustrationKey: 'water',
    pythonCode: `def maxArea(lines: list[int]) -> int:
    lo, hi = 0, len(lines) - 1
    largest_area = 0
    while lo < hi:
        area = (hi - lo) * min(lines[lo], lines[hi])
        largest_area = max(largest_area, area)
        if lines[lo] < lines[hi]:
            lo += 1
        else:
            hi -= 1
    return largest_area

print("Largest area:", maxArea([2, 9, 4, 1, 7, 3]))`,
    javascriptCode: `function maxArea(lines) {
  let lo = 0, hi = lines.length - 1;
  let largestArea = 0;
  while (lo < hi) {
    const area = (hi - lo) * Math.min(lines[lo], lines[hi]);
    largestArea = Math.max(largestArea, area);
    if (lines[lo] < lines[hi]) lo++;
    else hi--;
  }
  return largestArea;
}

console.log("Largest area:", maxArea([2, 9, 4, 1, 7, 3]));`
  },
  {
    id: 'merge-intervals',
    week: 3,
    category: 'Intervals',
    leetcodeNumber: 56,
    title: 'Merge Intervals',
    difficulty: 'medium',
    topics: ['Intervals', 'Array', 'Sorting'],
    description:
      'Given an array of intervals where intervals[i] = [start, end], return a new array with overlapping intervals merged.',
    examples: [
      {
        input: 'intervals = [[2, 6], [15, 18], [1, 3], [8, 10]]',
        output: '[[1, 6], [8, 10], [15, 18]]'
      }
    ],
    expectedPrintSubstring: '1, 6',
    hasVisualiser: true,
    illustrationKey: 'merge-intervals',
    pythonCode: `def merge(intervals: list[list[int]]) -> list[list[int]]:
    intervals.sort(key=lambda pair: pair[0])
    merged = [intervals[0]]
    for start, end in intervals[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged

print(merge([[2, 6], [15, 18], [1, 3], [8, 10]]))`,
    javascriptCode: `function merge(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const [start, end] = intervals[i];
    const last = merged[merged.length - 1];
    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

console.log(JSON.stringify(merge([[2, 6], [15, 18], [1, 3], [8, 10]])));`
  },
  {
    id: 'largest-island',
    title: 'Largest Island',
    difficulty: 'medium',
    topics: ['Graphs', 'DFS', 'BFS', 'Graph', 'Array'],
    description:
      'You are given an m x n matrix grid of 0s and 1s, where 1 is land and 0 is water. Land cells joined horizontally or vertically form an island. Return the number of land cells in the largest island, or 0 if there is no land.',
    examples: [
      {
        input: 'grid = [[1,1,0,0],[1,0,0,1],[0,0,1,1],[0,0,1,0]]',
        output: '4'
      }
    ],
    expectedPrintSubstring: '4',
    hasVisualiser: true,
    illustrationKey: 'island',
    pythonCode: `def maxAreaOfIsland(grid: list[list[int]]) -> int:
    rows, cols = len(grid), len(grid[0])
    visited = set()

    def dfs(r: int, c: int) -> int:
        if r < 0 or r >= rows or c < 0 or c >= cols:
            return 0
        if grid[r][c] == 0 or (r, c) in visited:
            return 0
        visited.add((r, c))
        return 1 + dfs(r + 1, c) + dfs(r - 1, c) + dfs(r, c + 1) + dfs(r, c - 1)

    return max((dfs(r, c) for r in range(rows) for c in range(cols)), default=0)

grid = [
    [1, 1, 0, 0],
    [1, 0, 0, 1],
    [0, 0, 1, 1],
    [0, 0, 1, 0]
]
print("Largest island:", maxAreaOfIsland(grid))`,
    javascriptCode: `function maxAreaOfIsland(grid) {
  const rows = grid.length, cols = grid[0].length;
  const visited = new Set();

  function dfs(r, c) {
    const key = r + ',' + c;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return 0;
    if (grid[r][c] === 0 || visited.has(key)) return 0;
    visited.add(key);
    return 1 + dfs(r + 1, c) + dfs(r - 1, c) + dfs(r, c + 1) + dfs(r, c - 1);
  }

  let best = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      best = Math.max(best, dfs(r, c));
    }
  }
  return best;
}

const grid = [
  [1, 1, 0, 0],
  [1, 0, 0, 1],
  [0, 0, 1, 1],
  [0, 0, 1, 0]
];
console.log("Largest island:", maxAreaOfIsland(grid));`
  },
  {
    id: 'lowest-common-ancestor',
    title: 'Lowest Common Ancestor',
    difficulty: 'medium',
    topics: ['Trees', 'Tree', 'DFS', 'Two pointers'],
    description:
      'Given two nodes p and q from a tree, return their lowest common ancestor. Each node has a reference to its parent node.',
    examples: [
      {
        input: 'tree = [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p = 6, q = 4',
        output: '5'
      }
    ],
    expectedPrintSubstring: '5',
    hasVisualiser: true,
    illustrationKey: 'lca',
    pythonCode: `class Node:
    def __init__(self, val=0, parent=None):
        self.val = val
        self.parent = parent

def lowestCommonAncestor(p: Node, q: Node) -> Node:
    a, b = p, q
    while a is not b:
        a = a.parent if a.parent else q
        b = b.parent if b.parent else p
    return a

n3 = Node(3)
n5 = Node(5, n3); n1 = Node(1, n3)
n6 = Node(6, n5); n2 = Node(2, n5)
n7 = Node(7, n2); n4 = Node(4, n2)
print("LCA:", lowestCommonAncestor(n6, n4).val)`,
    javascriptCode: `class Node {
  constructor(val = 0, parent = null) {
    this.val = val;
    this.parent = parent;
  }
}

function lowestCommonAncestor(p, q) {
  let a = p, b = q;
  while (a !== b) {
    a = a.parent ? a.parent : q;
    b = b.parent ? b.parent : p;
  }
  return a;
}

const n3 = new Node(3);
const n5 = new Node(5, n3), n1 = new Node(1, n3);
const n6 = new Node(6, n5), n2 = new Node(2, n5);
const n7 = new Node(7, n2), n4 = new Node(4, n2);
console.log("LCA:", lowestCommonAncestor(n6, n4).val);`
  }
];

export const ALGORITHM_PROBLEMS: AlgorithmProblem[] = [
  ...FEATURED_PROBLEMS,
  ...CURRICULUM_PROBLEMS
];

export function getProblemCode(problem: AlgorithmProblem, language: SupportedLanguage): string {
  if (language === 'javascript') return problem.javascriptCode;
  return problem.pythonCode;
}
