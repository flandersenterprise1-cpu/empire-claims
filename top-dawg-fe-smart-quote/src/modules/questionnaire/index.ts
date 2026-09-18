/**
 * Smart health interview.
 *
 * Questions and their branching conditions live in the database, never in the
 * UI. A healthy client answers only the top-level gate questions; follow-ups
 * appear only when a gate is answered in a way that makes them relevant.
 *
 * The same criteria DSL used by underwriting rules drives branching, so an
 * administrator only has to learn one thing.
 */
import { evaluateCriteria } from '../engine/criteria';
import type { Criteria, FactSet, FactValue } from '../engine/types';

export type AnswerType =
  | 'boolean'
  | 'single_select'
  | 'multi_select'
  | 'integer'
  | 'decimal'
  | 'months_ago'
  | 'text'
  | 'height_weight'
  | 'medication_list';

export interface QuestionRecord {
  id: number;
  code: string;
  category: string;
  prompt: string;
  helpText?: string | null;
  answerType: AnswerType;
  options?: Array<{ value: string; label: string }> | null;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  parentQuestionId?: number | null;
  showWhen?: Criteria;
  /** Canonical fact path this answer feeds, e.g. `diabetes.treatment`. */
  factPath?: string | null;
  version: number;
}

export type AnswerMap = Record<string, unknown>;

export interface HeightWeightAnswer {
  feet?: number | null;
  inches?: number | null;
  pounds?: number | null;
}

/* -------------------------------------------------------------------------- */
/* Branching                                                                   */
/* -------------------------------------------------------------------------- */

/** Answers as a FactSet keyed by question code, for evaluating `showWhen`. */
function answersAsFacts(answers: AnswerMap): FactSet {
  const values: Record<string, FactValue> = {};
  for (const [code, value] of Object.entries(answers)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      values[code] = value.filter((v) => v !== null && v !== undefined) as FactValue;
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      values[code] = value;
    } else {
      // Structured answers (height/weight) are present but not comparable.
      values[code] = JSON.stringify(value);
    }
  }
  return { values, unknownPaths: [], absentPaths: [], reportedConditions: [] };
}

export function isQuestionVisible(question: QuestionRecord, answers: AnswerMap): boolean {
  if (!question.isActive) return false;
  if (!question.showWhen) return true;
  return evaluateCriteria(question.showWhen, answersAsFacts(answers)) === 'true';
}

/** Active questions whose branching conditions are currently satisfied. */
export function visibleQuestions(
  questions: QuestionRecord[],
  answers: AnswerMap,
): QuestionRecord[] {
  return questions
    .filter((q) => isQuestionVisible(q, answers))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

export function isAnswered(question: QuestionRecord, answers: AnswerMap): boolean {
  const value = answers[question.code];
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (question.answerType === 'height_weight') {
    const hw = value as HeightWeightAnswer;
    return (
      hw != null &&
      typeof hw === 'object' &&
      Number(hw.feet ?? 0) > 0 &&
      Number(hw.pounds ?? 0) > 0
    );
  }
  return true;
}

export interface InterviewProgress {
  visible: number;
  answered: number;
  requiredOutstanding: QuestionRecord[];
  complete: boolean;
  percent: number;
}

export function interviewProgress(
  questions: QuestionRecord[],
  answers: AnswerMap,
): InterviewProgress {
  const visible = visibleQuestions(questions, answers);
  const answered = visible.filter((q) => isAnswered(q, answers));
  const requiredOutstanding = visible.filter((q) => q.isRequired && !isAnswered(q, answers));
  return {
    visible: visible.length,
    answered: answered.length,
    requiredOutstanding,
    complete: requiredOutstanding.length === 0,
    percent: visible.length === 0 ? 0 : Math.round((answered.length / visible.length) * 100),
  };
}

/* -------------------------------------------------------------------------- */
/* Fact extraction                                                             */
/* -------------------------------------------------------------------------- */

function normaliseMedications(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,\n]/) : [];
  return [
    ...new Set(
      raw
        .map((v) => String(v).trim().toLowerCase())
        .filter((v) => v.length > 0)
        .map((v) => v.replace(/\s+/g, ' ')),
    ),
  ];
}

export function calculateBmi(totalInches: number, pounds: number): number | null {
  if (!Number.isFinite(totalInches) || !Number.isFinite(pounds)) return null;
  if (totalInches <= 0 || pounds <= 0) return null;
  return Math.round(((pounds * 703) / (totalInches * totalInches)) * 10) / 10;
}

/**
 * Converts interview answers into the canonical facts the rules engine reads.
 *
 * Unanswered *visible required* questions become `unknownPaths`, which is how
 * "insufficient information" reaches the engine. Questions hidden by branching
 * are intentionally not marked unknown — the client already ruled them out.
 */
export function extractFacts(questions: QuestionRecord[], answers: AnswerMap): FactSet {
  const visible = visibleQuestions(questions, answers);
  const visibleCodes = new Set(visible.map((q) => q.code));
  const values: Record<string, FactValue> = {};
  const unknownPaths: string[] = [];
  const reportedConditions = new Set<string>();

  // Follow-ups the client's answers ruled out are *known absent*, not unknown:
  // someone who said "no" to kidney disease is not on dialysis.
  const absentPaths = questions
    .filter((q) => q.isActive && !visibleCodes.has(q.code))
    .map((q) => q.factPath ?? q.code);

  for (const question of visible) {
    const path = question.factPath ?? question.code;
    const answer = answers[question.code];

    if (!isAnswered(question, answers)) {
      if (question.isRequired) unknownPaths.push(path);
      continue;
    }

    switch (question.answerType) {
      case 'boolean': {
        const bool = answer === true || answer === 'true' || answer === 'yes';
        values[path] = bool;
        break;
      }
      case 'integer':
      case 'months_ago': {
        const n = Number(answer);
        if (Number.isFinite(n)) values[path] = Math.round(n);
        else unknownPaths.push(path);
        break;
      }
      case 'decimal': {
        const n = Number(answer);
        if (Number.isFinite(n)) values[path] = n;
        else unknownPaths.push(path);
        break;
      }
      case 'multi_select': {
        values[path] = (Array.isArray(answer) ? answer : [answer]).map((v) => String(v));
        break;
      }
      case 'medication_list': {
        values['medications.list'] = normaliseMedications(answer);
        break;
      }
      case 'height_weight': {
        const hw = answer as HeightWeightAnswer;
        const totalInches = Number(hw.feet ?? 0) * 12 + Number(hw.inches ?? 0);
        const pounds = Number(hw.pounds ?? 0);
        values['build.heightInches'] = totalInches;
        values['build.weightPounds'] = pounds;
        const bmi = calculateBmi(totalInches, pounds);
        if (bmi != null) values['build.bmi'] = bmi;
        break;
      }
      default: {
        values[path] = String(answer);
        break;
      }
    }

    // A gate question answered "yes" (or any non-negative selection) marks the
    // condition as reported, so a carrier with no verified rule for it cannot
    // silently pass the client through.
    const conditionCode = path.includes('.') ? path.split('.')[0] : path;
    const isGate = path.endsWith('.present');
    if (isGate && values[path] === true) reportedConditions.add(conditionCode);
  }

  return {
    values,
    unknownPaths: [...new Set(unknownPaths)],
    // A path that was actually answered is never also "absent".
    absentPaths: [...new Set(absentPaths)].filter((path) => !(path in values)),
    reportedConditions: [...reportedConditions],
  };
}
