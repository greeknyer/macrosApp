// Minimal typings for the pure-JS LP solver (no official @types package).
declare module 'javascript-lp-solver' {
  interface Model {
    optimize: string;
    opType: 'min' | 'max';
    constraints: Record<string, { min?: number; max?: number; equal?: number }>;
    variables: Record<string, Record<string, number>>;
    ints?: Record<string, number>; // variables constrained to integer values (MILP)
    options?: Record<string, unknown>;
  }
  interface Solution {
    feasible: boolean;
    result: number;
    bounded?: boolean;
    [variableName: string]: number | boolean | undefined;
  }
  const solver: { Solve: (model: Model) => Solution };
  export default solver;
}
