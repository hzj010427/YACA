/*
  Extend the question types with a new type of question: MultipleChoiceQuestion.
  A MultipleChoiceQuestion has has a single correct answer, and the user can only 
  choose one option in the answer (the answer is a string instead of an array of
  strings).
*/

/* 
1. Define a new type called Answer that represents the possible types of answers to 
   a question. It can be either a string for a MultipleChoiceQuestion or an array 
   of strings for a MultipleAnswerQuestion. 
*/

type Answer = string | string[];

/*
2. Modify the IQuestion interface to change the type of the property answer so that
   it can accommodate both a a MultipleChoiceQuestion and a MultipleAnswerQuestion.
*/

interface IQuestion {
  question: string;
  options: string[];
  answer: Answer;
}

/* 
3. Define a new abstract superclass Question that represents a generic Question,
   implements IQuestion and has an abstract method grade that will be implemented 
   by concrete subclasses.The constructor should accommodate both a 
   MultipleChoiceQuestion and a MultipleAnswerQuestion.
*/

class Question implements IQuestion {
  question: string;
  options: string[];
  answer: Answer;

  constructor(question: string, options: string[], answer: Answer) {
    this.question = question;
    this.options = options;
    this.answer = answer;
  }

  grade(answer: Answer, points: number): number {
    return 0;
  }
}

/* 
4. Now define a concrete subclass of Question to represent MultipleChoiceQuestion.
   - The constructor should be tailerod to a MultipleChoiceQuestion that accepts a
   single answer. 
   - The class should implement the grade method such that the method returns the 
     specified number of points if the provided answer is correct, and 0 otherwise.
   - The method should throw an error if the provided answer is not included in the  
     question's options, with the error message: "Invalid answer: " + answer.
*/

class MultipleChoiceQuestion extends Question {
  grade(answer: Answer, points: number): number {
    if (typeof answer === 'string' && !this.options.includes(answer)) {
        throw new Error("Invalid answer: " + answer);
    }

    if (this.answer === answer) {
      return points;
    }
    
    return 0;
  }
}

/* 
5. Modify the abstract class MultipleAnswerQuestion to inherit from Question.
  - Change the grade method so that it throws an error if the provided answer
    includes any invalid values not included in the options, with the 
    error message: "Invalid answer: " + invalidValue.
*/

class MultipleAnswerQuestion extends Question {
  grade(answer: Answer, points: number): number {
    if (Array.isArray(answer)) {
      for (const value of answer) {
        if (!this.options.includes(value)) {
          throw new Error("Invalid answer: " + value);
        }
      }

      if (answer.some((ans) => !this.options.includes(ans))) {
        return -points;
      }

      return this.gradeSpecific(answer, points);
    }

    throw new Error("Invalid answer: " + answer);
  }

  gradeSpecific(answer: string[], points: number): number {
    return 0;
  }
}

class MAQuestionWPenalty extends MultipleAnswerQuestion {
  gradeSpecific(answer: string[], points: number): number {
    const correctAnswersArray = typeof this.answer === 'string' ? [this.answer] : this.answer;
    const correctAnswers = correctAnswersArray.length;
    const correct = correctAnswersArray.filter((ans) => answer.includes(ans)).length;
    const incorrect = answer.filter((ans) => !correctAnswersArray.includes(ans)).length;
    const correctPoints = points / correctAnswers;
    const penalty = correctPoints;
    const grade = correct * correctPoints - incorrect * penalty;
    return Math.max(0, grade);
  }
}

class MAQuestionWoPenalty extends MultipleAnswerQuestion {
  gradeSpecific(answer: string[], points: number): number {
    const correct = this.options.filter(
      (opt) =>
        (this.answer.includes(opt) && answer.includes(opt)) ||
        (!this.answer.includes(opt) && !answer.includes(opt))
    ).length;
    const correctPoints = points / this.options.length;
    return correct * correctPoints;
  }
}

/* 
6. Modify the Quiz class as appropriate. 
   - The constructor should accept an array of questions: questions of any grading 
     type can be included in the array (multiple answer with or without penalty, or 
     multiple choice).
   - The grade method of the Quiz class should now be an asyncronous function. It
     should return a Promise that resolves to the grand total of the number of points
     earned by the user. 
*/

class Quiz {
  questions: Question[];

  constructor(questions: Question[]) {
    this.questions = questions;
  }

  async grade(answers: Answer[], points: number): Promise<number> {
    let total = 0;

    for (let i = 0; i < this.questions.length; i++) {
      total += await this.questions[i].grade(answers[i], points);
    }

    return total;
  }
}

/* 
7. Test your implementation using your quiz from Part 1 and by defining a new second 
   quiz on advanced TypeScript. The second quiz should have two multipe-choice questions, 
   one multiple-answer question with penalty, one multiple-answer question without penalty, 
   one question with an invalid answer.
    - The second quiz should mix correct, incorrect, and partially correct answers.
    - Call the grade method of both quizzes asynconously, without blocking the execution
      (you should use the .then and .catch methods).
*/

/* 
8. Test your implementation by running the provided automated tests as follows. If all tests 
   pass, then your implmentation is probably correct and you can submit your solution.

   % npm run test:exP2
*/

export {
  Question,
  Quiz,
  MultipleChoiceQuestion,
  MAQuestionWoPenalty,
  MAQuestionWPenalty,
  MultipleAnswerQuestion
};

export type { IQuestion, Answer };
