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
  isSavedUser,
  checkResponse,
  isNonEmptyChatMsgArray
} from './rest.tests.common';
import { JWT_KEY, JWT_EXP } from '../../../server/env';
import { IChatMessage } from '../../../common/chatMessage.interface';

const port = 8080;
const host = 'http://localhost';

let app: App;
let server: Server;
let httpTerminator: HttpTerminator;
let tokenForUser1: string | null = null;
let tokenForUser2: string | null = null;

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
    'Could not register and authenticate the 1st user to test deleting a user!'
  );
  tokenForUser2 = await getTokenAndCheck(
    app.url,
    Data.user2,
    Data.savedUser2,
    'Could not register and authenticate the 2nd user to test deleting a user!'
  );
  checkResponse({
    actual: await axios.post(app.url + '/chat/messages', Data.msg1ByUser1, {
      headers: { Authorization: `Bearer ${tokenForUser1}` },
      validateStatus: () => true
    }),
    expected: {
      status: 201,
      data: {
        name: 'ChatMessageCreated',
        payload: Data.msg1ByUser1Saved
      }
    }
  });
  checkResponse({
    actual: await axios.post(app.url + '/chat/messages', Data.msg2ByUser2, {
      headers: { Authorization: `Bearer ${tokenForUser2}` },
      validateStatus: () => true
    }),
    expected: {
      status: 201,
      data: {
        name: 'ChatMessageCreated',
        payload: Data.msg2ByUser2Saved
      }
    }
  });
  checkResponse({
    actual: await axios.post(app.url + '/chat/messages', Data.msg2ByUser1, {
      headers: { Authorization: `Bearer ${tokenForUser1}` },
      validateStatus: () => true
    }),
    expected: {
      status: 201,
      data: {
        name: 'ChatMessageCreated',
        payload: Data.msg2ByUser1Saved
      }
    }
  });
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

describe('\nAutomated REST Tests for Deletion of a User Account: LeaveYACAPermanently \n', () => {
  it('should be possible to delete a user', async () => {
    const res = checkResponse({
      actual: await axios.delete(
        app.url + `/chat/users/${Data.user1.credentials.username}`,
        {
          headers: { Authorization: `Bearer ${tokenForUser1}` },
          validateStatus: () => true
        }
      ),
      expected: {
        status: 200,
        data: {
          name: 'UserDeleted',
          payload: Data.savedUser1
        }
      }
    });
    const payload = res.data.payload;
    expect(isSavedUser(payload), Failure.notIUserWithExtra).toBe(true);
    const user: IUser = payload as IUser;
    expect(user.credentials.username, Failure.notCorrectUser).toBe(
      Data.savedUser1.credentials.username
    );
    expect(user.extra, Failure.notCorrectUser).toBe(Data.savedUser1.extra);
    const resMessages = checkResponse({
      actual: await axios.get(app.url + '/chat/messages', {
        headers: { Authorization: `Bearer ${tokenForUser2}` },
        validateStatus: () => true
      }),
      expected: {
        status: 200,
        data: {
          name: 'ChatMessagesFound',
          payload: [Data.msg2ByUser2Saved]
        }
      }
    });
    const messages = resMessages.data.payload;
    expect(isNonEmptyChatMsgArray(messages), Failure.notChatMsgArray).toBe(
      true
    );
    const actualMsgs: IChatMessage[] = messages as IChatMessage[];
    expect(
      actualMsgs.length,
      "Checking whether deleted user's chat messages were also deleted...\n  " +
        Failure.wrongArrayLength +
        '\n  Probably chat messages that should have been deleted still persist!'
    ).toBe(1);
    actualMsgs.forEach((msg) => {
      delete msg.timestamp;
      delete msg._id;
      delete msg.displayName;
    });
    expect(actualMsgs, Failure.undeletedChatMessage).not.toContainEqual(
      Data.msg1ByUser1
    );
    expect(actualMsgs, Failure.undeletedChatMessage).not.toContainEqual(
      Data.msg2ByUser1
    );
  });
});

it('should not be possible to delete a nonexisting user', async () => {
  checkResponse({
    actual: await axios.delete(app.url + `/chat/users/nonexisting@user.com}`, {
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

it('should not be able to delete a user with a missing token', async () => {
  checkResponse({
    actual: await axios.delete(
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

it('should not be able to delete a user with an invalid token', async () => {
  checkResponse({
    actual: await axios.delete(
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
