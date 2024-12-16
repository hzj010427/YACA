import axios from 'axios';
import * as path from 'path';

import 'jest-expect-message';
import App from '../../../server/app';
import { InMemoryDB } from '../../../server/db/inMemory.db';
import AuthController from '../../../server/controllers/auth.controller';

import { Server } from 'http';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { IUser } from '../../../common/user.interface';
import { IAuthenticatedUser } from '../../../common/server.responses';
import { JWT_KEY, JWT_EXP } from '../../../server/env';
import {
  Data,
  Failure,
  isSavedUser,
  isAuthenticatedUser,
  checkResponse
} from './rest.tests.common';

const port = 8080;
const host = 'http://localhost';

let app: App;
let server: Server;
let httpTerminator: HttpTerminator;

beforeAll(async () => {
  app = new App([new AuthController('/auth')], {
    port: port,
    host: host,
    clientDir: path.join(__dirname, '../../../.dist/client'),
    db: new InMemoryDB(),
    url: `${host}:${port.toString()}`,
    initOnStart: true
  });
  server = await app.listen();
  httpTerminator = createHttpTerminator({ server });
});

afterAll(async () => {
  await httpTerminator.terminate();
});

afterEach(async () => {
  await app.db.init();
});

describe('\nAutomated Authentication REST Tests: Prerequisites\n', () => {
  it('should be able to run this test suite', () => {});

  it('should find env variables for JWT_KEY and JWT_EXP', () => {
    expect(
      JWT_KEY,
      'Could not find env variable JWT_KEY!/nYou should import this it in AuthController from env.ts'
    ).toBeTruthy();
    expect(
      JWT_EXP,
      'Could not find env variable JWT_EXP!/nYou should import it in AuthController from env.ts'
    ).toBeTruthy();
  });
});

describe('\nAutomated Authentication REST Tests: JoinYACA\n', () => {
  it('should be able to register and return the new user', async () => {
    Data.user1.credentials.password = Data.correctPassword.password;
    const res = checkResponse({
      actual: await axios.post(app.url + '/auth/users', Data.user1, {
        validateStatus: () => true
      }),
      expected: {
        status: 201,
        data: {
          name: 'UserRegistered',
          payload: Data.savedUser1
        }
      }
    });
    const payload = res.data.payload;
    expect(isSavedUser(payload), Failure.notIUserWithExtra).toBe(true);
    const data: IUser = payload as IUser;
    expect(data.credentials.username, Failure.incorrectUsername).toBe(
      Data.user1.credentials.username
    );
    expect(data.credentials.password, Failure.unObfuscatedPassword).not.toBe(
      Data.user1.credentials.password
    );
    expect(data.extra, Failure.incorrectUserProperty).toBe('Jane Doe');
  });

  it('should not be able to register if user exists', async () => {
    checkResponse({
      actual: await axios.post(app.url + '/auth/users', Data.user1, {
        validateStatus: () => true
      }),
      expected: {
        status: 201,
        data: {
          name: 'UserRegistered',
          payload: Data.user1
        }
      },
      customFailure:
        'Could not register a new user to test registering an existing user!'
    });
    checkResponse({
      actual: await axios.post(
        // try to register the same user again
        app.url + '/auth/users',
        Data.user1,
        {
          validateStatus: () => true
        }
      ),
      expected: {
        status: 400,
        data: {
          name: 'UserExists',
          type: 'ClientError',
          message: 'User already exists'
        }
      }
    });
  });

  it('should not be able to register with missing username', async () => {
    checkResponse({
      actual: await axios.post(
        app.url + '/auth/users',
        Data.user1WithNoUsername,
        {
          validateStatus: () => true
        }
      ),
      expected: {
        status: 400,
        data: {
          name: 'MissingUsername',
          type: 'ClientError',
          message: 'Missing info'
        }
      }
    });
  });

  it('should not be able to register with missing password', async () => {
    checkResponse({
      actual: await axios.post(
        app.url + '/auth/users',
        Data.user1WithNoPassword,
        {
          validateStatus: () => true
        }
      ),
      expected: {
        status: 400,
        data: {
          name: 'MissingPassword',
          type: 'ClientError',
          message: 'Missing info'
        }
      }
    });
  });

  it('should not be able to register with missing name', async () => {
    checkResponse({
      actual: await axios.post(app.url + '/auth/users', Data.user1WithNoExtra, {
        validateStatus: () => true
      }),
      expected: {
        status: 400,
        data: {
          name: 'MissingDisplayName',
          type: 'ClientError',
          message: 'Missing info'
        }
      }
    });
  });

  it('should not be able to register with a weak password: not long enough', async () => {
    Data.user1.credentials.password = Data.weakPasswordShort.password;
    checkResponse({
      actual: await axios.post(app.url + '/auth/users', Data.user1, {
        validateStatus: () => true
      }),
      expected: {
        status: 400,
        data: {
          name: ['WeakPassword', 'InvalidPassword'],
          type: 'ClientError',
          message: 'Password is too short'
        }
      }
    });
  });

  it("should not be able to register with a weak password: does't contain special characters", async () => {
    Data.user1.credentials.password = Data.weakPasswordNoSpChar.password;
    checkResponse({
      actual: await axios.post(app.url + '/auth/users', Data.user1, {
        validateStatus: () => true
      }),
      expected: {
        status: 400,
        data: {
          name: ['WeakPassword', 'InvalidPassword'],
          type: 'ClientError',
          message: 'Password must contain a special character'
        }
      }
    });
  });

  it("should not be able to register with a weak password: doesn't contain a letter", async () => {
    Data.user1.credentials.password = Data.weakPasswordNoLetter.password;
    checkResponse({
      actual: await axios.post(app.url + '/auth/users', Data.user1, {
        validateStatus: () => true
      }),
      expected: {
        status: 400,
        data: {
          name: ['WeakPassword', 'InvalidPassword'],
          type: 'ClientError',
          message: 'Password must contain a letter'
        }
      }
    });
  });

  it("should not be able to register with a weak password: doesn't contain a number", async () => {
    Data.user1.credentials.password = Data.weakPasswordNoNumber.password;
    checkResponse({
      actual: await axios.post(app.url + '/auth/users', Data.user1, {
        validateStatus: () => true
      }),
      expected: {
        status: 400,
        data: {
          name: ['WeakPassword', 'InvalidPassword'],
          type: 'ClientError',
          message: 'Password must contain a number'
        }
      }
    });
  });
});

describe('\nAutomated Authentication REST Tests: LoginToYACA\n', () => {
  it('should be able to login as existing user and get token', async () => {
    Data.user1.credentials.password = Data.correctPassword.password;
    checkResponse({
      actual: await axios.post(app.url + '/auth/users', Data.user1, {
        validateStatus: () => true
      }),
      expected: {
        status: 201,
        data: {
          name: 'UserRegistered',
          payload: Data.savedUser1
        }
      }
    });
    const res = checkResponse({
      actual: await axios.post(
        // try to register the same user again
        app.url + `/auth/tokens/${Data.user1.credentials.username}`,
        Data.correctPassword,
        {
          validateStatus: () => true
        }
      ),
      expected: {
        status: 200,
        data: {
          name: 'UserAuthenticated',
          payload: {
            user: Data.savedUser1,
            token: 'randomToken'
          }
        }
      }
    });
    const payload = res.data.payload;
    expect(isAuthenticatedUser(payload), Failure.notIAuthenticatedUser).toBe(
      true
    );
    const authUser: IAuthenticatedUser = payload as IAuthenticatedUser;
    const user: IUser = authUser.user;
    expect(user.credentials.username, Failure.incorrectUsername).toBe(
      Data.user1.credentials.username
    );
    expect(user.credentials.password, Failure.unObfuscatedPassword).not.toBe(
      Data.user1.credentials.password
    );
    const token: string = authUser.token;
    expect(token, Failure.notValidToken).toBeTruthy();
  });

  it('should not be able to login if user has not registered', async () => {
    checkResponse({
      actual: await axios.post(
        // user is not registered yet
        app.url + `/auth/tokens/${Data.user1.credentials.username}`,
        Data.correctPassword,
        {
          validateStatus: () => true
        }
      ),
      expected: {
        status: 400,
        data: {
          name: ['UnregisteredUser', 'UserNotFound'],
          type: 'ClientError',
          message: 'User not found'
        }
      }
    });
  });

  it('should not be able to login if user has not registered (simplified)', async () => {
    checkResponse({
      actual: await axios.post(
        // user is not registered yet
        app.url + `/auth/tokens/${Data.user1.credentials.username}`,
        Data.correctPassword,
        {
          validateStatus: () => true
        }
      ),
      expected: {
        status: 400,
        data: {
          name: ['UnregisteredUser', 'UserNotFound'],
          type: 'ClientError',
          message: 'User not found'
        }
      }
    });
  });

  it('should not be able to login with incorrect password', async () => {
    Data.user1.credentials.password = Data.correctPassword.password;
    checkResponse({
      actual: await axios.post(app.url + '/auth/users', Data.user1, {
        validateStatus: () => true
      }),
      expected: {
        status: 201,
        data: {
          name: 'UserRegistered',
          payload: Data.savedUser1
        }
      },
      customFailure: [
        'Could not register a new user to test login with incorrect password!',
        'Make sure you have implemented the init() method in the DB!'
      ]
    });
    checkResponse({
      actual: await axios.post(
        // try to register the same user again
        app.url + `/auth/tokens/${Data.user1.credentials.username}`,
        Data.wrongPassword,
        {
          validateStatus: () => true
        }
      ),
      expected: {
        status: 400,
        data: {
          name: 'IncorrectPassword',
          type: 'ClientError',
          message: 'Incorrect password'
        }
      }
    });
  });
});
