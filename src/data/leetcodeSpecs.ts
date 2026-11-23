import { AlgorithmProblem } from './visualizerProblems';

export interface LeetCodeParamSpec {
  name: string;
  pyType: string;
  jsType: string;
}

export interface LeetCodeTestCase {
  id: string;
  label: string;
  inputs: Array<{ name: string; value: string }>;
  expectedDisplay: string;
  hasExpected: boolean;
  isCustom?: boolean;
}

export interface LeetCodeProblemSpec {
  methodName: string;
  params: LeetCodeParamSpec[];
  returnType: { py: string; js: string };
  unorderedReturn?: boolean;
  isDesignClass?: boolean;
  constraints: string[];
  defaultTestCases: LeetCodeTestCase[];
  hiddenTestCases: LeetCodeTestCase[];
  pythonStub: string;
  javascriptStub: string;
}

function toCamelMethod(title: string): string {
  const cleaned = title
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (cleaned.length === 0) return 'solve';
  const [first, ...rest] = cleaned;
  let candidate =
    first.toLowerCase() +
    rest.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  if (/^[0-9]/.test(candidate)) {
    candidate = 'solve' + candidate.charAt(0).toUpperCase() + candidate.slice(1);
  }
  return candidate;
}

function inferTypeFromLiteral(rawValue: string): { py: string; js: string } {
  const v = rawValue.trim();
  if (v === 'true' || v === 'false' || v === 'True' || v === 'False') {
    return { py: 'bool', js: 'boolean' };
  }
  if (v.startsWith('"') || v.startsWith("'")) {
    return { py: 'str', js: 'string' };
  }
  if (v.startsWith('[[')) {
    return v.includes('"') || v.includes("'")
      ? { py: 'List[List[str]]', js: 'string[][]' }
      : { py: 'List[List[int]]', js: 'number[][]' };
  }
  if (v.startsWith('[')) {
    return v.includes('"') || v.includes("'")
      ? { py: 'List[str]', js: 'string[]' }
      : { py: 'List[int]', js: 'number[]' };
  }
  if (/^-?\d+\.\d+$/.test(v)) {
    return { py: 'float', js: 'number' };
  }
  if (/^-?\d+$/.test(v)) {
    return { py: 'int', js: 'number' };
  }
  return { py: 'Any', js: 'any' };
}

/**
 * Splits top-level "key = value, key2 = value2" respecting brackets and quotes.
 */
export function parseAssignmentList(inputStr: string): Array<{ name: string; value: string }> {
  const text = inputStr.trim();
  if (!text) return [];

  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote && text[i - 1] !== '\\') {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '[' || ch === '{' || ch === '(') {
      depth += 1;
      continue;
    }
    if (ch === ']' || ch === '}' || ch === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (ch === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = text.slice(start).trim();
  if (tail) parts.push(tail);

  const assignments: Array<{ name: string; value: string }> = [];
  for (let idx = 0; idx < parts.length; idx += 1) {
    const part = parts[idx];
    const eqIdx = part.indexOf('=');
    if (eqIdx > 0) {
      const rawName = part.slice(0, eqIdx).trim().replace(/[^a-zA-Z0-9_]/g, '');
      const rawVal = part
        .slice(eqIdx + 1)
        .trim()
        .replace(/\s*\([^)]*\)$/, '');
      if (rawName && rawVal) {
        assignments.push({ name: rawName, value: rawVal });
      }
    } else if (part) {
      assignments.push({ name: `arg${idx + 1}`, value: part });
    }
  }

  return assignments;
}

function isParseableJsonLiteral(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed || trimmed.includes('...')) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

interface SpecOverride {
  methodName?: string;
  params?: LeetCodeParamSpec[];
  returnType?: { py: string; js: string };
  unorderedReturn?: boolean;
  isDesignClass?: boolean;
  constraints?: string[];
  extraCases?: Array<{
    inputs: Array<{ name: string; value: string }>;
    expectedDisplay: string;
  }>;
  hiddenCases?: Array<{
    inputs: Array<{ name: string; value: string }>;
    expectedDisplay: string;
  }>;
}

const OVERRIDES: Record<string, SpecOverride> = {
  'two-sum': {
    methodName: 'twoSum',
    unorderedReturn: true,
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.'
    ],
    extraCases: [
      {
        inputs: [
          { name: 'nums', value: '[2, 7, 11, 15]' },
          { name: 'target', value: '9' }
        ],
        expectedDisplay: '[0, 1]'
      },
      {
        inputs: [
          { name: 'nums', value: '[3, 2, 4]' },
          { name: 'target', value: '6' }
        ],
        expectedDisplay: '[1, 2]'
      }
    ],
    hiddenCases: [
      {
        inputs: [
          { name: 'nums', value: '[3, 3]' },
          { name: 'target', value: '6' }
        ],
        expectedDisplay: '[0, 1]'
      }
    ]
  },
  'lc-217-contains-duplicate': {
    methodName: 'containsDuplicate',
    constraints: ['1 <= nums.length <= 10^5', '-10^9 <= nums[i] <= 10^9'],
    extraCases: [
      {
        inputs: [{ name: 'nums', value: '[1, 2, 3, 4]' }],
        expectedDisplay: 'false'
      }
    ],
    hiddenCases: [
      {
        inputs: [{ name: 'nums', value: '[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]' }],
        expectedDisplay: 'true'
      }
    ]
  },
  'lc-242-valid-anagram': {
    methodName: 'isAnagram',
    constraints: ['1 <= s.length, t.length <= 5 * 10^4', 's and t consist of lowercase English letters.'],
    extraCases: [
      {
        inputs: [
          { name: 's', value: '"rat"' },
          { name: 't', value: '"car"' }
        ],
        expectedDisplay: 'false'
      }
    ],
    hiddenCases: [
      {
        inputs: [
          { name: 's', value: '"aacc"' },
          { name: 't', value: '"ccac"' }
        ],
        expectedDisplay: 'false'
      }
    ]
  },
  'lc-49-group-anagrams': {
    methodName: 'groupAnagrams',
    unorderedReturn: true,
    extraCases: [
      {
        inputs: [{ name: 'strs', value: '[""]' }],
        expectedDisplay: '[[""]]'
      }
    ],
    hiddenCases: [
      {
        inputs: [{ name: 'strs', value: '["a"]' }],
        expectedDisplay: '[["a"]]'
      }
    ]
  },
  'lc-347-top-k-frequent-elements': {
    methodName: 'topKFrequent',
    unorderedReturn: true,
    extraCases: [
      {
        inputs: [
          { name: 'nums', value: '[1]' },
          { name: 'k', value: '1' }
        ],
        expectedDisplay: '[1]'
      }
    ]
  },
  'lc-125-valid-palindrome': {
    methodName: 'isPalindrome',
    extraCases: [
      {
        inputs: [{ name: 's', value: '"race a car"' }],
        expectedDisplay: 'false'
      }
    ],
    hiddenCases: [
      {
        inputs: [{ name: 's', value: '" "' }],
        expectedDisplay: 'true'
      }
    ]
  },
  'lc-167-two-sum-ii-input-array-is-sorted': {
    methodName: 'twoSum',
    extraCases: [
      {
        inputs: [
          { name: 'numbers', value: '[2, 3, 4]' },
          { name: 'target', value: '6' }
        ],
        expectedDisplay: '[1, 3]'
      }
    ]
  },
  'lc-15-3sum': {
    methodName: 'threeSum',
    unorderedReturn: true,
    extraCases: [
      {
        inputs: [{ name: 'nums', value: '[0, 1, 1]' }],
        expectedDisplay: '[]'
      }
    ],
    hiddenCases: [
      {
        inputs: [{ name: 'nums', value: '[0, 0, 0]' }],
        expectedDisplay: '[[0, 0, 0]]'
      }
    ]
  },
  'lc-42-trapping-rain-water': {
    methodName: 'trap',
    extraCases: [
      {
        inputs: [{ name: 'height', value: '[4, 2, 0, 3, 2, 5]' }],
        expectedDisplay: '9'
      }
    ]
  },
  'lc-121-best-time-to-buy-and-sell-stock': {
    methodName: 'maxProfit',
    extraCases: [
      {
        inputs: [{ name: 'prices', value: '[7, 6, 4, 3, 1]' }],
        expectedDisplay: '0'
      }
    ]
  },
  'lc-3-longest-substring-without-repeating-characters': {
    methodName: 'lengthOfLongestSubstring',
    extraCases: [
      {
        inputs: [{ name: 's', value: '"bbbbb"' }],
        expectedDisplay: '1'
      },
      {
        inputs: [{ name: 's', value: '"pwwkew"' }],
        expectedDisplay: '3'
      }
    ]
  },
  'lc-20-valid-parentheses': {
    methodName: 'isValid',
    extraCases: [
      {
        inputs: [{ name: 's', value: '"()[]{}"' }],
        expectedDisplay: 'true'
      },
      {
        inputs: [{ name: 's', value: '"(]"' }],
        expectedDisplay: 'false'
      }
    ]
  },
  'lc-704-binary-search': {
    methodName: 'search',
    extraCases: [
      {
        inputs: [
          { name: 'nums', value: '[-1, 0, 3, 5, 9, 12]' },
          { name: 'target', value: '2' }
        ],
        expectedDisplay: '-1'
      }
    ]
  },
  'lc-70-climbing-stairs': {
    methodName: 'climbStairs',
    extraCases: [
      {
        inputs: [{ name: 'n', value: '3' }],
        expectedDisplay: '3'
      }
    ],
    hiddenCases: [
      {
        inputs: [{ name: 'n', value: '5' }],
        expectedDisplay: '8'
      }
    ]
  },
  'lc-198-house-robber': {
    methodName: 'rob',
    extraCases: [
      {
        inputs: [{ name: 'nums', value: '[2, 7, 9, 3, 1]' }],
        expectedDisplay: '12'
      }
    ]
  },
  'lc-53-maximum-subarray': {
    methodName: 'maxSubArray',
    extraCases: [
      {
        inputs: [{ name: 'nums', value: '[5, 4, -1, 7, 8]' }],
        expectedDisplay: '23'
      }
    ]
  },
  'lc-322-coin-change': {
    methodName: 'coinChange',
    extraCases: [
      {
        inputs: [
          { name: 'coins', value: '[2]' },
          { name: 'amount', value: '3' }
        ],
        expectedDisplay: '-1'
      }
    ]
  },
  'container-with-most-water': {
    methodName: 'maxArea',
    extraCases: [
      {
        inputs: [{ name: 'height', value: '[1, 8, 6, 2, 5, 4, 8, 3, 7]' }],
        expectedDisplay: '49'
      }
    ]
  },
  'merge-intervals': {
    methodName: 'merge',
    extraCases: [
      {
        inputs: [{ name: 'intervals', value: '[[1, 4], [4, 5]]' }],
        expectedDisplay: '[[1, 5]]'
      }
    ]
  },
  'product-except-self': {
    methodName: 'productExceptSelf',
    extraCases: [
      {
        inputs: [{ name: 'nums', value: '[-1, 1, 0, -3, 3]' }],
        expectedDisplay: '[0, 0, 9, 0, 0]'
      }
    ]
  },
  'largest-island': {
    methodName: 'maxAreaOfIsland',
    extraCases: [
      {
        inputs: [{ name: 'grid', value: '[[0, 0, 0, 0, 0, 0, 0, 0]]' }],
        expectedDisplay: '0'
      }
    ]
  },
  'move-zeroes': {
    methodName: 'moveZeroes',
    returnType: { py: 'List[int]', js: 'number[]' },
    extraCases: [
      {
        inputs: [{ name: 'nums', value: '[0]' }],
        expectedDisplay: '[0]'
      }
    ]
  },
  'lc-155-min-stack': { methodName: 'MinStack', isDesignClass: true },
  'lc-146-lru-cache': { methodName: 'LRUCache', isDesignClass: true },
  'lc-208-implement-trie-prefix-tree': { methodName: 'Trie', isDesignClass: true },
  'lc-211-design-add-and-search-words-data-structure': { methodName: 'WordDictionary', isDesignClass: true },
  'lc-981-time-based-key-value-store': { methodName: 'TimeMap', isDesignClass: true },
  'lc-355-design-twitter': { methodName: 'Twitter', isDesignClass: true },
  'lc-295-find-median-from-data-stream': { methodName: 'MedianFinder', isDesignClass: true },
  'lc-2013-detect-squares': { methodName: 'DetectSquares', isDesignClass: true },
  'lc-703-kth-largest-element-in-a-stream': { methodName: 'KthLargest', isDesignClass: true },
  'lc-136-single-number': {
    methodName: 'singleNumber',
    extraCases: [
      {
        inputs: [{ name: 'nums', value: '[2, 2, 1]' }],
        expectedDisplay: '1'
      }
    ]
  }
};

function buildPythonStub(
  methodName: string,
  params: LeetCodeParamSpec[],
  returnType: string,
  isDesignClass?: boolean
): string {
  if (isDesignClass) {
    return `class ${methodName}:\n    def __init__(self):\n        \n`;
  }
  const sigParams = ['self', ...params.map((p) => `${p.name}: ${p.pyType}`)].join(', ');
  return `class Solution:\n    def ${methodName}(${sigParams}) -> ${returnType}:\n        `;
}

function buildJavaScriptStub(
  methodName: string,
  params: LeetCodeParamSpec[],
  returnType: string,
  isDesignClass?: boolean
): string {
  if (isDesignClass) {
    return `class ${methodName} {\n    constructor() {\n        \n    }\n}`;
  }
  const jsDocParams = params
    .map((p) => ` * @param {${p.jsType}} ${p.name}`)
    .join('\n');
  const paramNames = params.map((p) => p.name).join(', ');
  return `/**\n${jsDocParams}\n * @return {${returnType}}\n */\nvar ${methodName} = function(${paramNames}) {\n    \n};`;
}

export function getLeetCodeSpec(problem: AlgorithmProblem): LeetCodeProblemSpec {
  const override = OVERRIDES[problem.id] || {};
  const methodName = override.methodName || toCamelMethod(problem.title);

  const parsedExamples: LeetCodeTestCase[] = problem.examples.map((ex, idx) => {
    const inputs = parseAssignmentList(ex.input);
    const cleanedOut = ex.output.trim();
    return {
      id: `case-${idx + 1}`,
      label: `Case ${idx + 1}`,
      inputs: inputs.length > 0 ? inputs : [{ name: 'input', value: ex.input }],
      expectedDisplay: cleanedOut,
      hasExpected: isParseableJsonLiteral(cleanedOut)
    };
  });

  const extraCases: LeetCodeTestCase[] = (override.extraCases || []).map((c, idx) => ({
    id: `case-${parsedExamples.length + idx + 1}`,
    label: `Case ${parsedExamples.length + idx + 1}`,
    inputs: c.inputs,
    expectedDisplay: c.expectedDisplay,
    hasExpected: isParseableJsonLiteral(c.expectedDisplay)
  }));

  const defaultTestCases = [...parsedExamples, ...extraCases];
  const hiddenTestCases: LeetCodeTestCase[] = (override.hiddenCases || []).map((c, idx) => ({
    id: `hidden-${idx + 1}`,
    label: `Hidden ${idx + 1}`,
    inputs: c.inputs,
    expectedDisplay: c.expectedDisplay,
    hasExpected: isParseableJsonLiteral(c.expectedDisplay)
  }));

  const firstInputs = defaultTestCases[0]?.inputs || [{ name: 'nums', value: '[1, 2, 3]' }];
  const params: LeetCodeParamSpec[] =
    override.params ||
    firstInputs.map((inp) => {
      const inferred = inferTypeFromLiteral(inp.value);
      return {
        name: inp.name,
        pyType: inferred.py,
        jsType: inferred.js
      };
    });

  const firstOutput = defaultTestCases[0]?.expectedDisplay || 'true';
  const returnType = override.returnType || inferTypeFromLiteral(firstOutput);

  const defaultConstraints = override.constraints || [
    'All sample inputs fit within standard 32-bit / 64-bit bounds.',
    'Optimize both time and space complexity where possible.'
  ];

  return {
    methodName,
    params,
    returnType,
    unorderedReturn: override.unorderedReturn,
    isDesignClass: override.isDesignClass,
    constraints: defaultConstraints,
    defaultTestCases,
    hiddenTestCases,
    pythonStub: buildPythonStub(methodName, params, returnType.py, override.isDesignClass),
    javascriptStub: buildJavaScriptStub(methodName, params, returnType.js, override.isDesignClass)
  };
}
