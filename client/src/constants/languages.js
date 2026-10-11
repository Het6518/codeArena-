// Languages offered in the editor. `value` must be a key in the server's
// onlineCompilerLanguageMap. JavaScript runs on Deno there, so the template reads
// stdin with the Deno API instead of Node's `require('fs')`.
export const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript (Deno)', monaco: 'javascript' },
  { value: 'python', label: 'Python 3.14', monaco: 'python' },
  { value: 'cpp', label: 'C++ (g++ 15)', monaco: 'cpp' },
  { value: 'java', label: 'Java 25', monaco: 'java' },
];

export const DEFAULT_BOILERPLATES = {
  javascript: `const input = (await new Response(Deno.stdin.readable).text()).trim();
const tokens = input.split(/\\s+/);

// Write your solution here
console.log(tokens.join(' '));`,
  python: `import sys

data = sys.stdin.read().split()

# Write your solution here
print(' '.join(data))`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // Write your solution here
    return 0;
}`,
  java: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        // Write your solution here
    }
}`,
};

export const getMonacoLanguage = (language) =>
  LANGUAGE_OPTIONS.find((option) => option.value === language)?.monaco || 'plaintext';

export const VERDICT_LABELS = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
  RUNTIME_ERROR: 'Runtime Error',
  COMPILATION_ERROR: 'Compilation Error',
  INTERNAL_ERROR: 'Execution Unavailable',
  PENDING: 'Pending',
};

export const getVerdictLabel = (status) => VERDICT_LABELS[status] || status;
