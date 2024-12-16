import * as path from 'path';
import axios from 'axios';
import 'jest-expect-message';
import App from '../../../server/app';
import { InMemoryDB } from '../../../server/db/inMemory.db';
import AuthController from '../../../server/controllers/auth.controller';
import ChatController from '../../../server/controllers/chat.controller';
import { Server } from 'http';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { IChatMessage } from '../../../common/chatMessage.interface';
import {
  Data,
  Failure,
  isSavedChatMessage,
  getTokenAndCheck,
  isNonEmptyChatMsgArray,
  registerUserAndCheck,
  checkResponse
} from './rest.tests.common';
import { JWT_KEY, JWT_EXP } from '../../../server/env';

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
  tokenForUser1 = await getTokenAndCheck(app.url, Data.user1, Data.savedUser1);
});

function payLoadIsExpectedChatMessage(
  payload: object,
  expectedSavedMsg: IChatMessage,
  expectedAuthorDisplayName: string
): void {
  expect(isSavedChatMessage(payload), Failure.notIChatMessage).toBe(true);
  const msg: IChatMessage = payload as IChatMessage;
  expect(msg.author, Failure.incorrectAuthor).toBe(expectedSavedMsg.author);
  expect(msg.text, Failure.incorrectText).toBe(expectedSavedMsg.text);
  expect(msg.displayName, Failure.incorrectDisplayName).toBe(
    expectedAuthorDisplayName
  );
  expect(msg.timestamp, Failure.noTimestamp).toBeTruthy();
  expect(msg._id, Failure.noMessageId).toBeTruthy();
}

describe('\nAutomated Chat Room REST Tests: Prerequisites\n', () => {
  it('should be able to run this test suite', () => {});

  it('should find env variables for JWT_KEY and JWT_EXPgi', () => {
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

describe('\nAutomated Chat Room REST Tests: PostAChatMessage\n', () => {
  it('should be able to post a chat message from self', async () => {
    const res = checkResponse({
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
    payLoadIsExpectedChatMessage(
      res.data.payload,
      Data.msg1ByUser1Saved,
      Data.user1.extra
    );
  });

  it('should not be able to post a chat message with no text', async () => {
    checkResponse({
      actual: await axios.post(
        app.url + '/chat/messages',
        Data.msg1ByUser1WithNoText,
        {
          headers: { Authorization: `Bearer ${tokenForUser1}` },
          validateStatus: () => true
        }
      ),
      expected: {
        status: 400,
        data: {
          name: 'MissingChatText',
          type: 'ClientError',
          message: 'The chat message text is missing'
        }
      }
    });
  });

  it('should not be able to post a chat message with no author', async () => {
    checkResponse({
      actual: await axios.post(
        app.url + '/chat/messages',
        Data.msg1ByUser1WithNoAuthor,
        {
          headers: { Authorization: `Bearer ${tokenForUser1}` },
          validateStatus: () => true
        }
      ),
      expected: {
        status: 400,
        data: {
          name: 'MissingAuthor',
          type: 'ClientError',
          message: 'The author of chat message is missing'
        }
      }
    });
  });

  it('should not be able to post a chat message for another user (a user cannot impersonate another user when posting a chat message)', async () => {
    await registerUserAndCheck(
      app.url,
      Data.user2,
      Data.savedUser2,
      'Could not register a new user to test the impersonation of the author in a chat message!'
    );
    checkResponse({
      actual: await axios.post(
        app.url + '/chat/messages',
        Data.msg1ByUser1ImpersonatingUser2,
        {
          headers: { Authorization: `Bearer ${tokenForUser1}` },
          validateStatus: () => true
        }
      ),
      expected: {
        status: 401,
        data: {
          name: 'UnauthorizedRequest',
          type: 'ClientError',
          message: 'Author of chat message must match the authenticated user'
        }
      }
    });
  });

  it('should not be able to post a chat message for a nonexisting user', async () => {
    checkResponse({
      actual: await axios.post(
        app.url + '/chat/messages',
        Data.msg1ByUser1WithNonExistingAuthor,
        {
          headers: { Authorization: `Bearer ${tokenForUser1}` },
          validateStatus: () => true
        }
      ),
      expected: {
        status: 401,
        data: {
          name: ['UnauthorizedRequest', 'UserNotFound', 'OrphanedChatMessage'],
          type: 'ClientError',
          message: 'The author of this chat message does not exist'
        }
      }
    });
  });

  it('should not be able to post a chat message with a missing token', async () => {
    checkResponse({
      actual: await axios.post(app.url + '/chat/messages', Data.msg1ByUser1, {
        validateStatus: () => true
      }),
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

  it('should not be able to post a chat message with an invalid token', async () => {
    checkResponse({
      actual: await axios.post(app.url + '/chat/messages', Data.msg1ByUser1, {
        headers: { Authorization: `Bearer invalidToken` },
        validateStatus: () => true
      }),
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

describe('\nAutomated Chat Room REST Tests: DisplaysChatMessages\n', () => {
  it('will retrieve an empty collection of chat messages when no chat message exists', async () => {
    await app.db.init();
    const tokenForUser1Again = await getTokenAndCheck(
      app.url,
      Data.user1,
      Data.savedUser1
    );
    const res = checkResponse({
      actual: await axios.get(app.url + '/chat/messages', {
        headers: { Authorization: `Bearer ${tokenForUser1Again}` },
        validateStatus: () => true
      }),
      expected: {
        status: 200,
        data: {
          name: 'NoChatMessagesYet',
          payload: []
        }
      }
    });
    expect(res.data.payload, Failure.notEmptyArray).toEqual([]);
  });

  it('should be able to retrieve all chat messages when chat messages exist', async () => {
    await app.db.init();
    const tokenForUser1Again = await getTokenAndCheck(
      app.url,
      Data.user1,
      Data.savedUser1,
      'Could not register and get a token for a 1st user  ' +
        Data.user1.credentials.username +
        'to test the retrieval of chat messages!'
    );
    const tokenForUser2 = await getTokenAndCheck(
      app.url,
      Data.user2,
      Data.savedUser2,
      'Could not register and get a token for a 2nd user ' +
        Data.user2.credentials.username +
        ' to test the retrieval of chat messages!'
    );
    checkResponse({
      actual: await axios.post(app.url + '/chat/messages', Data.msg1ByUser1, {
        headers: { Authorization: `Bearer ${tokenForUser1Again}` },
        validateStatus: () => true
      }),
      expected: {
        status: 201,
        data: {
          name: 'ChatMessageCreated',
          payload: Data.msg1ByUser1Saved
        }
      },
      customFailure:
        'Could not post a chat message for user 1 ' +
        Data.msg1ByUser1.author +
        ' for testing retrieved messages!'
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
      },
      customFailure:
        'Could not post a chat message for user 2 ' +
        Data.msg1ByUser1.author +
        ' for testing retrived messages!'
    });
    const res = checkResponse({
      actual: await axios.get(app.url + '/chat/messages', {
        headers: { Authorization: `Bearer ${tokenForUser1Again}` },
        validateStatus: () => true
      }),
      expected: {
        status: 200,
        data: {
          name: 'ChatMessagesFound',
          payload: [Data.msg1ByUser1Saved, Data.msg2ByUser2Saved]
        }
      }
    });
    const payload = res.data.payload;
    expect(isNonEmptyChatMsgArray(payload), Failure.notChatMsgArray).toBe(true);
    const actualMsgs: IChatMessage[] = payload as IChatMessage[];
    expect(actualMsgs.length, Failure.wrongArrayLength).toBe(2);
    actualMsgs.forEach((msg) => {
      delete msg.timestamp;
      delete msg._id;
      delete msg.displayName;
    });
    expect(actualMsgs, Failure.missingChatMessage).toContainEqual(
      Data.msg1ByUser1
    );
    expect(actualMsgs, Failure.missingChatMessage).toContainEqual(
      Data.msg2ByUser2
    );
  });

  it('should not be able to retrieve all chat messages with a missing token', async () => {
    checkResponse({
      actual: await axios.get(app.url + '/chat/messages', {
        validateStatus: () => true
      }),
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

  it('should not be able to retrieve all chat messages with an invalid token', async () => {
    checkResponse({
      actual: await axios.get(app.url + '/chat/messages', {
        headers: { Authorization: `Bearer invalidToken` },
        validateStatus: () => true
      }),
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
