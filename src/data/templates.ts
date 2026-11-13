import { CodeTemplate } from '../types';

export const CODE_TEMPLATES: CodeTemplate[] = [
  {
    id: 'py-list-agg',
    title: 'Python: Data Transformation & Stats',
    language: 'python',
    category: 'Algorithms',
    description: 'Calculates mean, variance, and list comprehensions using standard Python arithmetic.',
    code: `# PolyglotMesh GraalPy Execution
data = [14, 28, 42, 56, 70, 84, 98, 112]

total = sum(data)
count = len(data)
mean = total / count
variance = sum((x - mean) ** 2 for x in data) / count

print("--- PolyglotMesh Data Analysis ---")
print(f"Sample count: {count}")
print(f"Sample values: {data}")
print(f"Computed mean: {mean:.2f}")
print(f"Sample variance: {variance:.2f}")

evens = [x for x in data if x % 2 == 0]
print(f"Verified even items: {len(evens)}")
`
  },
  {
    id: 'js-matrix-algo',
    title: 'JavaScript: Matrix & Fibonacci Stream',
    language: 'javascript',
    category: 'Algorithms',
    description: 'Generates Fibonacci sequences and performs matrix transposition in GraalJS.',
    code: `// PolyglotMesh GraalJS Execution
function generateFibonacci(n) {
  const seq = [0, 1];
  for (let i = 2; i < n; i++) {
    seq.push(seq[i - 1] + seq[i - 2]);
  }
  return seq;
}

console.log("=== PolyglotMesh JavaScript Runtime ===");
const fib = generateFibonacci(12);
console.log("Fibonacci sequence (12 terms):", fib.join(", "));

const matrix = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
];

const transposed = matrix[0].map((_, c) => matrix.map(r => r[c]));
console.log("Matrix diagonal sum:", matrix[0][0] + matrix[1][1] + matrix[2][2]);
console.log("Transposed Matrix:", JSON.stringify(transposed));
`
  },
  {
    id: 'rb-pricing-demo',
    title: 'Ruby: Pricing Summary (TruffleRuby)',
    language: 'ruby',
    category: 'Demo',
    description: 'Ruby sample program (requires TruffleRuby profile enabled on GraalVM 24.1+).',
    code: `# PolyglotMesh TruffleRuby Example
items = [
  { name: "Compute Node", price: 120.0 },
  { name: "Sandbox Context", price: 45.5 },
  { name: "Storage Volume", price: 34.5 }
]

total = items.sum { |item| item[:price] }
puts "=== PolyglotMesh Ruby Runtime ==="
items.each { |item| puts "#{item[:name]}: $#{item[:price]}" }
puts "Total Allocation: $#{total}"
`
  },
  {
    id: 'py-sandbox-escape',
    title: 'Security Probe: Host File & Command Isolation',
    language: 'python',
    category: 'Security Sandbox',
    description: 'Demonstrates sandbox rejection when guest code attempts host file reads.',
    code: `# PolyglotMesh Security Sandbox Verification
print("[-] Audit 1: Probing Host File System (/etc/passwd)...")
try:
    with open('/etc/passwd', 'r') as f:
        print("Attempted read length:", len(f.read()))
except Exception as ex:
    print(f"[SECURE PASS] Blocked with: {type(ex).__name__}")
`
  },
  {
    id: 'js-timeout-guard',
    title: 'Deadline Test: Infinite Loop Interruption',
    language: 'javascript',
    category: 'Timeout Guard',
    description: 'Validates that infinite loops are terminated by the execution deadline.',
    code: `// PolyglotMesh Timeout & Resource Guard Test
console.log("Executing long-running task to test context cancellation...");

let iterations = 0;
while (true) {
  iterations++;
}
`
  },
  {
    id: 'py-syntax-error',
    title: 'Python: Syntax Error Reporting',
    language: 'python',
    category: 'Demo',
    description: 'Tests real-time Monaco diagnostic markers and backend error formatting.',
    code: `# Intentional syntax error for testing error diagnostics
def compute_data(items):
    for item in items
        print("Processing: " + str(item))

compute_data([1, 2, 3])
`
  }
];
