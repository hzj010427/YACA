import { assert } from 'console';

class PostFixCalc {
  private res = 0;

  public constructor(init: number) {
    this.res = init;
  }

  public add(n: number): number {
    this.res += n;
    return this.res;
  }

  public sub(n: number): number {
    this.res -= this.res - n;
    return this.res;
  }

  public neg(): number {
    this.res = -this.res;
    return this.res;
  }

  public div(n: number): number {
    if (n === 0) throw new Error('Division by zero prohibited!');
    this.res = this.res / n;
    return this.res;
  }

  public mult(n: number): number {
    this.res = this.res * n;
    return this.res;
  }

  public get(): number {
    return this.res;
  }

  public equalsTo(n: number, epsilon: number = Number.EPSILON): boolean {
    return Math.abs(this.res - n) < epsilon;
  }
}

function main() {
  const c: PostFixCalc = new PostFixCalc(2);
  c.add(4);
  c.div(1.5);
  c.sub(1);
  c.mult(2);
  c.neg();
  const expected = -(((2 + 4) / 1.5 - 1) * 2);
  // TODO: comment out the console.log below:
  // Instead of a console.log, add a logpoint here that logs the value of c.get()
  console.log(`The result is: ${c.get()}`);
  assert(c.equalsTo(expected), `The result should be ${expected}!`);
}

main();
console.log('End of program!');
