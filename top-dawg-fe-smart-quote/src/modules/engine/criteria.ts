/**
 * Deterministic tri-state criteria evaluator.
 *
 * Underwriting rules and conditional health questions are both expressed with
 * the same tiny DSL. Evaluation never guesses: when a referenced fact was not
 * established by the interview the result is `unknown`, which callers surface
 * as "Requires underwriting verification".
 */
import type { Criteria, Criterion, CriteriaGroup, FactSet, FactValue, Tri } from './types';

function isCriterion(node: Criterion | CriteriaGroup): node is Criterion {
  return typeof (node as Criterion).fact === 'string';
}

function and(values: Tri[]): Tri {
  if (values.some((v) => v === 'false')) return 'false';
  if (values.some((v) => v === 'unknown')) return 'unknown';
  return 'true';
}

function or(values: Tri[]): Tri {
  if (values.some((v) => v === 'true')) return 'true';
  if (values.some((v) => v === 'unknown')) return 'unknown';
  return 'false';
}

function not(value: Tri): Tri {
  if (value === 'true') return 'false';
  if (value === 'false') return 'true';
  return 'unknown';
}

function toArray(value: FactValue | undefined): FactValue[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function compare(op: 'lt' | 'lte' | 'gt' | 'gte', left: unknown, right: unknown): Tri {
  const a = toNumber(left);
  const b = toNumber(right);
  if (a === null || b === null) return 'unknown';
  switch (op) {
    case 'lt':
      return a < b ? 'true' : 'false';
    case 'lte':
      return a <= b ? 'true' : 'false';
    case 'gt':
      return a > b ? 'true' : 'false';
    case 'gte':
      return a >= b ? 'true' : 'false';
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    const left = Array.isArray(a) ? a : [a];
    const right = Array.isArray(b) ? b : [b];
    return left.length === right.length && left.every((v, i) => sameValue(v, right[i]));
  }
  // Treat "3" and 3 as equal so CSV/JSON-sourced rule values behave predictably.
  const an = toNumber(a);
  const bn = toNumber(b);
  if (an !== null && bn !== null) return an === bn;
  return a === b;
}

/** Operators that assert something positive about a fact's value. */
const POSITIVE_OPS = new Set(['eq', 'in', 'contains_any', 'lt', 'lte', 'gt', 'gte', 'exists']);

export function evaluateCriterion(criterion: Criterion, facts: FactSet): Tri {
  const known = Object.prototype.hasOwnProperty.call(facts.values, criterion.fact);
  const isFlaggedUnknown = facts.unknownPaths.includes(criterion.fact);
  const actual = facts.values[criterion.fact];

  // A fact the interview positively ruled out (a follow-up behind a "no" gate)
  // is known absent: every positive assertion about it is false, every
  // negative assertion is true. This is what keeps a healthy client from
  // tripping "requires verification" on conditions they do not have.
  if (!known && !isFlaggedUnknown && facts.absentPaths.includes(criterion.fact)) {
    return POSITIVE_OPS.has(criterion.op) ? 'false' : 'true';
  }

  if (criterion.op === 'exists') {
    if (isFlaggedUnknown) return 'unknown';
    return known && actual !== null && actual !== '' ? 'true' : 'false';
  }
  if (criterion.op === 'not_exists') {
    if (isFlaggedUnknown) return 'unknown';
    return known && actual !== null && actual !== '' ? 'false' : 'true';
  }

  // Any other operator against an unestablished fact is indeterminate.
  if (!known || isFlaggedUnknown || actual === null) return 'unknown';

  switch (criterion.op) {
    case 'eq':
      return sameValue(actual, criterion.value) ? 'true' : 'false';
    case 'ne':
      return sameValue(actual, criterion.value) ? 'false' : 'true';
    case 'in':
      return toArray(criterion.value).some((v) => sameValue(actual, v)) ? 'true' : 'false';
    case 'nin':
      return toArray(criterion.value).some((v) => sameValue(actual, v)) ? 'false' : 'true';
    case 'contains_any': {
      const haystack = toArray(actual);
      return toArray(criterion.value).some((needle) =>
        haystack.some((item) => sameValue(item, needle)),
      )
        ? 'true'
        : 'false';
    }
    case 'contains_none': {
      const haystack = toArray(actual);
      return toArray(criterion.value).some((needle) =>
        haystack.some((item) => sameValue(item, needle)),
      )
        ? 'false'
        : 'true';
    }
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte':
      return compare(criterion.op, actual, criterion.value);
    default:
      // Unknown operator: refuse to guess.
      return 'unknown';
  }
}

export function evaluateCriteria(criteria: Criteria, facts: FactSet): Tri {
  if (!criteria) return 'true';
  const parts: Tri[] = [];

  if (criteria.all?.length) {
    parts.push(and(criteria.all.map((node) => evaluateNode(node, facts))));
  }
  if (criteria.any?.length) {
    parts.push(or(criteria.any.map((node) => evaluateNode(node, facts))));
  }
  if (criteria.none?.length) {
    parts.push(not(or(criteria.none.map((node) => evaluateNode(node, facts)))));
  }

  if (parts.length === 0) return 'true';
  return and(parts);
}

function evaluateNode(node: Criterion | CriteriaGroup, facts: FactSet): Tri {
  return isCriterion(node) ? evaluateCriterion(node, facts) : evaluateCriteria(node, facts);
}

/** Fact paths a criteria tree depends on — used to explain missing information. */
export function collectFactPaths(criteria: Criteria, acc: string[] = []): string[] {
  if (!criteria) return acc;
  for (const key of ['all', 'any', 'none'] as const) {
    for (const node of criteria[key] ?? []) {
      if (isCriterion(node)) acc.push(node.fact);
      else collectFactPaths(node, acc);
    }
  }
  return acc;
}
