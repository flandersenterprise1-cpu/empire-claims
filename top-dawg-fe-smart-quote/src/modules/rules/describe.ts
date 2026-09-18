/**
 * Renders a rule's criteria as a sentence a licensed reviewer can check against
 * the carrier's own wording.
 *
 * Verifying a rule means agreeing it says what the source document says. A
 * reviewer cannot do that against raw JSON, so the bulk review screen shows
 * this instead. It is presentation only -- the engine always evaluates the
 * stored criteria, never this text.
 */
import type { Criteria, Criterion, CriteriaGroup, CriterionOperator } from '@/modules/engine/types';

const OPERATORS: Record<CriterionOperator, string> = {
  eq: 'is',
  ne: 'is not',
  in: 'is one of',
  nin: 'is none of',
  lt: 'is less than',
  lte: 'is at most',
  gt: 'is more than',
  gte: 'is at least',
  exists: 'was answered',
  not_exists: 'was not answered',
  contains_any: 'includes any of',
  contains_none: 'includes none of',
};

/** "cancer.lastTreatmentMonthsAgo" -> "cancer / last treatment months ago" */
export function humanizeFact(path: string): string {
  return path
    .split('.')
    .map((part) =>
      part
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .trim(),
    )
    .join(' / ');
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => formatValue(v)).join(', ');
  if (value === null) return 'nothing';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'string') return value.replace(/[_-]+/g, ' ');
  return String(value);
}

function describeCriterion(node: Criterion): string {
  const operator = OPERATORS[node.op] ?? node.op;
  if (node.op === 'exists' || node.op === 'not_exists') {
    return `${humanizeFact(node.fact)} ${operator}`;
  }
  return `${humanizeFact(node.fact)} ${operator} ${formatValue(node.value)}`;
}

function isCriterion(node: Criterion | CriteriaGroup): node is Criterion {
  return typeof (node as Criterion).fact === 'string';
}

function describeNode(node: Criterion | CriteriaGroup, depth: number): string {
  if (isCriterion(node)) return describeCriterion(node);
  return describeGroup(node, depth);
}

function join(
  parts: Array<Criterion | CriteriaGroup>,
  connector: string,
  depth: number,
): string {
  const rendered = parts.map((p) => describeNode(p, depth + 1));
  if (rendered.length === 1) return rendered[0];
  const text = rendered.join(` ${connector} `);
  return depth > 0 ? `(${text})` : text;
}

function describeGroup(group: CriteriaGroup, depth: number): string {
  const clauses: string[] = [];
  if (group.all?.length) clauses.push(join(group.all, 'AND', depth));
  if (group.any?.length) clauses.push(join(group.any, 'OR', depth));
  if (group.none?.length) clauses.push(`NOT ${join(group.none, 'OR', depth + 1)}`);
  if (clauses.length === 0) return 'always applies';
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' AND ')})`;
}

/** Plain-language rendering of a rule's criteria. */
export function describeCriteria(criteria: Criteria): string {
  if (!criteria) return 'always applies';
  return describeGroup(criteria as CriteriaGroup, 0);
}
