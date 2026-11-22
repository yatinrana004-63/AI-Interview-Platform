const problems = [
  {
    slug: "pair-sum",
    title: "Pair Sum",
    difficulty: "Easy",
    topics: ["Arrays", "Hash map"],
    description: "Given a list of integers and a target, return true if two elements at different indices add up to the target.",
    signature: "solve(numbers, target)",
    constraints: ["0 to 10,000 integers", "The same index cannot be used twice."],
    samples: [
      { args: [[2, 7, 11, 15], 9], expected: true },
      { args: [[3], 6], expected: false },
    ],
    hidden: [
      { args: [[3, 3], 6], expected: true },
      { args: [[-8, 0, 2, 7], -1], expected: true },
      { args: [[], 0], expected: false },
      { args: [[1, 2, 4, 8], 7], expected: false },
    ],
  },
  {
    slug: "balanced-brackets",
    title: "Balanced Brackets",
    difficulty: "Easy",
    topics: ["Strings", "Stack"],
    description: "Return true when every opening bracket is closed by a bracket of the same type, in the correct order. The input contains only (), [] and {}.",
    signature: "solve(text)",
    constraints: ["0 to 10,000 characters", "An empty string is balanced."],
    samples: [
      { args: ["({[]})"], expected: true },
      { args: ["([)]"], expected: false },
    ],
    hidden: [
      { args: [""], expected: true },
      { args: ["]"], expected: false },
      { args: ["(([[]]))()"], expected: true },
      { args: ["(("], expected: false },
    ],
  },
  {
    slug: "longest-unique-window",
    title: "Longest Unique Window",
    difficulty: "Medium",
    topics: ["Strings", "Sliding window"],
    description: "Return the length of the longest contiguous substring that contains no repeated characters.",
    signature: "solve(text)",
    constraints: ["0 to 50,000 characters", "Input uses ASCII characters."],
    samples: [
      { args: ["abcabcbb"], expected: 3 },
      { args: ["bbbbb"], expected: 1 },
    ],
    hidden: [
      { args: ["abba"], expected: 2 },
      { args: [""], expected: 0 },
      { args: ["pwwkew"], expected: 3 },
      { args: ["a ABCa"], expected: 5 },
    ],
  },
  {
    slug: "merge-time-slots",
    title: "Merge Time Slots",
    difficulty: "Medium",
    topics: ["Arrays", "Sorting"],
    description: "Combine all overlapping or touching time slots. Return the resulting pairs ordered by starting time.",
    signature: "solve(slots)",
    constraints: ["0 to 10,000 slots", "Each slot is [start, end], with start less than or equal to end."],
    samples: [
      { args: [[[1, 3], [2, 7], [9, 12]]], expected: [[1, 7], [9, 12]] },
      { args: [[[3, 5], [1, 3]]], expected: [[1, 5]] },
    ],
    hidden: [
      { args: [[]], expected: [] },
      { args: [[[1, 9], [2, 3], [5, 8]]], expected: [[1, 9]] },
      { args: [[[9, 10], [0, 1], [5, 6]]], expected: [[0, 1], [5, 6], [9, 10]] },
    ],
  },
  {
    slug: "minimum-steps",
    title: "Minimum Steps",
    difficulty: "Medium",
    topics: ["Dynamic programming"],
    description: "You start at zero and want to reach an exact total using numbers from the given list. You can reuse a number. Return the minimum number of picks, or -1 when no combination works.",
    signature: "solve(steps, total)",
    constraints: ["All steps are positive integers.", "The target is between 0 and 5,000."],
    samples: [
      { args: [[1, 3, 4], 6], expected: 2 },
      { args: [[4, 6], 7], expected: -1 },
    ],
    hidden: [
      { args: [[3], 0], expected: 0 },
      { args: [[1, 5, 7], 11], expected: 3 },
      { args: [[2, 6], 8], expected: 2 },
      { args: [[], 1], expected: -1 },
    ],
  },
];

export const findProblem = (slug) => problems.find((problem) => problem.slug === slug);
export const listProblems = () => problems.map(({ hidden: _hidden, ...problem }) => problem);
