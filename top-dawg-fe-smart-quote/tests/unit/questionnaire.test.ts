import { describe, expect, it } from 'vitest';
import {
  calculateBmi,
  extractFacts,
  interviewProgress,
  isQuestionVisible,
  visibleQuestions,
  type QuestionRecord,
} from '@/modules/questionnaire';

let id = 0;
function question(overrides: Partial<QuestionRecord> & { code: string }): QuestionRecord {
  id += 1;
  return {
    id,
    category: 'test',
    prompt: 'Test question?',
    answerType: 'boolean',
    isRequired: true,
    sortOrder: id * 10,
    isActive: true,
    version: 1,
    factPath: null,
    ...overrides,
  };
}

const DIABETES_SET: QuestionRecord[] = [
  question({ code: 'diabetes_present', factPath: 'diabetes.present', sortOrder: 10 }),
  question({
    code: 'diabetes_treatment',
    answerType: 'single_select',
    options: [
      { value: 'diet', label: 'Diet' },
      { value: 'pills', label: 'Pills' },
      { value: 'insulin', label: 'Insulin' },
    ],
    factPath: 'diabetes.treatment',
    sortOrder: 20,
    showWhen: { all: [{ fact: 'diabetes_present', op: 'eq', value: true }] },
  }),
  question({
    code: 'diabetes_insulin_start_age',
    answerType: 'integer',
    factPath: 'diabetes.insulinStartAge',
    sortOrder: 30,
    showWhen: { all: [{ fact: 'diabetes_treatment', op: 'in', value: ['insulin'] }] },
  }),
  question({
    code: 'diabetes_complications',
    answerType: 'multi_select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'neuropathy', label: 'Neuropathy' },
    ],
    factPath: 'diabetes.complications',
    sortOrder: 40,
    showWhen: { all: [{ fact: 'diabetes_present', op: 'eq', value: true }] },
  }),
];

describe('conditional health questions', () => {
  it('hides every follow-up before the gate is answered', () => {
    expect(visibleQuestions(DIABETES_SET, {}).map((q) => q.code)).toEqual(['diabetes_present']);
  });

  it('hides every follow-up when the gate is answered "no"', () => {
    expect(visibleQuestions(DIABETES_SET, { diabetes_present: false }).map((q) => q.code)).toEqual([
      'diabetes_present',
    ]);
  });

  it('reveals the first tier of follow-ups when the gate is answered "yes"', () => {
    expect(visibleQuestions(DIABETES_SET, { diabetes_present: true }).map((q) => q.code)).toEqual([
      'diabetes_present',
      'diabetes_treatment',
      'diabetes_complications',
    ]);
  });

  it('reveals a second-tier follow-up only when its own condition is met', () => {
    const pills = visibleQuestions(DIABETES_SET, {
      diabetes_present: true,
      diabetes_treatment: 'pills',
    });
    expect(pills.map((q) => q.code)).not.toContain('diabetes_insulin_start_age');

    const insulin = visibleQuestions(DIABETES_SET, {
      diabetes_present: true,
      diabetes_treatment: 'insulin',
    });
    expect(insulin.map((q) => q.code)).toContain('diabetes_insulin_start_age');
  });

  it('never shows an inactive question', () => {
    const inactive = question({ code: 'retired', isActive: false });
    expect(isQuestionVisible(inactive, {})).toBe(false);
  });

  it('keeps a healthy interview short', () => {
    const progress = interviewProgress(DIABETES_SET, { diabetes_present: false });
    expect(progress.visible).toBe(1);
    expect(progress.complete).toBe(true);
    expect(progress.percent).toBe(100);
  });

  it('reports the outstanding required questions', () => {
    const progress = interviewProgress(DIABETES_SET, { diabetes_present: true });
    expect(progress.complete).toBe(false);
    expect(progress.requiredOutstanding.map((q) => q.code)).toEqual([
      'diabetes_treatment',
      'diabetes_complications',
    ]);
  });
});

describe('fact extraction', () => {
  it('maps answers onto canonical fact paths', () => {
    const f = extractFacts(DIABETES_SET, {
      diabetes_present: true,
      diabetes_treatment: 'insulin',
      diabetes_insulin_start_age: 25,
      diabetes_complications: ['neuropathy'],
    });
    expect(f.values['diabetes.present']).toBe(true);
    expect(f.values['diabetes.treatment']).toBe('insulin');
    expect(f.values['diabetes.insulinStartAge']).toBe(25);
    expect(f.values['diabetes.complications']).toEqual(['neuropathy']);
  });

  it('records a gate answered "yes" as a reported condition', () => {
    const f = extractFacts(DIABETES_SET, { diabetes_present: true });
    expect(f.reportedConditions).toEqual(['diabetes']);
  });

  it('does not report a condition the client denied', () => {
    expect(extractFacts(DIABETES_SET, { diabetes_present: false }).reportedConditions).toEqual([]);
  });

  it('marks a visible but unanswered required question as unknown', () => {
    const f = extractFacts(DIABETES_SET, { diabetes_present: true });
    expect(f.unknownPaths).toContain('diabetes.treatment');
    expect(f.unknownPaths).toContain('diabetes.complications');
  });

  it('marks branch-hidden follow-ups as absent rather than unknown', () => {
    const f = extractFacts(DIABETES_SET, { diabetes_present: false });
    expect(f.unknownPaths).toEqual([]);
    expect(f.absentPaths).toContain('diabetes.treatment');
    expect(f.absentPaths).toContain('diabetes.insulinStartAge');
  });

  it('never marks an answered path as absent', () => {
    const f = extractFacts(DIABETES_SET, { diabetes_present: true, diabetes_treatment: 'pills' });
    expect(f.absentPaths).not.toContain('diabetes.treatment');
    expect(f.absentPaths).toContain('diabetes.insulinStartAge');
  });

  it('derives height, weight and BMI from a build answer', () => {
    const set = [question({ code: 'build', answerType: 'height_weight', factPath: 'build.value' })];
    const f = extractFacts(set, { build: { feet: 5, inches: 9, pounds: 180 } });
    expect(f.values['build.heightInches']).toBe(69);
    expect(f.values['build.weightPounds']).toBe(180);
    expect(f.values['build.bmi']).toBe(26.6);
  });

  it('normalises a medication list to lower case with no duplicates', () => {
    const set = [question({ code: 'meds', answerType: 'medication_list', factPath: 'medications.list' })];
    const f = extractFacts(set, { meds: ['  Metformin ', 'METFORMIN', 'Lisinopril'] });
    expect(f.values['medications.list']).toEqual(['metformin', 'lisinopril']);
  });

  it('computes BMI correctly and refuses impossible input', () => {
    expect(calculateBmi(69, 180)).toBe(26.6);
    expect(calculateBmi(0, 180)).toBeNull();
    expect(calculateBmi(69, 0)).toBeNull();
  });
});
