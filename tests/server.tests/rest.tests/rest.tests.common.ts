import { IUser } from '../../../common/user.interface';
import { IChatMessage } from '../../../common/chatMessage.interface';
import {
  ISuccess,
  IAuthenticatedUser,
  IAppError,
  IResponse
} from '../../../common/server.responses';

import axios, { AxiosResponse } from 'axios';
import 'jest-expect-message';

const useMockResponses = false;

export enum Failure {
  incorrectStatus = 'Incorrect status code!',
  incorrectResponseBody = 'Response body should be defined, and not null or empty!',
  incorrectUsername = 'Incorrect username!',
  incorrectUserProperty = 'A user property is incorrect!',
  notISuccess = 'Response should be a valid ISuccess object:\n' +
    '  -- Check name property exists and is a valid SuccessName!\n' +
    '  -- Check payload property exists and is a valid IPayload object!\n',
  emptyErrorMessage = 'Error message should not be empty!',
  notIUserWithExtra = 'Payload should be a valid IUser object:\n' +
    '  -- Check credentials property exists and is a valid ILogin object!\n' +
    "  -- Check extra property that stores the user's display name exists!\n" +
    '  -- Check password is obfuscated (can be hashed version from DB or a dummy passord!\n',
  notIUser = 'Payload should be a valid IUser object:\n' +
    '  -- Check credentials property exists and is a valid ILogin object!\n' +
    '  -- Check password is obfuscated (can be hashed version from DB or a dummy passord!\n',
  unObfuscatedPassword = "Password returned from server should be obfuscated and cannot equal user's original password",
  notIAuthenticatedUser = 'Payload should be a valid IAuthenticatedUser object:\n' +
    '  -- Check user property exists and is a valid IUser object!\n' +
    '  -- Check token property exists and stores the JWT token!\n',
  invalidNameProperty = 'The name property should equal the expected SuccessName or AppErrorName!',
  notValidToken = 'The token should be a valid JWT token string',
  notIAppError = 'Response should be a valid IAppError object:\n' +
    '  -- Check type property exists and is a valid ErrorType!\n' +
    '  -- Check name property exists and is a valid AppErrorName!\n' +
    '  -- Check message property exists!\n',
  incorrectErrorType = 'Incorrect AppError type',
  incorrectErrorName = 'Incorrect AppError name',
  notIChatMessage = 'Payload should be a valid IChatMessage object:\n' +
    '  -- Check author property of type string exists!\n' +
    '  -- Check text property of type string exists!\n' +
    '  -- Check displayName property of type string is added by server!\n' +
    '  -- Check timestamp property of type string is added by server!\n' +
    '  -- Check _id property of type string is added by server!\n',
  incorrectAuthor = 'The author property should be the same as the user who posted the message!',
  incorrectText = 'The text property should be the same as the message text posted!',
  incorrectDisplayName = 'The displayName property should be the same as the display name (extra property) of user who posted the message!',
  messageWithNoText = 'The chat message text is missing!',
  noMessageId = 'The chat message _id is missing!',
  noTimestamp = 'The chat message timestamp is missing!',
  notEmptyArray = 'The expected payload is an empty array when no chat messages are found!',
  notChatMsgArray = 'The payload should be an array of IChatMessage objects!',
  wrongArrayLength = 'The length the array received in the payload is incorrect!',
  missingChatMessage = 'The payload is missing a previously saved chat message!',
  missingUser = 'The payload is missing a previously registered user!',
  notCorrectUser = 'The user returned is not the right user!',
  namePropertyMissing = 'The response should be an IResponse object with a name property!',
  notUsernameArray = 'The payload should be an array of usernames',
  wrongUsersEndpoint = 'Could not determine the nature of the endpoint!\n' +
    'It must be implemented either as "GET /chat/users" or as "GET /chat/usernames!"',
  getUsersPayloadWrong = 'Could not determine the type of the payload property of the response!n' +
    'It must be either an IUser[] or a string[] for this endpoint!',
  undeletedChatMessage = 'A user was deleted, but at least one chat message that belongs to the user still exists'
}

export function pickResponse(real: AxiosResponse, mock: object): AxiosResponse {
  return useMockResponses ? (mock as AxiosResponse) : real;
}

export function expectToBeEither(
  received: string,
  notAnyOfValues: string,
  ...expectedValues: string[]
) {
  if (expectedValues.includes(received)) return;
  throw new Error(
    notAnyOfValues +
      ':\n  -- Expected: one of ' +
      expectedValues.join(', ') +
      '\n  -- Received: ' +
      received
  );
}

export function isValidResponse(obj: unknown): obj is IResponse {
  if (!obj || typeof obj !== 'object') return false;
  return 'name' in obj && typeof obj.name === 'string' && obj.name !== '';
}

export function isSuccess(obj: unknown): obj is ISuccess {
  if (!obj || typeof obj !== 'object') return false;
  return (
    'name' in obj &&
    'payload' in obj &&
    typeof obj.name === 'string' &&
    (typeof obj.payload === 'object' || obj.payload === null)
  );
}

export function isAppError(obj: unknown): obj is IAppError {
  if (!obj || typeof obj !== 'object') return false;
  return (
    'name' in obj &&
    'message' in obj &&
    'type' in obj &&
    typeof obj.name === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.type === 'string' &&
    (obj.type === 'ClientError' ||
      obj.type === 'ServerError' ||
      obj.type === 'UnknownError')
  );
}

/* function isResponse(obj: unknown): obj is IResponse {
      if (!obj || typeof obj !== 'object') return false;
      return 'name' in obj && typeof obj.name === 'string';
    }*/

export function isUser(obj: unknown): obj is IUser {
  if (!obj || typeof obj !== 'object') return false;
  if (
    'credentials' in obj &&
    obj.credentials &&
    typeof obj.credentials === 'object'
  ) {
    return (
      'password' in obj.credentials &&
      'username' in obj.credentials &&
      typeof obj.credentials.password === 'string' &&
      typeof obj.credentials.username === 'string'
    );
  }
  return false;
}

export function isSavedUser(obj: unknown): obj is IUser {
  if (!isUser(obj)) return false;
  if ('extra' in obj) {
    return typeof obj.extra === 'string';
  }
  return false;
}

export function isNonEmptyUsernameArray(obj: unknown): obj is string[] {
  if (!obj || !Array.isArray(obj)) return false;
  if (obj.length === 0) return false;
  return obj.every((user) => {
    return typeof user === 'string';
  });
}

export function isAuthenticatedUser(obj: unknown): obj is IAuthenticatedUser {
  if (!obj || typeof obj !== 'object') return false;
  if (
    'user' in obj &&
    'token' in obj &&
    isUser(obj.user) &&
    typeof obj.token === 'string'
  )
    return true;
  return false;
}

export function isChatMessage(obj: unknown): obj is IChatMessage {
  if (!obj || typeof obj !== 'object') return false;
  return (
    'text' in obj &&
    'author' in obj &&
    typeof obj.text === 'string' &&
    typeof obj.author === 'string'
  );
}

export function isSavedChatMessage(obj: unknown): obj is IChatMessage {
  if (!isChatMessage(obj)) return false;
  return (
    'displayName' in obj &&
    'timestamp' in obj &&
    '_id' in obj &&
    typeof obj.displayName === 'string' &&
    typeof obj.timestamp === 'string' &&
    typeof obj._id === 'string'
  );
}

export function isNonEmptyChatMsgArray(obj: unknown): obj is IChatMessage[] {
  if (!obj || !Array.isArray(obj)) return false;
  if (obj.length === 0) return false;
  return obj.every((msg) => {
    return isChatMessage(msg);
  });
}

export function isNonEmptyUserArray(obj: unknown): obj is IUser[] {
  if (!obj || !Array.isArray(obj)) return false;
  if (obj.length === 0) return false;
  return obj.every((msg) => {
    return isUser(msg);
  });
}

export class Data {
  static correctPassword = {
    password: '123bl@hBl@h'
  };

  static wrongPassword = {
    password: '123veryWrong@Password'
  };

  static weakPasswordShort = {
    password: 'a2@'
  };

  static weakPasswordNoSpChar = {
    password: 'aBc12'
  };

  static weakPasswordNoLetter = {
    password: '12!45'
  };

  static weakPasswordNoNumber = {
    password: 'aBc#E'
  };

  static user1 = {
    credentials: {
      username: 'jane@someone.com',
      password: Data.correctPassword.password
    },
    extra: 'Jane Doe'
  };

  static user2 = {
    credentials: {
      username: 'john@someone.com',
      password: Data.correctPassword.password
    },
    extra: 'John Smith'
  };

  static savedUser1 = {
    credentials: {
      username: Data.user1.credentials.username,
      password: 'obfuscated'
    },
    extra: Data.user1.extra
  };

  static savedUser2 = {
    credentials: {
      username: Data.user2.credentials.username,
      password: 'obfuscated'
    },
    extra: Data.user2.extra
  };

  static user1WithNoUsername = {
    credentials: {
      password: Data.user1.credentials.password
    },
    extra: Data.user1.extra
  };

  static user1WithNoPassword = {
    credentials: {
      username: Data.user1.credentials.username
    },
    extra: Data.user1.extra
  };

  static user1WithNoExtra = {
    credentials: {
      username: Data.user1.credentials.username,
      password: Data.user1.credentials.password
    }
  };

  static msg1ByUser1 = {
    text: `Hello, this is the 1st post by ${Data.user1.extra}!`,
    author: Data.user1.credentials.username
  };

  static msg2ByUser1 = {
    text: `Hello, this is the 2nd post by ${Data.user1.extra}!`,
    author: Data.user1.credentials.username
  };

  static msg2ByUser2 = {
    text: `Hello, I am ${Data.user2.extra}!`,
    author: Data.user2.credentials.username
  };

  static msg1ByUser1Saved = {
    text: Data.msg1ByUser1.text,
    author: Data.user1.credentials.username,
    displayName: Data.user1.extra,
    timestamp: 'someTimestamp1',
    _id: 'fakeId1'
  };

  static msg2ByUser1Saved = {
    text: Data.msg2ByUser1.text,
    author: Data.user1.credentials.username,
    displayName: Data.user1.extra,
    timestamp: 'someTimestamp2',
    _id: 'fakeId2'
  };

  static msg2ByUser2Saved = {
    text: Data.msg2ByUser2.text,
    author: Data.user2.credentials.username,
    displayName: Data.user2.extra,
    timestamp: 'someTimestamp3',
    _id: 'fakeId3'
  };

  static msg1ByUser1WithNoAuthor = {
    text: Data.msg1ByUser1.text
  };

  static msg1ByUser1WithNoText = {
    author: Data.msg1ByUser1.author
  };

  static msg1ByUser1SavedWithNoId = {
    text: Data.msg1ByUser1Saved.text,
    author: Data.user1.credentials.username,
    displayName: Data.user1.extra,
    timestamp: Data.msg1ByUser1Saved.timestamp
  };

  static msg1ByUser1SavedWithNoTimestamp = {
    text: Data.msg1ByUser1Saved.text,
    author: Data.user1.credentials.username,
    displayName: Data.user1.extra,
    _id: Data.msg1ByUser1Saved._id
  };

  static msg1ByUser1SavedWithNoDisplayName = {
    text: Data.msg1ByUser1Saved.text,
    author: Data.user1.credentials.username,
    timestamp: Data.msg1ByUser1Saved.timestamp,
    _id: Data.msg1ByUser1Saved._id
  };

  static msg1ByUser1ImpersonatingUser2 = {
    text: Data.msg1ByUser1.text,
    author: Data.user2.credentials.username
  };

  static msg1ByUser1WithNonExistingAuthor = {
    text: Data.msg1ByUser1.text,
    author: 'nonexisting@someone.com'
  };
}

function expectSuccess(actual: AxiosResponse) {
  expect(isSuccess(actual.data), Failure.notISuccess).toBe(true);
}

function expectError(actual: AxiosResponse) {
  expect(isAppError(actual.data), Failure.notIAppError).toBe(true);
}

export function checkResponse(args: {
  actual: AxiosResponse;
  expected: object;
  customFailure?: string[] | string;
}): AxiosResponse {
  const expectedRes = args.expected as AxiosResponse;
  const mock = JSON.parse(JSON.stringify(args.expected));
  if (Array.isArray(expectedRes.data.name))
    mock.data.name = expectedRes.data.name[0];
  const actualRes = pickResponse(args.actual, mock);
  const data = actualRes.data;
  expect(
    isValidResponse(data),
    'The body of the response does not contain valid data!\n' +
      '  Status code received was: ' +
      actualRes.status +
      ', but should have been ' +
      expectedRes.status +
      '!' +
      (actualRes.status === 404
        ? '\n  Perhaps the endpoint is not defined yet!\n'
        : '')
  ).toBe(true);
  const name = 'name' in data ? data.name : '';
  let failureMsg: string =
    Failure.incorrectStatus + '\n  IResponse name was: ' + name;
  let messages: string[];
  if (args.customFailure && Array.isArray(args.customFailure)) {
    messages = args.customFailure;
    messages.forEach((msg) => {
      failureMsg = failureMsg + '\n  ' + msg;
    });
  } else if (args.customFailure) {
    failureMsg = failureMsg + '\n  ' + args.customFailure;
  }
  expect(actualRes.status, failureMsg).toBe(expectedRes.status);
  expect(name, Failure.namePropertyMissing).toBeTruthy();
  if (!Array.isArray(expectedRes.data.name))
    expect(data.name, Failure.invalidNameProperty).toBe(expectedRes.data.name);
  else {
    expectToBeEither(
      data.name as string,
      Failure.invalidNameProperty,
      ...expectedRes.data.name
    );
  }
  if (expectedRes.status <= 200 && expectedRes.status < 300) {
    expectSuccess(actualRes);
  } else if (expectedRes.status >= 400 && expectedRes.status < 600) {
    expectError(actualRes);
  }
  return actualRes;
}

export async function registerUserAndCheck(
  url: string,
  userToSave: IUser,
  expectedSavedUser: IUser,
  customFailure?: string
): Promise<IUser | null> {
  const res = checkResponse({
    actual: await axios.post(url + '/auth/users', userToSave, {
      validateStatus: () => true
    }),
    expected: {
      status: 201,
      data: {
        name: 'UserRegistered',
        payload: expectedSavedUser
      }
    },
    customFailure: [
      'Could not register a new user!',
      'Make sure you have implemented the init() method in the DB!',
      'Make sure registration is implemented correctly in the AuthController!',
      customFailure ? customFailure : ''
    ]
  });
  expect(isUser(res.data.payload), Failure.notIUser).toBe(true);
  if (isUser(res.data.payload)) {
    return res.data.payload;
  }
  return null;
}

export async function loginUserAndCheck(
  url: string,
  userToLogin: IUser,
  userToBeReturned: IUser,
  customFailure?: string
): Promise<IAuthenticatedUser | null> {
  const res = checkResponse({
    actual: await axios.post(
      // try to register the same user again
      url + `/auth/tokens/${userToLogin.credentials.username}`,
      { password: userToLogin.credentials.password },
      {
        validateStatus: () => true
      }
    ),
    expected: {
      status: 200,
      data: {
        name: 'UserAuthenticated',
        payload: {
          user: userToBeReturned,
          token: 'randomToken'
        }
      }
    },
    customFailure
  });
  const info = res.data;
  expect(info.name, Failure.invalidNameProperty).toBe('UserAuthenticated');
  expect(isAuthenticatedUser(info.payload), Failure.notIAuthenticatedUser).toBe(
    true
  );
  if (isAuthenticatedUser(info.payload)) {
    const authUser: IAuthenticatedUser = info.payload as IAuthenticatedUser;
    const user: IUser = authUser.user;
    expect(user.credentials.username, Failure.incorrectUsername).toBe(
      userToLogin.credentials.username
    );
    return authUser;
  }
  return null;
}

export async function getTokenAndCheck(
  url: string,
  userSent: IUser,
  userSaved: IUser,
  customFailure?: string
): Promise<string | null> {
  let token: string | null = null;
  const saved: IUser | null = await registerUserAndCheck(
    url,
    userSent,
    userSaved,
    customFailure
  );
  if (saved) {
    const authUser: IAuthenticatedUser | null = await loginUserAndCheck(
      url,
      userSent,
      userSaved,
      customFailure
    );
    if (authUser) token = authUser.token;
  }
  return token;
}
