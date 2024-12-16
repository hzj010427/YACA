/*
A multiple-answer question is a question that has multiple correct options from 
a given set of possible options. 
The possible options are typically represented by checkboxes. 
A multiple-answer question can have a penalty for incorrectly answered options 
or not. 
A question with penalty gives partial points for each correctly answered option
and applies a penalty for each incorrectly answered option. 
A question without penalty gives partial points for each correctly answered 
option without applying penalties for incorrectly answered options.
*/

/*
1. Define an interface IQuestion for with the following properties: question, 
options, and answer.
The property types are as follows: 
 - question is a string rerpesenting the question,
 - options is an array of strings, each of which represents a potential answer
   presented to the user, and 
 - answer is an array of strings representing the correct options.
*/

interface IQuestion {
  question: string;
  options: string[];
  answer: string[];
}

/*
2. Define an abstract class MultipleAnswerQuestion that implements IQuestion. 
 - It should have a constructor that takes question, options, and answer as 
   arguments. 
 - It should have a method called grade that takes two arguments:
  -- answer: a provided answer consisting of the options chosen by the user   
  -- points: total number of points awarded to the question 
 - The grade method should 
  -- check whether the provided answer includes any invalid values not included
    in the correct options, and return -points (negative of points) without further 
    grading if an invalid value is found.
  -- if all the values in the provided answer are valid, the grade method should return 
     the value of a method called gradeSpecific with the same arguments:
     -- The gradeSpecific method is abstract and should be implemented by concrete
        subclasses of MultipleAnswerQuestion.
     -- When implemented by a concrete subclass, gradeSpecific returns a number that 
        represents the question's grade determined by the provided answer. 
     -- A valid grade cannot be negative and cannot exceed the total number of points. 
*/

class MultipleAnswerQuestion implements IQuestion {
  question: string;
  options: string[];
  answer: string[];

  constructor(question: string, options: string[], answer: string[]) {
    this.question = question;
    this.options = options;
    this.answer = answer;
  }

  grade(answer: string[], points: number): number {
    if (answer.some((ans) => !this.options.includes(ans))) {
      return -points;
    }
    return this.gradeSpecific(answer, points);
  }

  gradeSpecific(answer: string[], points: number): number {
    return 0;
  }
}

/*
3. Define a concrete subclass of MultipleAnswerQuestion called MAQuestionWPenalty. 
   This class should implement the gradeSpecific method such that it gives partial 
   points for each correctly answered option and applies a penalty for each 
   incorrectly answered option to cancel out a correctly answered option.
   - The partial points for each correctly answered option is calculated by dividing
     the total number of points by the number of correct options. 
   - The penalty for each incorrectly answered option is the same as the partial points 
     for each correctly answered option. 
   - The grade method should return the sum of the partial points for correctly
     answered options minus the sum of the partial points for incorrectly answered
     options.
   - If the grade calculated above is negative, the method should return 0.
*/

class MAQuestionWPenalty extends MultipleAnswerQuestion {
  gradeSpecific(answer: string[], points: number): number {
    const correctAnswers = this.answer.length;
    const correct = this.answer.filter((ans) => answer.includes(ans)).length;
    const incorrect = answer.filter((ans) => !this.answer.includes(ans)).length;
    const correctPoints = points / correctAnswers;
    const penalty = correctPoints;
    const grade = correct * correctPoints - incorrect * penalty;
    return Math.max(0, grade);
  }
}

/*
4. Define a concrete subclass of MultipleAnswerQuestion called MAQuestionWoPenalty. 
   This class should implement the gradeSpecific method such that it gives partial 
   points for each correctly answered option, but incorrectly answered options 
   don't cancell out correctly answered options.
   - The partial points for each correct option is calculated by dividing the total
     number of points by the number of all options (not the number of correct options). 
   - Careful: The definition of a correctly answered option is different for this type of 
     question. An option is correctly answered either if both the correct answer and 
     the provided answer contain the option OR if neither the correct answer nor the
     provided answer contains the option.
   - The grade method should return the sum of the partial points for correctly 
     answered options, as defined above.
*/

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
5. Test your implementation by designing a quiz with 5 questions for assessing
   knowledge of TypeScript basics using instances of MultipleChoiceQuestion with 
   and without penalty, and grading the quiz with a set of provided answers and 
   total points. Try to test as many combinations as you can, including fully 
   correct answers, partially correct answers, and invalid answers. 
   - Create a class called Quiz whose constructor takes an array of multiple answer
     questions as an argument.
   - The Quiz class should have a method called grade that takes two arguments:  
     -- answers: an array of strings representing the provided answers to the 
        questions, and 
     -- points: a number representing the total number of points awarded to each 
        question (all questions in the same quiz are worth the same number of points).
    - The grade method should return the grand total, the sum of the points awarded 
      to the quiz questions according to the provided answers.  
    - Log on the console: the grade of each question right after it has been calculated 
      and the grand total grade of the quiz at the end.
*/

class Quiz {
  questions: MultipleAnswerQuestion[];

  constructor(questions: MultipleAnswerQuestion[]) {
    this.questions = questions;
  }

  grade(answers: string[][], points: number): number {
    let total = 0;
    for (let i = 0; i < this.questions.length; i++) {
      const grade = this.questions[i].grade(answers[i], points);
      console.log(`Question ${i + 1}: ${grade}`);
      total += grade;
    }
    console.log(`Total: ${total}`);
    return total;
  }
}

/* 
6. Test your implementation by running the provided automated tests as follows. If all tests 
   pass, then your implmentation is probably correct and you can submit your solution.

   % npm run test:exP1
*/

export {
  MultipleAnswerQuestion,
  Quiz,
  MAQuestionWoPenalty,
  MAQuestionWPenalty
};

export type { IQuestion };
