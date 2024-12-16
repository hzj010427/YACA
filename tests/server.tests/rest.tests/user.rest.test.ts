import * as path from 'path';
import axios, { AxiosResponse } from 'axios';
import 'jest-expect-message';
import App from '../../../server/app';
import { InMemoryDB } from '../../../server/db/inMemory.db';
import AuthController from '../../../server/controllers/auth.controller';
import ChatController from '../../../server/controllers/chat.controller';
import { Server } from 'http';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { IUser } from '../../../common/user.interface';
import {
  Data,
  Failure,
  getTokenAndCheck,
  isNonEmptyUsernameArray,
  isNonEmptyUserArray,
  registerUserAndCheck,
  isSavedUser,
  checkResponse
} from './rest.tests.common';
import { JWT_KEY, JWT_EXP } from '../../../server/env';
import e from 'express';

const port = 8080;
const host = 'http://localhost';

let app: App;
let server: Server;
let httpTerminator: HttpTerminator;
let tokenForUser1: string | null = null;

afterAll(async () => {
  await httpTerminator.terminate();
});

afterEach(async () => {
  // DO NOT INITIALIZE THE DATABASE FOR THIS TEST SUITE!
  // Tests that need a blank DB will initialize it!
});

beforeAll(async () => {
  app = new App([new AuthController('/auth'), new ChatController('/chat')], {
    port: port,
    host: host,
    clientDir: path.join(__dirname, '../../../.dist/client'),
    db: new InMemoryDB(),
    url: `${host}:${port.toString()}`,
    initOnStart: true
  });
  server = await app.listen();
  httpTerminator = createHttpTerminator({ server });
  tokenForUser1 = await getTokenAndCheck(
    app.url,
    Data.user1,
    Data.savedUser1,
    'Could not register and authenticate the 1st user to test the retrieval of all users!'
  );
  await registerUserAndCheck(
    app.url,
    Data.user2,
    Data.savedUser2,
    'Could not register a 2nd user to test the retrieval of all users!'
  );
});

describe('\nAutomated Misc User REST Tests: Prerequisites\n', () => {
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

  it('should be able register and login as existing user to get a valid token', async () => {
    expect(tokenForUser1, Failure.notValidToken).toBeTruthy();
  });
});

describe('\nAutomated Misc User REST Tests: GetUserOrUsers > GetsUsers \n', () => {
  /* disable this test for now, since there is a discrepancy between the spec and response */
  it('should be possible to retrieve all users', async () => {
    const axiosOpts = {
      headers: {
        Authorization: `Bearer ${tokenForUser1}`
      },
      validateStatus: () => true
    };
    /* first figure out how the endpoint is defined */
    /* try GET /chat/users => IUser[]*/
    /* try GET /chat/users => string[] */
    /* try GET /chat/usernames => string[] */
    let actual: AxiosResponse;
    let expectedPayload: unknown;
    const ep1 = await axios.get(app.url + '/chat/users', axiosOpts);
    if (ep1.status !== 404) {
      actual = ep1;
      if (isNonEmptyUserArray(ep1.data.payload)) {
        expectedPayload = [Data.savedUser1, Data.savedUser2];
      } else if (isNonEmptyUsernameArray(ep1.data.payload)) {
        expectedPayload = [
          Data.savedUser1.credentials.username,
          Data.savedUser2.credentials.username
        ];
      } else {
        throw new Error(Failure.getUsersPayloadWrong);
      }
    } else {
      const ep2 = await axios.get(app.url + '/chat/usernames', axiosOpts);
      if (ep2.status !== 404) {
        actual = ep2;
        expectedPayload = [
          Data.savedUser1.credentials.username,
          Data.savedUser2.credentials.username
        ];
      } else {
        throw new Error(Failure.wrongUsersEndpoint);
      }
    }
    console.error('actual:', actual.data);
    console.error('expected:', expectedPayload);
    const res = checkResponse({
      actual: actual,
      expected: {
        status: 200,
        data: {
          name: 'UsersFound',
          payload: expectedPayload
        }
      }
    });
    const payload = res.data.payload;
    let usernames: string[];
    if (isNonEmptyUsernameArray(payload)) {
      expect(isNonEmptyUsernameArray(payload), Failure.notUsernameArray).toBe(
        true
      );
      usernames = payload as string[];
      expect(usernames.length, Failure.wrongArrayLength).toBe(2);
      expect(usernames, Failure.missingUser).toContainEqual(
        Data.savedUser1.credentials.username
      );
      expect(usernames, Failure.missingUser).toContainEqual(
        Data.savedUser2.credentials.username
      );
    } else if (isNonEmptyUserArray(payload)) {
      const users = payload as IUser[];
      expect(users.length, Failure.wrongArrayLength).toBe(2);
      usernames = users.map((user: IUser) => user.credentials.username);
    } else {
      throw new Error(Failure.wrongUsersEndpoint);
    }
    expect(usernames, Failure.missingUser).toContainEqual(
      Data.savedUser1.credentials.username
    );
    expect(usernames, Failure.missingUser).toContainEqual(
      Data.savedUser2.credentials.username
    );
  });

  it('should not be able to retrieve all users with a missing token', async () => {
    const axiosOpts = {
      validateStatus: () => true
    };
    /* first figure out how the endpoint is defined */
    /* try GET /chat/users => IUser[]*/
    /* try GET /chat/users => string[] */
    /* try GET /chat/usernames => string[] */
    let actual: AxiosResponse;
    const ep1 = await axios.get(app.url + '/chat/users', axiosOpts);
    if (ep1.status !== 404) {
      actual = ep1;
    } else {
      const ep2 = await axios.get(app.url + '/chat/usernames', axiosOpts);
      if (ep2.status !== 404) {
        actual = ep2;
      } else {
        throw new Error(Failure.wrongUsersEndpoint);
      }
    }
    checkResponse({
      actual: actual,
      expected: {
        status: 401,
        data: {
          name: 'MissingToken',
          type: 'ClientError',
          message: 'A token is missing and is required for authorization'
        }
      }
    });
  });

  it('should not be able to retrieve all users with an invalid token', async () => {
    const axiosOpts = {
      headers: { Authorization: `Bearer invalidToken` },
      validateStatus: () => true
    };
    /* first figure out how the endpoint is defined */
    /* try GET /chat/users => IUser[]*/
    /* try GET /chat/users => string[] */
    /* try GET /chat/usernames => string[] */
    let actual: AxiosResponse;
    const ep1 = await axios.get(app.url + '/chat/users', axiosOpts);
    if (ep1.status !== 404) {
      actual = ep1;
    } else {
      const ep2 = await axios.get(app.url + '/chat/usernames', axiosOpts);
      if (ep2.status !== 404) {
        actual = ep2;
      } else {
        throw new Error(Failure.wrongUsersEndpoint);
      }
    }
    checkResponse({
      actual: actual,
      expected: {
        status: 401,
        data: {
          name: 'InvalidToken',
          type: 'ClientError',
          message: 'The token is invalid: cannot authorize'
        }
      }
    });
  });
});

describe('\nAutomated Misc User REST Tests: GetUserOrUsers > GetsOneUser \n', () => {
  it('should be possible to retrieve a user with a given username', async () => {
    const res = checkResponse({
      actual: await axios.get(
        app.url + `/chat/users/${Data.user2.credentials.username}`,
        {
          headers: { Authorization: `Bearer ${tokenForUser1}` },
          validateStatus: () => true
        }
      ),
      expected: {
        status: 200,
        data: {
          name: 'UserFound',
          payload: Data.savedUser2
        }
      }
    });
    const payload = res.data.payload;
    expect(isSavedUser(payload), Failure.notIUserWithExtra).toBe(true);
    const user: IUser = payload as IUser;
    expect(user.credentials.username, Failure.notCorrectUser).toBe(
      Data.savedUser2.credentials.username
    );
    expect(user.extra, Failure.notCorrectUser).toBe(Data.savedUser2.extra);
  });

  it('should not be possible to retrieve a nonexisting user', async () => {
    checkResponse({
      actual: await axios.get(app.url + `/chat/users/nonexisting@user.com}`, {
        headers: { Authorization: `Bearer ${tokenForUser1}` },
        validateStatus: () => true
      }),
      expected: {
        status: 400,
        data: {
          type: 'ClientError',
          name: 'UserNotFound',
          message: 'The user could not be found'
        }
      }
    });
  });

  it('should not be able to retrieve a user with a missing token', async () => {
    checkResponse({
      actual: await axios.get(
        app.url + `/chat/users/${Data.user2.credentials.username}`,
        {
          validateStatus: () => true
        }
      ),
      expected: {
        status: 401,
        data: {
          name: 'MissingToken',
          type: 'ClientError',
          message: 'A token is missing and is required for authorization'
        }
      }
    });
  });

  it('should not be able to retrieve a user with an invalid token', async () => {
    checkResponse({
      actual: await axios.get(
        app.url + `/chat/users/${Data.user2.credentials.username}`,
        {
          headers: { Authorization: `Bearer invalidToken` },
          validateStatus: () => true
        }
      ),
      expected: {
        status: 401,
        data: {
          name: 'InvalidToken',
          type: 'ClientError',
          message: 'The token is invalid: cannot authorize'
        }
      }
    });
  });
});
