import {
  Quiz,
  MAQuestionWPenalty,
  MAQuestionWoPenalty,
  MultipleChoiceQuestion
} from '../../trials/ts-eg/exP2';

const mcQ = new MultipleChoiceQuestion(
  'What is 1 + 1?',
  ['1', '2', '3', '4'],
  '2'
);

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

test('multiple choice question with correct answer gives full points', () => {
  expect(mcQ.grade('2', 1)).toBe(1);
});

test('multiple choice question with correct answer gives 0 points', () => {
  expect(mcQ.grade('1', 3)).toBe(0);
});

test('multiple choice question with invalid answer throws error', () => {
  let grade: number;
  try {
    grade = mcQ.grade('5', 2);
    throw new Error('grading should not have succeeded');
  } catch (e) {
    if (e instanceof Error) {
      expect(e.message).toBe('Invalid answer: 5');
    } else {
      throw new Error('should have thrown an error');
    }
  }
});

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

test('multiple answer question with penalty with invalid answer throws error', () => {
  let grade: number;
  try {
    grade = maQp.grade(['invalid', 'object-oriented'], 6);
    throw new Error('grading should not have succeeded');
  } catch (e) {
    if (e instanceof Error) {
      expect(e.message).toBe('Invalid answer: invalid');
    } else {
      throw new Error('should have thrown an error');
    }
  }
});

test('multiple answer question witout penalty with invalid answer throws error', () => {
  let grade: number;
  try {
    grade = maQnp.grade(['invalid', 'object-oriented'], 10);
    throw new Error('grading should not have succeeded');
  } catch (e) {
    if (e instanceof Error) {
      expect(e.message).toBe('Invalid answer: invalid');
    } else {
      throw new Error('should have thrown an error');
    }
  }
});

test('grading a quiz asynchronous works', async () => {
  const quiz1 = new Quiz([mcQ, mcQ]);
  const answers1 = ['2', '3'];
  const quiz2 = new Quiz([maQp, maQnp]);
  const answers2 = [['functional'], ['functional', 'object-oriented']];
  const quiz3 = new Quiz([maQp, mcQ]);
  const answers3 = [['functional'], 'four'];

  quiz1.grade(answers1, 5).then((total) => {
    expect(total).toBe(5);
  });
  quiz2.grade(answers2, 10).then((total) => {
    expect(total).toBe(15);
  });
  quiz3
    .grade(answers3, 10)
    .then((total) => {
      throw new Error('grading should not have succeeded');
    })
    .catch((e) => {
      expect(e.message).toBe('Invalid answer: four');
    });
});
