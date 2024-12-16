import {
  Quiz,
  MAQuestionWPenalty,
  MAQuestionWoPenalty
} from '../../trials/ts-eg/exP1';

const maQp = new MAQuestionWPenalty(
  'Which statements are true for TypeScript?',
  ['functional', 'object-oriented', 'untyped', 'interpreted'],
  ['functional', 'object-oriented']
);

const maQnp = new MAQuestionWoPenalty(
  'Which statements are true for TypeScript?',
  ['functional', 'object-oriented', 'untyped', 'interpreted'],
  ['functional', 'object-oriented']
);

test('multiple answer question with penalty gives full points for correct answer', () => {
  expect(maQp.grade(['functional', 'object-oriented'], 4)).toBe(4);
});

test('multiple answer question with penalty gives partial points for partially correct answer', () => {
  expect(maQp.grade(['functional'], 4)).toBe(2);
});

test('multiple answer question with penalty gives penalized points for partially incorrect answer', () => {
  expect(maQp.grade(['functional', 'untyped'], 4)).toBe(0);
});

test('multiple answer question without penalty gives full points for correct answer', () => {
  expect(maQnp.grade(['functional', 'object-oriented'], 4)).toBe(4);
});

test('multiple answer question without penalty gives partial points for partially correct answer', () => {
  expect(maQnp.grade(['functional'], 4)).toBe(3);
});

test('multiple answer question without penalty gives partial points for partially incorrect answer', () => {
  expect(maQnp.grade(['functional', 'untyped'], 4)).toBe(2);
});

test('multiple answer question with penalty with invalid answer returns negative points', () => {
  expect(maQp.grade(['invalid', 'object-oriented'], 6)).toBe(-6);
});

test('multiple answer question with penalty with invalid answer returns negative points', () => {
  expect(maQnp.grade(['invalid', 'functional'], 10)).toBe(-10);
});

test('grading a quiz sums up question grades', () => {
  const questions = [maQp, maQnp];
  const answers = [['functional'], ['functional', 'object-oriented']];
  const quiz = new Quiz(questions);
  const total = quiz.grade(answers, 10);
  expect(total).toBe(15);
});
