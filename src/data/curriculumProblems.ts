export type ProblemDifficulty = 'easy' | 'medium' | 'hard';

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface CurriculumProblem {
  id: string;
  week?: number;
  category?: string;
  leetcodeNumber?: number;
  title: string;
  difficulty: ProblemDifficulty;
  topics: string[];
  description: string;
  examples: ProblemExample[];
  expectedPrintSubstring: string;
  hasVisualiser?: boolean;
  illustrationKey?: 'two-sum' | 'palindrome' | 'merge-intervals' | 'water' | 'island' | 'lca';
  pythonCode: string;
  javascriptCode: string;
}

export const CURRICULUM_CATEGORIES = [
  'Arrays & Hashing',
  'Two Pointers',
  'Sliding Window',
  'Stack',
  'Binary Search',
  'Intervals',
  'Linked List',
  'Trees',
  'Heap / Priority Queue',
  'Greedy',
  'Backtracking',
  'Tries',
  'Graphs',
  'Advanced Graphs',
  'Math & Geometry',
  '1-D Dynamic Programming',
  '2-D Dynamic Programming',
  'Bit Manipulation'
] as const;

type CompactSpec = [
  week: number,
  category: string,
  num: number,
  title: string,
  difficulty: ProblemDifficulty,
  summary: string,
  sampleInput: string,
  sampleOutput: string,
  fnName?: string,
  pyBody?: string,
  jsBody?: string
];

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toCamel(title: string): string {
  const words = title
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'solve';
  return words
    .map((w, idx) =>
      idx === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join('')
    .replace(/^[0-9]/, 'solve$&');
}

const SPECS: CompactSpec[] = [
  // Week 1 — Arrays & Hashing
  [
    1,
    'Arrays & Hashing',
    217,
    'Contains Duplicate',
    'easy',
    'Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.',
    'nums = [1, 2, 3, 1]',
    'true',
    'containsDuplicate',
    `def containsDuplicate(nums: list[int]) -> bool:\n    seen = set()\n    for n in nums:\n        if n in seen:\n            return True\n        seen.add(n)\n    return False\n\nprint(containsDuplicate([1, 2, 3, 1]))`,
    `function containsDuplicate(nums) {\n  const seen = new Set();\n  for (const n of nums) {\n    if (seen.has(n)) return true;\n    seen.add(n);\n  }\n  return false;\n}\n\nconsole.log(containsDuplicate([1, 2, 3, 1]));`
  ],
  [
    1,
    'Arrays & Hashing',
    242,
    'Valid Anagram',
    'easy',
    'Given two strings s and t, return true if t is an anagram of s, and false otherwise.',
    's = "anagram", t = "nagaram"',
    'true',
    'isAnagram',
    `def isAnagram(s: str, t: str) -> bool:\n    if len(s) != len(t):\n        return False\n    counts = {}\n    for ch in s:\n        counts[ch] = counts.get(ch, 0) + 1\n    for ch in t:\n        counts[ch] = counts.get(ch, 0) - 1\n        if counts[ch] < 0:\n            return False\n    return True\n\nprint(isAnagram("anagram", "nagaram"))`,
    `function isAnagram(s, t) {\n  if (s.length !== t.length) return false;\n  const counts = {};\n  for (const ch of s) counts[ch] = (counts[ch] || 0) + 1;\n  for (const ch of t) {\n    if (!counts[ch]) return false;\n    counts[ch]--;\n  }\n  return true;\n}\n\nconsole.log(isAnagram("anagram", "nagaram"));`
  ],
  [
    1,
    'Arrays & Hashing',
    49,
    'Group Anagrams',
    'medium',
    'Given an array of strings strs, group the anagrams together. You can return the answer in any order.',
    'strs = ["eat", "tea", "tan", "ate", "nat", "bat"]',
    '[["eat","tea","ate"],["tan","nat"],["bat"]]',
    'groupAnagrams',
    `def groupAnagrams(strs: list[str]) -> list[list[str]]:\n    groups = {}\n    for word in strs:\n        key = "".join(sorted(word))\n        groups.setdefault(key, []).append(word)\n    return list(groups.values())\n\nprint(groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))`,
    `function groupAnagrams(strs) {\n  const groups = {};\n  for (const word of strs) {\n    const key = word.split('').sort().join('');\n    if (!groups[key]) groups[key] = [];\n    groups[key].push(word);\n  }\n  return Object.values(groups);\n}\n\nconsole.log(JSON.stringify(groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"])));`
  ],
  [
    1,
    'Arrays & Hashing',
    347,
    'Top K Frequent Elements',
    'medium',
    'Given an integer array nums and an integer k, return the k most frequent elements.',
    'nums = [1, 1, 1, 2, 2, 3], k = 2',
    '[1, 2]',
    'topKFrequent',
    `def topKFrequent(nums: list[int], k: int) -> list[int]:\n    freq = {}\n    for n in nums:\n        freq[n] = freq.get(n, 0) + 1\n    ranked = sorted(freq.keys(), key=lambda x: -freq[x])\n    return ranked[:k]\n\nprint(topKFrequent([1, 1, 1, 2, 2, 3], 2))`,
    `function topKFrequent(nums, k) {\n  const freq = {};\n  for (const n of nums) freq[n] = (freq[n] || 0) + 1;\n  return Object.keys(freq).map(Number).sort((a, b) => freq[b] - freq[a]).slice(0, k);\n}\n\nconsole.log(JSON.stringify(topKFrequent([1, 1, 1, 2, 2, 3], 2)));`
  ],
  [
    1,
    'Arrays & Hashing',
    36,
    'Valid Sudoku',
    'medium',
    'Determine if a 9 x 9 Sudoku board is valid. Only the filled cells need to be validated according to Sudoku rules.',
    'board = [["5","3",".",".","7",...]]',
    'true'
  ],
  [
    1,
    'Arrays & Hashing',
    271,
    'Encode and Decode Strings',
    'medium',
    'Design an algorithm to encode a list of strings to a single string and decode that string back into the original list of strings.',
    'strs = ["neet", "code", "love", "you"]',
    '["neet", "code", "love", "you"]',
    'encodeDecode',
    `def encode(strs: list[str]) -> str:\n    return "".join(f"{len(s)}#{s}" for s in strs)\n\ndef decode(s: str) -> list[str]:\n    res, i = [], 0\n    while i < len(s):\n        j = i\n        while s[j] != "#":\n            j += 1\n        length = int(s[i:j])\n        res.append(s[j + 1 : j + 1 + length])\n        i = j + 1 + length\n    return res\n\nencoded = encode(["neet", "code", "love", "you"])\nprint(decode(encoded))`,
    `function encode(strs) {\n  return strs.map(s => s.length + '#' + s).join('');\n}\n\nfunction decode(s) {\n  const res = [];\n  let i = 0;\n  while (i < s.length) {\n    let j = i;\n    while (s[j] !== '#') j++;\n    const len = parseInt(s.slice(i, j), 10);\n    res.push(s.slice(j + 1, j + 1 + len));\n    i = j + 1 + len;\n  }\n  return res;\n}\n\nconsole.log(JSON.stringify(decode(encode(["neet", "code", "love", "you"]))));`
  ],
  [
    1,
    'Arrays & Hashing',
    128,
    'Longest Consecutive Sequence',
    'medium',
    'Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence in O(n) time.',
    'nums = [100, 4, 200, 1, 3, 2]',
    '4',
    'longestConsecutive',
    `def longestConsecutive(nums: list[int]) -> int:\n    num_set = set(nums)\n    best = 0\n    for n in num_set:\n        if n - 1 not in num_set:\n            cur = n\n            while cur + 1 in num_set:\n                cur += 1\n            best = max(best, cur - n + 1)\n    return best\n\nprint(longestConsecutive([100, 4, 200, 1, 3, 2]))`,
    `function longestConsecutive(nums) {\n  const set = new Set(nums);\n  let best = 0;\n  for (const n of set) {\n    if (!set.has(n - 1)) {\n      let cur = n;\n      while (set.has(cur + 1)) cur++;\n      best = Math.max(best, cur - n + 1);\n    }\n  }\n  return best;\n}\n\nconsole.log(longestConsecutive([100, 4, 200, 1, 3, 2]));`
  ],

  // Week 1 — Two Pointers
  [
    1,
    'Two Pointers',
    125,
    'Valid Palindrome',
    'easy',
    'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.',
    's = "A man, a plan, a canal: Panama"',
    'true',
    'isPalindrome',
    `def isPalindrome(s: str) -> bool:\n    clean = [c.lower() for c in s if c.isalnum()]\n    l, r = 0, len(clean) - 1\n    while l < r:\n        if clean[l] != clean[r]:\n            return False\n        l += 1\n        r -= 1\n    return True\n\nprint(isPalindrome("A man, a plan, a canal: Panama"))`,
    `function isPalindrome(s) {\n  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');\n  let l = 0, r = clean.length - 1;\n  while (l < r) {\n    if (clean[l] !== clean[r]) return false;\n    l++; r--;\n  }\n  return true;\n}\n\nconsole.log(isPalindrome("A man, a plan, a canal: Panama"));`
  ],
  [
    1,
    'Two Pointers',
    167,
    'Two Sum II (Input Array Is Sorted)',
    'medium',
    'Given a 1-indexed array of integers numbers sorted in non-decreasing order, find two numbers such that they add up to a specific target.',
    'numbers = [2, 7, 11, 15], target = 9',
    '[1, 2]',
    'twoSumSorted',
    `def twoSum(numbers: list[int], target: int) -> list[int]:\n    l, r = 0, len(numbers) - 1\n    while l < r:\n        s = numbers[l] + numbers[r]\n        if s == target:\n            return [l + 1, r + 1]\n        if s < target:\n            l += 1\n        else:\n            r -= 1\n    return []\n\nprint(twoSum([2, 7, 11, 15], 9))`,
    `function twoSum(numbers, target) {\n  let l = 0, r = numbers.length - 1;\n  while (l < r) {\n    const s = numbers[l] + numbers[r];\n    if (s === target) return [l + 1, r + 1];\n    if (s < target) l++;\n    else r--;\n  }\n  return [];\n}\n\nconsole.log(JSON.stringify(twoSum([2, 7, 11, 15], 9)));`
  ],
  [
    1,
    'Two Pointers',
    15,
    '3Sum',
    'medium',
    'Given an integer array nums, return all unique triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, j != k, and nums[i] + nums[j] + nums[k] == 0.',
    'nums = [-1, 0, 1, 2, -1, -4]',
    '[[-1, -1, 2], [-1, 0, 1]]',
    'threeSum',
    `def threeSum(nums: list[int]) -> list[list[int]]:\n    nums.sort()\n    res = []\n    for i, a in enumerate(nums):\n        if i > 0 and a == nums[i - 1]:\n            continue\n        l, r = i + 1, len(nums) - 1\n        while l < r:\n            total = a + nums[l] + nums[r]\n            if total > 0:\n                r -= 1\n            elif total < 0:\n                l += 1\n            else:\n                res.append([a, nums[l], nums[r]])\n                l += 1\n                while l < r and nums[l] == nums[l - 1]:\n                    l += 1\n    return res\n\nprint(threeSum([-1, 0, 1, 2, -1, -4]))`,
    `function threeSum(nums) {\n  nums.sort((a, b) => a - b);\n  const res = [];\n  for (let i = 0; i < nums.length; i++) {\n    if (i > 0 && nums[i] === nums[i - 1]) continue;\n    let l = i + 1, r = nums.length - 1;\n    while (l < r) {\n      const s = nums[i] + nums[l] + nums[r];\n      if (s > 0) r--;\n      else if (s < 0) l++;\n      else {\n        res.push([nums[i], nums[l], nums[r]]);\n        l++;\n        while (l < r && nums[l] === nums[l - 1]) l++;\n      }\n    }\n  }\n  return res;\n}\n\nconsole.log(JSON.stringify(threeSum([-1, 0, 1, 2, -1, -4])));`
  ],
  [
    1,
    'Two Pointers',
    42,
    'Trapping Rain Water',
    'hard',
    'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
    'height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]',
    '6',
    'trap',
    `def trap(height: list[int]) -> int:\n    l, r = 0, len(height) - 1\n    left_max, right_max = height[l], height[r]\n    water = 0\n    while l < r:\n        if left_max < right_max:\n            l += 1\n            left_max = max(left_max, height[l])\n            water += left_max - height[l]\n        else:\n            r -= 1\n            right_max = max(right_max, height[r])\n            water += right_max - height[r]\n    return water\n\nprint(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]))`,
    `function trap(height) {\n  let l = 0, r = height.length - 1;\n  let leftMax = height[l], rightMax = height[r], water = 0;\n  while (l < r) {\n    if (leftMax < rightMax) {\n      l++;\n      leftMax = Math.max(leftMax, height[l]);\n      water += leftMax - height[l];\n    } else {\n      r--;\n      rightMax = Math.max(rightMax, height[r]);\n      water += rightMax - height[r];\n    }\n  }\n  return water;\n}\n\nconsole.log(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]));`
  ],

  // Week 2 — Sliding Window
  [
    2,
    'Sliding Window',
    121,
    'Best Time to Buy And Sell Stock',
    'easy',
    'Given an array prices where prices[i] is the price of a stock on day i, maximize your profit by choosing a single day to buy and a future day to sell.',
    'prices = [7, 1, 5, 3, 6, 4]',
    '5',
    'maxProfit',
    `def maxProfit(prices: list[int]) -> int:\n    low, best = prices[0], 0\n    for p in prices[1:]:\n        best = max(best, p - low)\n        low = min(low, p)\n    return best\n\nprint(maxProfit([7, 1, 5, 3, 6, 4]))`,
    `function maxProfit(prices) {\n  let low = prices[0], best = 0;\n  for (let i = 1; i < prices.length; i++) {\n    best = Math.max(best, prices[i] - low);\n    low = Math.min(low, prices[i]);\n  }\n  return best;\n}\n\nconsole.log(maxProfit([7, 1, 5, 3, 6, 4]));`
  ],
  [
    2,
    'Sliding Window',
    3,
    'Longest Substring Without Repeating Characters',
    'medium',
    'Given a string s, find the length of the longest substring without repeating characters.',
    's = "abcabcbb"',
    '3',
    'lengthOfLongestSubstring',
    `def lengthOfLongestSubstring(s: str) -> int:\n    seen = set()\n    l, best = 0, 0\n    for r, ch in enumerate(s):\n        while ch in seen:\n            seen.remove(s[l])\n            l += 1\n        seen.add(ch)\n        best = max(best, r - l + 1)\n    return best\n\nprint(lengthOfLongestSubstring("abcabcbb"))`,
    `function lengthOfLongestSubstring(s) {\n  const seen = new Set();\n  let l = 0, best = 0;\n  for (let r = 0; r < s.length; r++) {\n    while (seen.has(s[r])) {\n      seen.delete(s[l++]);\n    }\n    seen.add(s[r]);\n    best = Math.max(best, r - l + 1);\n  }\n  return best;\n}\n\nconsole.log(lengthOfLongestSubstring("abcabcbb"));`
  ],
  [2, 'Sliding Window', 424, 'Longest Repeating Character Replacement', 'medium', 'Given a string s and an integer k, you can replace at most k characters so the longest substring containing the same letter is maximized.', 's = "AABABBA", k = 1', '4'],
  [2, 'Sliding Window', 567, 'Permutation In String', 'medium', 'Given two strings s1 and s2, return true if s2 contains a permutation of s1.', 's1 = "ab", s2 = "eidbaooo"', 'true'],
  [2, 'Sliding Window', 76, 'Minimum Window Substring', 'hard', 'Given two strings s and t, return the minimum window substring of s such that every character in t is included.', 's = "ADOBECODEBANC", t = "ABC"', '"BANC"'],
  [2, 'Sliding Window', 239, 'Sliding Window Maximum', 'hard', 'Return the max sliding window of size k moving from the very left of nums to the very right.', 'nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3', '[3, 3, 5, 5, 6, 7]'],

  // Week 2 — Stack
  [
    2,
    'Stack',
    20,
    'Valid Parentheses',
    'easy',
    'Given a string s containing just the characters (, ), {, }, [ and ], determine if the input string has valid bracket nesting.',
    's = "({[]})"',
    'true',
    'isValid',
    `def isValid(s: str) -> bool:\n    pairs = {")": "(", "}": "{", "]": "["}\n    stack = []\n    for ch in s:\n        if ch in pairs:\n            if not stack or stack[-1] != pairs[ch]:\n                return False\n            stack.pop()\n        else:\n            stack.append(ch)\n    return len(stack) == 0\n\nprint(isValid("({[]})"))`,
    `function isValid(s) {\n  const pairs = { ")": "(", "}": "{", "]": "[" };\n  const stack = [];\n  for (const ch of s) {\n    if (pairs[ch]) {\n      if (stack.pop() !== pairs[ch]) return false;\n    } else {\n      stack.push(ch);\n    }\n  }\n  return stack.length === 0;\n}\n\nconsole.log(isValid("({[]})"));`
  ],
  [2, 'Stack', 155, 'Min Stack', 'medium', 'Design a stack that supports push, pop, top, and retrieving the minimum element in constant O(1) time.', 'push(-2), push(0), push(-3), getMin()', '-3'],
  [2, 'Stack', 150, 'Evaluate Reverse Polish Notation', 'medium', 'Evaluate the value of an arithmetic expression in Reverse Polish Notation.', 'tokens = ["2", "1", "+", "3", "*"]', '9'],
  [2, 'Stack', 22, 'Generate Parentheses', 'medium', 'Given n pairs of parentheses, write a function to generate all combinations of well-formed parentheses.', 'n = 3', '["((()))","(()())","(())()","()(())","()()()"]'],
  [
    2,
    'Stack',
    739,
    'Daily Temperatures',
    'medium',
    'Given an array of daily temperatures, return an array answer such that answer[i] is the number of days until a warmer temperature.',
    'temperatures = [73, 74, 75, 71, 69, 72, 76, 73]',
    '[1, 1, 4, 2, 1, 1, 0, 0]',
    'dailyTemperatures',
    `def dailyTemperatures(temps: list[int]) -> list[int]:\n    res = [0] * len(temps)\n    stack = []\n    for i, t in enumerate(temps):\n        while stack and t > temps[stack[-1]]:\n            idx = stack.pop()\n            res[idx] = i - idx\n        stack.append(i)\n    return res\n\nprint(dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73]))`,
    `function dailyTemperatures(temps) {\n  const res = new Array(temps.length).fill(0);\n  const stack = [];\n  for (let i = 0; i < temps.length; i++) {\n    while (stack.length && temps[i] > temps[stack[stack.length - 1]]) {\n      const idx = stack.pop();\n      res[idx] = i - idx;\n    }\n    stack.push(i);\n  }\n  return res;\n}\n\nconsole.log(JSON.stringify(dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73])));`
  ],
  [2, 'Stack', 853, 'Car Fleet', 'medium', 'Determine how many car fleets will arrive at the destination given starting positions and speeds.', 'target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3]', '3'],
  [2, 'Stack', 84, 'Largest Rectangle In Histogram', 'hard', 'Given an array of integers heights representing histogram bar heights of width 1, return the area of the largest rectangle.', 'heights = [2, 1, 5, 6, 2, 3]', '10'],

  // Week 3 — Binary Search
  [
    3,
    'Binary Search',
    704,
    'Binary Search',
    'easy',
    'Given an array of integers nums sorted in ascending order and a target, write an O(log n) algorithm to return target index or -1.',
    'nums = [-1, 0, 3, 5, 9, 12], target = 9',
    '4',
    'search',
    `def search(nums: list[int], target: int) -> int:\n    lo, hi = 0, len(nums) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if nums[mid] == target:\n            return mid\n        if nums[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1\n\nprint(search([-1, 0, 3, 5, 9, 12], 9))`,
    `function search(nums, target) {\n  let lo = 0, hi = nums.length - 1;\n  while (lo <= hi) {\n    const mid = Math.floor((lo + hi) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return -1;\n}\n\nconsole.log(search([-1, 0, 3, 5, 9, 12], 9));`
  ],
  [3, 'Binary Search', 74, 'Search a 2D Matrix', 'medium', 'Write an efficient algorithm that searches for a value target in an m x n sorted integer matrix in O(log(m * n)) time.', 'matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3', 'true'],
  [3, 'Binary Search', 875, 'Koko Eating Bananas', 'medium', 'Return the minimum integer eating speed k such that Koko can eat all banana piles within h hours.', 'piles = [3, 6, 7, 11], h = 8', '4'],
  [3, 'Binary Search', 153, 'Find Minimum In Rotated Sorted Array', 'medium', 'Find the minimum element of a sorted rotated array of unique elements in O(log n) time.', 'nums = [3, 4, 5, 1, 2]', '1'],
  [3, 'Binary Search', 33, 'Search In Rotated Sorted Array', 'medium', 'Search for target in a rotated sorted array with distinct values in O(log n) time.', 'nums = [4, 5, 6, 7, 0, 1, 2], target = 0', '4'],
  [3, 'Binary Search', 981, 'Time Based Key-Value Store', 'medium', 'Design a time-based key-value data structure that stores multiple values for the same key at different timestamps.', 'set("foo","bar",1), get("foo",1)', '"bar"'],
  [3, 'Binary Search', 4, 'Median of Two Sorted Arrays', 'hard', 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median in O(log(m+n)) time.', 'nums1 = [1, 3], nums2 = [2]', '2.0'],

  // Week 3 — Intervals
  [3, 'Intervals', 252, 'Meeting Rooms', 'easy', 'Given an array of meeting time intervals [start, end], determine if a person could attend all meetings.', 'intervals = [[0, 30], [5, 10], [15, 20]]', 'false'],
  [3, 'Intervals', 57, 'Insert Interval', 'medium', 'Insert a newInterval into sorted non-overlapping intervals and merge overlapping intervals if necessary.', 'intervals = [[1,3],[6,9]], newInterval = [2,5]', '[[1, 5], [6, 9]]'],
  [3, 'Intervals', 435, 'Non-overlapping Intervals', 'medium', 'Return the minimum number of intervals you need to remove to make the rest of the intervals non-overlapping.', 'intervals = [[1,2],[2,3],[3,4],[1,3]]', '1'],
  [3, 'Intervals', 253, 'Meeting Rooms II', 'medium', 'Given meeting time intervals, find the minimum number of conference rooms required.', 'intervals = [[0,30],[5,10],[15,20]]', '2'],
  [3, 'Intervals', 1851, 'Minimum Interval to Include Each Query', 'hard', 'For each query, find the size of the smallest interval [left, right] containing that query.', 'intervals = [[1,4],[2,4],[3,6],[4,4]], queries = [2,3,4,5]', '[3, 3, 1, 4]'],

  // Week 4 — Linked List
  [4, 'Linked List', 206, 'Reverse Linked List', 'easy', 'Given the head of a singly linked list, reverse the list, and return the reversed head.', 'head = [1, 2, 3, 4, 5]', '[5, 4, 3, 2, 1]'],
  [4, 'Linked List', 21, 'Merge Two Sorted Lists', 'easy', 'Merge two sorted linked lists and return it as a single sorted list.', 'list1 = [1, 2, 4], list2 = [1, 3, 4]', '[1, 1, 2, 3, 4, 4]'],
  [4, 'Linked List', 141, 'Linked List Cycle', 'easy', 'Given head of a linked list, determine if the linked list has a cycle in it.', 'head = [3, 2, 0, -4], pos = 1', 'true'],
  [4, 'Linked List', 143, 'Reorder List', 'medium', 'Reorder singly linked list L0 -> L1 -> ... -> Ln to L0 -> Ln -> L1 -> Ln-1 -> ... in-place.', 'head = [1, 2, 3, 4]', '[1, 4, 2, 3]'],
  [4, 'Linked List', 19, 'Remove Nth Node From End of List', 'medium', 'Given the head of a linked list, remove the nth node from the end of the list and return its head.', 'head = [1, 2, 3, 4, 5], n = 2', '[1, 2, 3, 5]'],
  [4, 'Linked List', 138, 'Copy List With Random Pointer', 'medium', 'Construct a deep copy of a linked list where each node contains an additional random pointer.', 'head = [[7,null],[13,0],[11,4],[10,2],[1,0]]', 'deep copied list'],
  [4, 'Linked List', 2, 'Add Two Numbers', 'medium', 'You are given two non-empty linked lists representing two non-negative integers stored in reverse order. Return their sum as a linked list.', 'l1 = [2,4,3], l2 = [5,6,4]', '[7, 0, 8]'],
  [4, 'Linked List', 287, 'Find The Duplicate Number', 'medium', 'Given an array nums containing n + 1 integers where each integer is in [1, n], find the single duplicate number in O(1) space.', 'nums = [1, 3, 4, 2, 2]', '2'],
  [4, 'Linked List', 146, 'LRU Cache', 'medium', 'Design a data structure that follows Least Recently Used (LRU) cache constraints with O(1) get and put.', 'capacity = 2, put(1,1), put(2,2), get(1)', '1'],
  [4, 'Linked List', 23, 'Merge k Sorted Lists', 'hard', 'Merge k sorted linked lists and return it as one sorted linked list.', 'lists = [[1,4,5],[1,3,4],[2,6]]', '[1,1,2,3,4,4,5,6]'],
  [4, 'Linked List', 25, 'Reverse Nodes in k-Group', 'hard', 'Reverse the nodes of a linked list k at a time and return the modified list.', 'head = [1, 2, 3, 4, 5], k = 2', '[2, 1, 4, 3, 5]'],

  // Week 5 — Trees
  [5, 'Trees', 226, 'Invert Binary Tree', 'easy', 'Given the root of a binary tree, invert the tree, and return its root.', 'root = [4, 2, 7, 1, 3, 6, 9]', '[4, 7, 2, 9, 6, 3, 1]'],
  [5, 'Trees', 104, 'Maximum Depth of Binary Tree', 'easy', 'Given the root of a binary tree, return its maximum depth.', 'root = [3, 9, 20, null, null, 15, 7]', '3'],
  [5, 'Trees', 543, 'Diameter of Binary Tree', 'easy', 'Return the length of the diameter (longest path between any two nodes) of a binary tree.', 'root = [1, 2, 3, 4, 5]', '3'],
  [5, 'Trees', 110, 'Balanced Binary Tree', 'easy', 'Given a binary tree, determine if it is height-balanced.', 'root = [3, 9, 20, null, null, 15, 7]', 'true'],
  [5, 'Trees', 100, 'Same Tree', 'easy', 'Given the roots of two binary trees p and q, check if they are structurally identical with the same node values.', 'p = [1, 2, 3], q = [1, 2, 3]', 'true'],
  [5, 'Trees', 572, 'Subtree of Another Tree', 'easy', 'Return true if there is a subtree of root with the same structure and node values as subRoot.', 'root = [3,4,5,1,2], subRoot = [4,1,2]', 'true'],
  [5, 'Trees', 235, 'Lowest Common Ancestor of a Binary Search Tree', 'medium', 'Find the lowest common ancestor (LCA) node of two given nodes in a Binary Search Tree.', 'root = [6,2,8,0,4,7,9], p = 2, q = 8', '6'],
  [5, 'Trees', 102, 'Binary Tree Level Order Traversal', 'medium', 'Given the root of a binary tree, return the level order traversal of its nodes values.', 'root = [3, 9, 20, null, null, 15, 7]', '[[3], [9, 20], [15, 7]]'],
  [5, 'Trees', 199, 'Binary Tree Right Side View', 'medium', 'Imagine standing on the right side of a binary tree; return the values of the nodes you can see ordered top to bottom.', 'root = [1, 2, 3, null, 5, null, 4]', '[1, 3, 4]'],
  [5, 'Trees', 1448, 'Count Good Nodes In Binary Tree', 'medium', 'A node X is good if in the path from root to X there are no nodes with a value greater than X. Return the count of good nodes.', 'root = [3, 1, 4, 3, null, 1, 5]', '4'],
  [5, 'Trees', 98, 'Validate Binary Search Tree', 'medium', 'Given the root of a binary tree, determine if it is a valid binary search tree (BST).', 'root = [2, 1, 3]', 'true'],
  [5, 'Trees', 230, 'Kth Smallest Element in a BST', 'medium', 'Given the root of a binary search tree and integer k, return the kth smallest value (1-indexed).', 'root = [3, 1, 4, null, 2], k = 1', '1'],
  [5, 'Trees', 105, 'Construct Binary Tree From Preorder And Inorder Traversal', 'medium', 'Given preorder and inorder traversal arrays, construct and return the binary tree.', 'preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]', '[3,9,20,null,null,15,7]'],
  [5, 'Trees', 124, 'Binary Tree Maximum Path Sum', 'hard', 'Given the root of a binary tree, return the maximum path sum of any non-empty path.', 'root = [-10, 9, 20, null, null, 15, 7]', '42'],
  [5, 'Trees', 297, 'Serialize And Deserialize Binary Tree', 'hard', 'Design an algorithm to serialize and deserialize a binary tree to/from a string.', 'root = [1, 2, 3, null, null, 4, 5]', '[1, 2, 3, null, null, 4, 5]'],

  // Week 6 — Heap / Priority Queue
  [6, 'Heap / Priority Queue', 703, 'Kth Largest Element In a Stream', 'easy', 'Design a class to find the kth largest element in a stream.', 'k = 3, nums = [4, 5, 8, 2]', 'add(3)->4, add(5)->5'],
  [6, 'Heap / Priority Queue', 1046, 'Last Stone Weight', 'easy', 'Smash the two heaviest stones repeatedly until at most one stone remains and return its weight.', 'stones = [2, 7, 4, 1, 8, 1]', '1'],
  [6, 'Heap / Priority Queue', 973, 'K Closest Points to Origin', 'medium', 'Given an array of points, return the k closest points to the origin (0, 0).', 'points = [[1,3],[-2,2]], k = 1', '[[-2, 2]]'],
  [6, 'Heap / Priority Queue', 215, 'Kth Largest Element In An Array', 'medium', 'Given an integer array nums and integer k, return the kth largest element in the array.', 'nums = [3, 2, 1, 5, 6, 4], k = 2', '5'],
  [6, 'Heap / Priority Queue', 621, 'Task Scheduler', 'medium', 'Return the minimum number of intervals needed to finish all CPU tasks with cooldown period n.', 'tasks = ["A","A","A","B","B","B"], n = 2', '8'],
  [6, 'Heap / Priority Queue', 355, 'Design Twitter', 'medium', 'Design a simplified version of Twitter supporting postTweet, getNewsFeed, follow, and unfollow.', 'postTweet(1, 5), getNewsFeed(1)', '[5]'],
  [6, 'Heap / Priority Queue', 295, 'Find Median From Data Stream', 'hard', 'Implement MedianFinder supporting addNum and findMedian in O(log n) and O(1).', 'addNum(1), addNum(2), findMedian()', '1.5'],

  // Week 6 — Greedy
  [
    6,
    'Greedy',
    53,
    'Maximum Subarray',
    'medium',
    'Given an integer array nums, find the contiguous subarray with the largest sum, and return its sum.',
    'nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]',
    '6',
    'maxSubArray',
    `def maxSubArray(nums: list[int]) -> int:\n    cur = best = nums[0]\n    for n in nums[1:]:\n        cur = max(n, cur + n)\n        best = max(best, cur)\n    return best\n\nprint(maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))`,
    `function maxSubArray(nums) {\n  let cur = nums[0], best = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    cur = Math.max(nums[i], cur + nums[i]);\n    best = Math.max(best, cur);\n  }\n  return best;\n}\n\nconsole.log(maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]));`
  ],
  [
    6,
    'Greedy',
    55,
    'Jump Game',
    'medium',
    'Each element in nums represents your maximum jump length at that position. Return true if you can reach the last index.',
    'nums = [2, 3, 1, 1, 4]',
    'true',
    'canJump',
    `def canJump(nums: list[int]) -> bool:\n    goal = len(nums) - 1\n    for i in range(len(nums) - 2, -1, -1):\n        if i + nums[i] >= goal:\n            goal = i\n    return goal == 0\n\nprint(canJump([2, 3, 1, 1, 4]))`,
    `function canJump(nums) {\n  let goal = nums.length - 1;\n  for (let i = nums.length - 2; i >= 0; i--) {\n    if (i + nums[i] >= goal) goal = i;\n  }\n  return goal === 0;\n}\n\nconsole.log(canJump([2, 3, 1, 1, 4]));`
  ],
  [6, 'Greedy', 45, 'Jump Game II', 'medium', 'Return the minimum number of jumps to reach the last index.', 'nums = [2, 3, 1, 1, 4]', '2'],
  [6, 'Greedy', 134, 'Gas Station', 'medium', 'Return the starting gas station index if you can travel around the circuit once clockwise, otherwise -1.', 'gas = [1,2,3,4,5], cost = [3,4,5,1,2]', '3'],
  [6, 'Greedy', 846, 'Hand of Straights', 'medium', 'Rearrange cards into groups of size groupSize where each group consists of consecutive cards.', 'hand = [1,2,3,6,2,3,4,7,8], groupSize = 3', 'true'],
  [6, 'Greedy', 1899, 'Merge Triplets to Form Target Triplet', 'medium', 'Return true if it is possible to obtain the target triplet by applying element-wise max operations on chosen triplets.', 'triplets = [[2,5,3],[1,8,4],[1,7,5]], target = [2,7,5]', 'true'],
  [6, 'Greedy', 763, 'Partition Labels', 'medium', 'Partition the string into as many parts as possible so that each letter appears in at most one part.', 's = "ababcbacadefegdehijhklij"', '[9, 7, 8]'],
  [6, 'Greedy', 678, 'Valid Parenthesis String', 'medium', 'Determine whether a string containing (, ), and * (which can act as (, ), or empty) is valid.', 's = "(*))"', 'true'],

  // Week 7 — Backtracking
  [
    7,
    'Backtracking',
    78,
    'Subsets',
    'medium',
    'Given an integer array nums of unique elements, return all possible subsets (the power set).',
    'nums = [1, 2, 3]',
    '[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]',
    'subsets',
    `def subsets(nums: list[int]) -> list[list[int]]:\n    res, cur = [], []\n    def dfs(i: int):\n        if i == len(nums):\n            res.append(cur[:])\n            return\n        cur.append(nums[i])\n        dfs(i + 1)\n        cur.pop()\n        dfs(i + 1)\n    dfs(0)\n    return res\n\nprint(subsets([1, 2, 3]))`,
    `function subsets(nums) {\n  const res = [], cur = [];\n  function dfs(i) {\n    if (i === nums.length) {\n      res.push([...cur]);\n      return;\n    }\n    cur.push(nums[i]);\n    dfs(i + 1);\n    cur.pop();\n    dfs(i + 1);\n  }\n  dfs(0);\n  return res;\n}\n\nconsole.log(JSON.stringify(subsets([1, 2, 3])));`
  ],
  [7, 'Backtracking', 39, 'Combination Sum', 'medium', 'Return all unique combinations of candidates where the chosen numbers sum to target.', 'candidates = [2, 3, 6, 7], target = 7', '[[2, 2, 3], [7]]'],
  [7, 'Backtracking', 46, 'Permutations', 'medium', 'Given an array nums of distinct integers, return all possible permutations.', 'nums = [1, 2, 3]', '6 permutations'],
  [7, 'Backtracking', 90, 'Subsets II', 'medium', 'Given an integer array nums that may contain duplicates, return all unique subsets.', 'nums = [1, 2, 2]', '[[],[1],[1,2],[1,2,2],[2],[2,2]]'],
  [7, 'Backtracking', 40, 'Combination Sum II', 'medium', 'Find all unique combinations in candidates where each number is used at most once and sums to target.', 'candidates = [10,1,2,7,6,1,5], target = 8', '[[1,1,6],[1,2,5],[1,7],[2,6]]'],
  [7, 'Backtracking', 79, 'Word Search', 'medium', 'Given an m x n grid of characters and a string word, return true if word exists in the grid.', 'word = "ABCCED"', 'true'],
  [7, 'Backtracking', 131, 'Palindrome Partitioning', 'medium', 'Partition string s such that every substring of the partition is a palindrome.', 's = "aab"', '[["a","a","b"],["aa","b"]]'],
  [7, 'Backtracking', 17, 'Letter Combinations of a Phone Number', 'medium', 'Given a string containing digits 2-9, return all possible letter combinations.', 'digits = "23"', '["ad","ae","af","bd","be","bf","cd","ce","cf"]'],
  [7, 'Backtracking', 51, 'N-Queens', 'hard', 'Place n queens on an n x n chessboard so that no two queens attack each other.', 'n = 4', '2 solutions'],

  // Week 7 — Tries
  [7, 'Tries', 208, 'Implement Trie (Prefix Tree)', 'medium', 'Implement the Trie data structure supporting insert, search, and startsWith operations.', 'insert("apple"), search("apple"), startsWith("app")', 'true'],
  [7, 'Tries', 211, 'Design Add And Search Words Data Structure', 'medium', 'Design a data structure that supports adding words and searching with "." wildcard matching.', 'addWord("bad"), search(".ad")', 'true'],
  [7, 'Tries', 212, 'Word Search II', 'hard', 'Given an m x n board of characters and a list of words, return all words on the board.', 'words = ["oath","pea","eat","rain"]', '["eat","oath"]'],

  // Week 8 — Graphs
  [8, 'Graphs', 200, 'Number of Islands', 'medium', 'Given an m x n 2D binary grid representing 1s (land) and 0s (water), return the number of islands.', 'grid = [["1","1","0"],["1","1","0"],["0","0","1"]]', '2'],
  [8, 'Graphs', 133, 'Clone Graph', 'medium', 'Return a deep copy (clone) of a connected undirected graph.', 'adjList = [[2,4],[1,3],[2,4],[1,3]]', '[[2,4],[1,3],[2,4],[1,3]]'],
  [
    8,
    'Graphs',
    695,
    'Max Area of Island',
    'medium',
    'Find the maximum area of an island (connected group of 1s) in the given 2D binary matrix grid.',
    'grid = [[1,1,0,0],[1,0,0,1],[0,0,1,1],[0,0,1,0]]',
    '4'
  ],
  [8, 'Graphs', 417, 'Pacific Atlantic Water Flow', 'medium', 'Return a list of grid coordinates where rain water can flow to both the Pacific and Atlantic oceans.', 'heights = [[1,2,2,3,5],[3,2,3,4,4],...]', '[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]'],
  [8, 'Graphs', 130, 'Surrounded Regions', 'medium', 'Capture all "O" regions that are 4-directionally surrounded by "X" by flipping them to "X".', 'board = [["X","X","X","X"],["X","O","O","X"],...]', 'captured'],
  [8, 'Graphs', 994, 'Rotting Oranges', 'medium', 'Return the minimum number of minutes until no fresh orange remains using multi-source BFS.', 'grid = [[2,1,1],[1,1,0],[0,1,1]]', '4'],
  [8, 'Graphs', 286, 'Walls And Gates', 'medium', 'Fill each empty room in an m x n grid with the distance to its nearest gate using BFS from gates.', 'rooms = [[INF,-1,0,INF],...]', 'nearest distances'],
  [8, 'Graphs', 207, 'Course Schedule', 'medium', 'Determine if it is possible to finish all numCourses courses given prerequisite directed edges.', 'numCourses = 2, prerequisites = [[1, 0]]', 'true'],
  [8, 'Graphs', 210, 'Course Schedule II', 'medium', 'Return a valid ordering of courses to finish all courses (topological sort), or empty array if impossible.', 'numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]', '[0, 2, 1, 3]'],
  [8, 'Graphs', 684, 'Redundant Connection', 'medium', 'Find an edge that can be removed from a graph so that the resulting graph is a tree of n nodes.', 'edges = [[1, 2], [1, 3], [2, 3]]', '[2, 3]'],
  [8, 'Graphs', 323, 'Number of Connected Components In An Undirected Graph', 'medium', 'Given n nodes and a list of undirected edges, return the number of connected components.', 'n = 5, edges = [[0,1],[1,2],[3,4]]', '2'],
  [8, 'Graphs', 261, 'Graph Valid Tree', 'medium', 'Check whether n nodes and given undirected edges form a valid tree (connected and acyclic).', 'n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]', 'true'],
  [8, 'Graphs', 127, 'Word Ladder', 'hard', 'Find the length of the shortest transformation sequence from beginWord to endWord changing one letter at a time.', 'beginWord = "hit", endWord = "cog"', '5'],

  // Week 9 — Advanced Graphs
  [9, 'Advanced Graphs', 1584, 'Min Cost to Connect All Points', 'medium', 'Return the minimum Manhattan distance cost to connect all 2D points (Minimum Spanning Tree).', 'points = [[0,0],[2,2],[3,10],[5,2],[7,0]]', '20'],
  [9, 'Advanced Graphs', 743, 'Network Delay Time', 'medium', 'Compute the minimum time it takes for all n nodes to receive a signal sent from node k using Dijkstra.', 'times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2', '2'],
  [9, 'Advanced Graphs', 787, 'Cheapest Flights Within K Stops', 'medium', 'Find the cheapest flight price from src to dst with at most k stops.', 'n = 4, flights = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], k = 1', '700'],
  [9, 'Advanced Graphs', 332, 'Reconstruct Itinerary', 'hard', 'Reconstruct the lexicographically smallest itinerary starting from "JFK" using Hierholzer Eulerian path.', 'tickets = [["MUC","LHR"],["JFK","MUC"],["SFO","SJC"],["LHR","SFO"]]', '["JFK","MUC","LHR","SFO","SJC"]'],
  [9, 'Advanced Graphs', 778, 'Swim In Rising Water', 'hard', 'Find the least time t until you can swim from top-left to bottom-right in an n x n elevation grid.', 'grid = [[0,2],[1,3]]', '3'],
  [9, 'Advanced Graphs', 269, 'Alien Dictionary', 'hard', 'Derive the character order of an alien language from a sorted list of alien words using topological sort.', 'words = ["wrt","wrf","er","ett","rftt"]', '"wertf"'],

  // Week 9 — Math & Geometry
  [
    9,
    'Math & Geometry',
    202,
    'Happy Number',
    'easy',
    'Determine if replacing n repeatedly by the sum of squares of its digits eventually equals 1.',
    'n = 19',
    'true',
    'isHappy',
    `def isHappy(n: int) -> bool:\n    seen = set()\n    while n != 1 and n not in seen:\n        seen.add(n)\n        n = sum(int(d) ** 2 for d in str(n))\n    return n == 1\n\nprint(isHappy(19))`,
    `function isHappy(n) {\n  const seen = new Set();\n  while (n !== 1 && !seen.has(n)) {\n    seen.add(n);\n    let next = 0;\n    while (n > 0) {\n      const d = n % 10;\n      next += d * d;\n      n = Math.floor(n / 10);\n    }\n    n = next;\n  }\n  return n === 1;\n}\n\nconsole.log(isHappy(19));`
  ],
  [9, 'Math & Geometry', 66, 'Plus One', 'easy', 'Increment a large integer represented as an integer array of digits by one.', 'digits = [1, 2, 3]', '[1, 2, 4]'],
  [9, 'Math & Geometry', 48, 'Rotate Image', 'medium', 'Rotate an n x n 2D matrix representing an image by 90 degrees clockwise in-place.', 'matrix = [[1,2,3],[4,5,6],[7,8,9]]', '[[7,4,1],[8,5,2],[9,6,3]]'],
  [9, 'Math & Geometry', 54, 'Spiral Matrix', 'medium', 'Given an m x n matrix, return all elements of the matrix in spiral order.', 'matrix = [[1,2,3],[4,5,6],[7,8,9]]', '[1,2,3,6,9,8,7,4,5]'],
  [9, 'Math & Geometry', 73, 'Set Matrix Zeroes', 'medium', 'If an element in an m x n integer matrix is 0, set its entire row and column to 0 in-place.', 'matrix = [[1,1,1],[1,0,1],[1,1,1]]', '[[1,0,1],[0,0,0],[1,0,1]]'],
  [9, 'Math & Geometry', 50, 'Pow(x, n)', 'medium', 'Implement pow(x, n), which calculates x raised to the power n using fast binary exponentiation.', 'x = 2.0, n = 10', '1024'],
  [9, 'Math & Geometry', 43, 'Multiply Strings', 'medium', 'Given two non-negative integers num1 and num2 represented as strings, return their product as a string.', 'num1 = "123", num2 = "456"', '"56088"'],
  [9, 'Math & Geometry', 2013, 'Detect Squares', 'medium', 'Design a data structure on a 2D plane supporting add(point) and count(queryPoint) axis-aligned squares.', 'add([3,10]), add([11,2]), add([3,2]), count([11,10])', '1'],

  // Week 10 — 1-D Dynamic Programming
  [
    10,
    '1-D Dynamic Programming',
    70,
    'Climbing Stairs',
    'easy',
    'Each time you can climb 1 or 2 steps. In how many distinct ways can you climb to the top of n stairs?',
    'n = 5',
    '8',
    'climbStairs',
    `def climbStairs(n: int) -> int:\n    a, b = 1, 1\n    for _ in range(n - 1):\n        a, b = a + b, a\n    return a\n\nprint(climbStairs(5))`,
    `function climbStairs(n) {\n  let a = 1, b = 1;\n  for (let i = 0; i < n - 1; i++) {\n    const next = a + b;\n    b = a;\n    a = next;\n  }\n  return a;\n}\n\nconsole.log(climbStairs(5));`
  ],
  [10, '1-D Dynamic Programming', 746, 'Min Cost Climbing Stairs', 'easy', 'Return the minimum cost to reach the top of the floor given step costs where you may climb 1 or 2 steps.', 'cost = [10, 15, 20]', '15'],
  [
    10,
    '1-D Dynamic Programming',
    198,
    'House Robber',
    'medium',
    'Determine the maximum amount of money you can rob tonight without robbing two adjacent houses.',
    'nums = [2, 7, 9, 3, 1]',
    '12',
    'rob',
    `def rob(nums: list[int]) -> int:\n    r1, r2 = 0, 0\n    for n in nums:\n        r1, r2 = r2, max(n + r1, r2)\n    return r2\n\nprint(rob([2, 7, 9, 3, 1]))`,
    `function rob(nums) {\n  let r1 = 0, r2 = 0;\n  for (const n of nums) {\n    const next = Math.max(n + r1, r2);\n    r1 = r2;\n    r2 = next;\n  }\n  return r2;\n}\n\nconsole.log(rob([2, 7, 9, 3, 1]));`
  ],
  [10, '1-D Dynamic Programming', 213, 'House Robber II', 'medium', 'Same as House Robber except all houses are arranged in a circle (first and last houses are adjacent).', 'nums = [2, 3, 2]', '3'],
  [10, '1-D Dynamic Programming', 5, 'Longest Palindromic Substring', 'medium', 'Given a string s, return the longest palindromic substring in s.', 's = "babad"', '"bab"'],
  [10, '1-D Dynamic Programming', 647, 'Palindromic Substrings', 'medium', 'Given a string s, return the number of palindromic substrings in it.', 's = "aaa"', '6'],
  [10, '1-D Dynamic Programming', 91, 'Decode Ways', 'medium', 'Count the number of ways a digit string can be decoded to letters A-Z (1-26).', 's = "226"', '3'],
  [
    10,
    '1-D Dynamic Programming',
    322,
    'Coin Change',
    'medium',
    'Return the fewest number of coins needed to make up amount, or -1 if that amount cannot be made.',
    'coins = [1, 2, 5], amount = 11',
    '3',
    'coinChange',
    `def coinChange(coins: list[int], amount: int) -> int:\n    dp = [amount + 1] * (amount + 1)\n    dp[0] = 0\n    for a in range(1, amount + 1):\n        for c in coins:\n            if a - c >= 0:\n                dp[a] = min(dp[a], 1 + dp[a - c])\n    return dp[amount] if dp[amount] <= amount else -1\n\nprint(coinChange([1, 2, 5], 11))`,
    `function coinChange(coins, amount) {\n  const dp = new Array(amount + 1).fill(amount + 1);\n  dp[0] = 0;\n  for (let a = 1; a <= amount; a++) {\n    for (const c of coins) {\n      if (a - c >= 0) dp[a] = Math.min(dp[a], 1 + dp[a - c]);\n    }\n  }\n  return dp[amount] <= amount ? dp[amount] : -1;\n}\n\nconsole.log(coinChange([1, 2, 5], 11));`
  ],
  [10, '1-D Dynamic Programming', 152, 'Maximum Product Subarray', 'medium', 'Find the contiguous subarray within nums that has the largest product and return it.', 'nums = [2, 3, -2, 4]', '6'],
  [10, '1-D Dynamic Programming', 139, 'Word Break', 'medium', 'Return true if string s can be segmented into a space-separated sequence of dictionary words.', 's = "leetcode", wordDict = ["leet", "code"]', 'true'],
  [10, '1-D Dynamic Programming', 300, 'Longest Increasing Subsequence', 'medium', 'Given an integer array nums, return the length of the longest strictly increasing subsequence.', 'nums = [10, 9, 2, 5, 3, 7, 101, 18]', '4'],
  [10, '1-D Dynamic Programming', 416, 'Partition Equal Subset Sum', 'medium', 'Return true if nums can be partitioned into two subsets with equal sum.', 'nums = [1, 5, 11, 5]', 'true'],

  // Week 11 — 2-D Dynamic Programming
  [
    11,
    '2-D Dynamic Programming',
    62,
    'Unique Paths',
    'medium',
    'Count how many possible unique paths exist from top-left to bottom-right in an m x n grid moving only right or down.',
    'm = 3, n = 7',
    '28',
    'uniquePaths',
    `def uniquePaths(m: int, n: int) -> int:\n    row = [1] * n\n    for _ in range(m - 1):\n        for c in range(n - 2, -1, -1):\n            row[c] += row[c + 1]\n    return row[0]\n\nprint(uniquePaths(3, 7))`,
    `function uniquePaths(m, n) {\n  const row = new Array(n).fill(1);\n  for (let r = 0; r < m - 1; r++) {\n    for (let c = n - 2; c >= 0; c--) {\n      row[c] += row[c + 1];\n    }\n  }\n  return row[0];\n}\n\nconsole.log(uniquePaths(3, 7));`
  ],
  [11, '2-D Dynamic Programming', 1143, 'Longest Common Subsequence', 'medium', 'Return the length of the longest common subsequence between strings text1 and text2.', 'text1 = "abcde", text2 = "ace"', '3'],
  [11, '2-D Dynamic Programming', 309, 'Best Time to Buy And Sell Stock With Cooldown', 'medium', 'Maximize stock profit with an unlimited number of transactions and a 1-day cooldown after selling.', 'prices = [1, 2, 3, 0, 2]', '3'],
  [11, '2-D Dynamic Programming', 518, 'Coin Change II', 'medium', 'Return the number of combinations of coins that make up amount.', 'amount = 5, coins = [1, 2, 5]', '4'],
  [11, '2-D Dynamic Programming', 494, 'Target Sum', 'medium', 'Assign "+" or "-" before each integer in nums to count expressions evaluating to target.', 'nums = [1, 1, 1, 1, 1], target = 3', '5'],
  [11, '2-D Dynamic Programming', 97, 'Interleaving String', 'medium', 'Determine whether string s3 is formed by interleaving strings s1 and s2.', 's1 = "aabcc", s2 = "dbbca", s3 = "aadbbcbcac"', 'true'],
  [11, '2-D Dynamic Programming', 72, 'Edit Distance', 'medium', 'Return the minimum number of operations (insert, delete, replace) required to convert word1 to word2.', 'word1 = "horse", word2 = "ros"', '3'],
  [11, '2-D Dynamic Programming', 329, 'Longest Increasing Path In a Matrix', 'hard', 'Given an m x n integer matrix, return the length of the longest strictly increasing path.', 'matrix = [[9,9,4],[6,6,8],[2,1,1]]', '4'],
  [11, '2-D Dynamic Programming', 115, 'Distinct Subsequences', 'hard', 'Given two strings s and t, return the number of distinct subsequences of s which equals t.', 's = "rabbbit", t = "rabbit"', '3'],
  [11, '2-D Dynamic Programming', 312, 'Burst Balloons', 'hard', 'Burst all balloons wisely to maximize collected coins.', 'nums = [3, 1, 5, 8]', '167'],
  [11, '2-D Dynamic Programming', 10, 'Regular Expression Matching', 'hard', 'Implement regular expression matching with support for "." and "*".', 's = "aa", p = "a*"', 'true'],

  // Week 12 — Bit Manipulation
  [
    12,
    'Bit Manipulation',
    136,
    'Single Number',
    'easy',
    'Every element in nums appears twice except for one. Find that single element in O(n) time and O(1) space.',
    'nums = [4, 1, 2, 1, 2]',
    '4',
    'singleNumber',
    `def singleNumber(nums: list[int]) -> int:\n    res = 0\n    for n in nums:\n        res ^= n\n    return res\n\nprint(singleNumber([4, 1, 2, 1, 2]))`,
    `function singleNumber(nums) {\n  let res = 0;\n  for (const n of nums) res ^= n;\n  return res;\n}\n\nconsole.log(singleNumber([4, 1, 2, 1, 2]));`
  ],
  [
    12,
    'Bit Manipulation',
    191,
    'Number of 1 Bits',
    'easy',
    'Write a function that takes an unsigned integer and returns the number of 1 bits (Hamming weight).',
    'n = 11 (binary 1011)',
    '3',
    'hammingWeight',
    `def hammingWeight(n: int) -> int:\n    count = 0\n    while n:\n        n &= n - 1\n        count += 1\n    return count\n\nprint(hammingWeight(11))`,
    `function hammingWeight(n) {\n  let count = 0;\n  while (n !== 0) {\n    n &= n - 1;\n    count++;\n  }\n  return count;\n}\n\nconsole.log(hammingWeight(11));`
  ],
  [
    12,
    'Bit Manipulation',
    338,
    'Counting Bits',
    'easy',
    'Given an integer n, return an array ans of length n + 1 where ans[i] is the number of 1s in the binary representation of i.',
    'n = 5',
    '[0, 1, 1, 2, 1, 2]',
    'countBits',
    `def countBits(n: int) -> list[int]:\n    dp = [0] * (n + 1)\n    for i in range(1, n + 1):\n        dp[i] = dp[i >> 1] + (i & 1)\n    return dp\n\nprint(countBits(5))`,
    `function countBits(n) {\n  const dp = new Array(n + 1).fill(0);\n  for (let i = 1; i <= n; i++) {\n    dp[i] = dp[i >> 1] + (i & 1);\n  }\n  return dp;\n}\n\nconsole.log(JSON.stringify(countBits(5)));`
  ],
  [12, 'Bit Manipulation', 190, 'Reverse Bits', 'easy', 'Reverse bits of a given 32 bits unsigned integer.', 'n = 43261596', '964176192'],
  [
    12,
    'Bit Manipulation',
    268,
    'Missing Number',
    'easy',
    'Given an array nums containing n distinct numbers in [0, n], return the only number missing from the array.',
    'nums = [3, 0, 1]',
    '2',
    'missingNumber',
    `def missingNumber(nums: list[int]) -> int:\n    res = len(nums)\n    for i, n in enumerate(nums):\n        res ^= i ^ n\n    return res\n\nprint(missingNumber([3, 0, 1]))`,
    `function missingNumber(nums) {\n  let res = nums.length;\n  for (let i = 0; i < nums.length; i++) {\n    res ^= i ^ nums[i];\n  }\n  return res;\n}\n\nconsole.log(missingNumber([3, 0, 1]));`
  ],
  [
    12,
    'Bit Manipulation',
    371,
    'Sum of Two Integers',
    'medium',
    'Given two integers a and b, return the sum of the two integers without using the + or - operators.',
    'a = 5, b = 7',
    '12',
    'getSum',
    `def getSum(a: int, b: int) -> int:\n    mask = 0xFFFFFFFF\n    while (b & mask) > 0:\n        carry = (a & b) << 1\n        a = a ^ b\n        b = carry\n    return (a & mask) if b > 0 else a\n\nprint(getSum(5, 7))`,
    `function getSum(a, b) {\n  while (b !== 0) {\n    const carry = (a & b) << 1;\n    a = a ^ b;\n    b = carry;\n  }\n  return a;\n}\n\nconsole.log(getSum(5, 7));`
  ]
];

export const CURRICULUM_PROBLEMS: CurriculumProblem[] = SPECS.map(
  ([week, category, leetcodeNumber, title, difficulty, description, sampleInput, sampleOutput, fnName, pyBody, jsBody]) => {
    const fn = fnName || toCamel(title);
    const pyTemplate =
      pyBody ||
      `# ${leetcodeNumber}. ${title} (${category})\n# Input: ${sampleInput}\n# Expected: ${sampleOutput}\n\ndef ${fn}():\n    # Write your solution here\n    return ${JSON.stringify(sampleOutput)}\n\nprint(${fn}())`;
    const jsTemplate =
      jsBody ||
      `// ${leetcodeNumber}. ${title} (${category})\n// Input: ${sampleInput}\n// Expected: ${sampleOutput}\n\nfunction ${fn}() {\n  // Write your solution here\n  return ${JSON.stringify(sampleOutput)};\n}\n\nconsole.log(${fn}());`;

    const cleanExpected = sampleOutput.replace(/^["']|["']$/g, '').split(',')[0].trim();
    const extraTopic =
      category === 'Arrays & Hashing'
        ? ['Array', 'Hash table']
        : category === 'Two Pointers'
        ? ['Two pointers', 'Array']
        : category === 'Sliding Window'
        ? ['Sliding window']
        : category === 'Stack'
        ? ['Stack']
        : category === 'Binary Search'
        ? ['Binary search']
        : category === 'Intervals'
        ? ['Intervals', 'Sorting']
        : category === 'Linked List'
        ? ['Linked list']
        : category === 'Trees'
        ? ['Tree', 'DFS']
        : category === 'Heap / Priority Queue'
        ? ['Heap']
        : category === 'Greedy'
        ? ['Greedy']
        : category === 'Backtracking'
        ? ['Backtracking']
        : category === 'Tries'
        ? ['Trie']
        : category === 'Graphs'
        ? ['Graph', 'BFS', 'DFS']
        : category === 'Advanced Graphs'
        ? ['Graph', 'Topological sort']
        : category === 'Math & Geometry'
        ? ['Math & Geometry']
        : category.includes('Dynamic Programming')
        ? ['Dynamic programming']
        : ['Bit manipulation'];

    return {
      id: `lc-${leetcodeNumber}-${toSlug(title)}`,
      week,
      category,
      leetcodeNumber,
      title,
      difficulty,
      topics: Array.from(new Set([category, ...extraTopic])),
      description,
      examples: [
        {
          input: sampleInput,
          output: sampleOutput
        }
      ],
      expectedPrintSubstring: cleanExpected || 'true',
      illustrationKey: leetcodeNumber === 695 ? 'island' : undefined,
      pythonCode: pyTemplate,
      javascriptCode: jsTemplate
    };
  }
);
