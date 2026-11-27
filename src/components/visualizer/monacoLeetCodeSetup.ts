let completionsRegistered = false;

export function configureLeetCodeMonaco(monaco: any) {
  monaco.editor.defineTheme('ntree-obsidian', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '569cd6' },
      { token: 'type', foreground: '4ec9b0' },
      { token: 'identifier', foreground: '9cdcfe' },
      { token: 'function', foreground: 'dcdcaa' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'delimiter.bracket', foreground: 'd4d4d4' }
    ],
    colors: {
      'editor.background': '#262626',
      'editor.foreground': '#d4d4d4',
      'editorCursor.foreground': '#34d399',
      'editor.lineHighlightBackground': '#2e2e2e',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#3a3d41',
      'editorLineNumber.foreground': '#737373',
      'editorLineNumber.activeForeground': '#d4d4d4',
      'editorGutter.background': '#262626',
      'editorIndentGuide.background1': '#363636',
      'editorIndentGuide.activeBackground1': '#525252',
      'editorBracketMatch.background': '#34d39926',
      'editorBracketMatch.border': '#34d39988'
    }
  });
  monaco.editor.setTheme('ntree-obsidian');

  if (completionsRegistered) return;
  completionsRegistered = true;

  const Kind = monaco.languages.CompletionItemKind;
  const InsertAsSnippet = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;

  monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      const suggestions = [
        {
          label: 'def',
          kind: Kind.Snippet,
          insertText: 'def ${1:name}(self, ${2:args}) -> ${3:None}:\n    ${4:pass}',
          insertTextRules: InsertAsSnippet,
          documentation: 'Define a Solution method',
          range
        },
        {
          label: 'fori',
          kind: Kind.Snippet,
          insertText: 'for ${1:i} in range(${2:len(nums)}):\n    ${3}',
          insertTextRules: InsertAsSnippet,
          documentation: 'Index loop over range',
          range
        },
        {
          label: 'forenum',
          kind: Kind.Snippet,
          insertText: 'for ${1:i}, ${2:val} in enumerate(${3:nums}):\n    ${4}',
          insertTextRules: InsertAsSnippet,
          documentation: 'Enumerate index and element',
          range
        },
        {
          label: 'deque',
          kind: Kind.Class,
          insertText: 'deque(${1})',
          insertTextRules: InsertAsSnippet,
          documentation: 'collections.deque (pre-imported)',
          range
        },
        {
          label: 'defaultdict',
          kind: Kind.Class,
          insertText: 'defaultdict(${1:list})',
          insertTextRules: InsertAsSnippet,
          documentation: 'collections.defaultdict (pre-imported)',
          range
        },
        {
          label: 'Counter',
          kind: Kind.Class,
          insertText: 'Counter(${1:items})',
          insertTextRules: InsertAsSnippet,
          documentation: 'collections.Counter (pre-imported)',
          range
        },
        {
          label: 'heapq.heappush',
          kind: Kind.Function,
          insertText: 'heapq.heappush(${1:heap}, ${2:item})',
          insertTextRules: InsertAsSnippet,
          documentation: 'Push item onto min-heap',
          range
        },
        {
          label: 'heapq.heappop',
          kind: Kind.Function,
          insertText: 'heapq.heappop(${1:heap})',
          insertTextRules: InsertAsSnippet,
          documentation: 'Pop smallest item from min-heap',
          range
        },
        {
          label: 'bisect.bisect_left',
          kind: Kind.Function,
          insertText: 'bisect.bisect_left(${1:arr}, ${2:target})',
          insertTextRules: InsertAsSnippet,
          documentation: 'Binary search leftmost insertion index',
          range
        },
        {
          label: 'float("inf")',
          kind: Kind.Constant,
          insertText: 'float("inf")',
          documentation: 'Positive infinity',
          range
        },
        {
          label: 'List',
          kind: Kind.TypeParameter,
          insertText: 'List[${1:int}]',
          insertTextRules: InsertAsSnippet,
          documentation: 'typing.List (pre-imported)',
          range
        },
        {
          label: 'Optional',
          kind: Kind.TypeParameter,
          insertText: 'Optional[${1:int}]',
          insertTextRules: InsertAsSnippet,
          documentation: 'typing.Optional (pre-imported)',
          range
        }
      ];

      return { suggestions };
    }
  });

  monaco.languages.registerCompletionItemProvider('javascript', {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      const suggestions = [
        {
          label: 'fori',
          kind: Kind.Snippet,
          insertText: 'for (let ${1:i} = 0; ${1:i} < ${2:nums}.length; ${1:i}++) {\n    ${3}\n}',
          insertTextRules: InsertAsSnippet,
          documentation: 'Standard indexed for loop',
          range
        },
        {
          label: 'forof',
          kind: Kind.Snippet,
          insertText: 'for (const ${1:item} of ${2:items}) {\n    ${3}\n}',
          insertTextRules: InsertAsSnippet,
          documentation: 'for..of loop',
          range
        },
        {
          label: 'new Map',
          kind: Kind.Class,
          insertText: 'new Map()',
          documentation: 'ES6 Hash Map',
          range
        },
        {
          label: 'new Set',
          kind: Kind.Class,
          insertText: 'new Set(${1})',
          insertTextRules: InsertAsSnippet,
          documentation: 'ES6 Hash Set',
          range
        },
        {
          label: 'Array.from',
          kind: Kind.Function,
          insertText: 'Array.from({ length: ${1:n} }, () => ${2:0})',
          insertTextRules: InsertAsSnippet,
          documentation: 'Create initialized array of length n',
          range
        },
        {
          label: 'Math.max',
          kind: Kind.Function,
          insertText: 'Math.max(${1:a}, ${2:b})',
          insertTextRules: InsertAsSnippet,
          documentation: 'Maximum of numbers',
          range
        },
        {
          label: 'Math.min',
          kind: Kind.Function,
          insertText: 'Math.min(${1:a}, ${2:b})',
          insertTextRules: InsertAsSnippet,
          documentation: 'Minimum of numbers',
          range
        }
      ];

      return { suggestions };
    }
  });

  monaco.languages.registerCompletionItemProvider('typescript', {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      return {
        suggestions: [
          {
            label: 'fori',
            kind: Kind.Snippet,
            insertText: 'for (let ${1:i} = 0; ${1:i} < ${2:nums}.length; ${1:i}++) {\n    ${3}\n}',
            insertTextRules: InsertAsSnippet,
            documentation: 'Indexed loop',
            range
          },
          {
            label: 'Map<number, number>',
            kind: Kind.Class,
            insertText: 'new Map<${1:number}, ${2:number}>()',
            insertTextRules: InsertAsSnippet,
            documentation: 'Typed Hash Map',
            range
          },
          {
            label: 'Set<number>',
            kind: Kind.Class,
            insertText: 'new Set<${1:number}>()',
            insertTextRules: InsertAsSnippet,
            documentation: 'Typed Hash Set',
            range
          }
        ]
      };
    }
  });

  monaco.languages.registerCompletionItemProvider('java', {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      return {
        suggestions: [
          {
            label: 'fori',
            kind: Kind.Snippet,
            insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:nums.length}; ${1:i}++) {\n    ${3}\n}',
            insertTextRules: InsertAsSnippet,
            documentation: 'Indexed for loop',
            range
          },
          {
            label: 'HashMap',
            kind: Kind.Class,
            insertText: 'Map<${1:Integer}, ${2:Integer}> ${3:map} = new HashMap<>();',
            insertTextRules: InsertAsSnippet,
            documentation: 'Java HashMap',
            range
          },
          {
            label: 'HashSet',
            kind: Kind.Class,
            insertText: 'Set<${1:Integer}> ${2:set} = new HashSet<>();',
            insertTextRules: InsertAsSnippet,
            documentation: 'Java HashSet',
            range
          },
          {
            label: 'ArrayList',
            kind: Kind.Class,
            insertText: 'List<${1:Integer}> ${2:res} = new ArrayList<>();',
            insertTextRules: InsertAsSnippet,
            documentation: 'Java ArrayList',
            range
          },
          {
            label: 'ArrayDeque',
            kind: Kind.Class,
            insertText: 'Deque<${1:Integer}> ${2:q} = new ArrayDeque<>();',
            insertTextRules: InsertAsSnippet,
            documentation: 'Java Queue/Stack via ArrayDeque',
            range
          },
          {
            label: 'sout',
            kind: Kind.Snippet,
            insertText: 'System.out.println(${1});',
            insertTextRules: InsertAsSnippet,
            documentation: 'Print line to stdout',
            range
          }
        ]
      };
    }
  });

  monaco.languages.registerCompletionItemProvider('cpp', {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      return {
        suggestions: [
          {
            label: 'fori',
            kind: Kind.Snippet,
            insertText: 'for (int ${1:i} = 0; ${1:i} < (int)${2:nums}.size(); ${1:i}++) {\n    ${3}\n}',
            insertTextRules: InsertAsSnippet,
            documentation: 'Indexed loop over vector',
            range
          },
          {
            label: 'unordered_map',
            kind: Kind.Class,
            insertText: 'unordered_map<${1:int}, ${2:int}> ${3:mp};',
            insertTextRules: InsertAsSnippet,
            documentation: 'STL hash map',
            range
          },
          {
            label: 'unordered_set',
            kind: Kind.Class,
            insertText: 'unordered_set<${1:int}> ${2:seen};',
            insertTextRules: InsertAsSnippet,
            documentation: 'STL hash set',
            range
          },
          {
            label: 'sort',
            kind: Kind.Function,
            insertText: 'sort(${1:nums}.begin(), ${1:nums}.end());',
            insertTextRules: InsertAsSnippet,
            documentation: 'STL sort ascending',
            range
          }
        ]
      };
    }
  });

  monaco.languages.registerCompletionItemProvider('c', {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      return {
        suggestions: [
          {
            label: 'fori',
            kind: Kind.Snippet,
            insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    ${3}\n}',
            insertTextRules: InsertAsSnippet,
            documentation: 'Indexed for loop',
            range
          },
          {
            label: 'malloc',
            kind: Kind.Function,
            insertText: '(${1:int}*)malloc(sizeof(${1:int}) * (${2:n}))',
            insertTextRules: InsertAsSnippet,
            documentation: 'Allocate heap array',
            range
          },
          {
            label: 'printf',
            kind: Kind.Function,
            insertText: 'printf("${1:%d}\\n", ${2:val});',
            insertTextRules: InsertAsSnippet,
            documentation: 'Formatted print',
            range
          }
        ]
      };
    }
  });
}
