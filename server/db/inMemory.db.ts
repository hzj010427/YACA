// an InMemory version of the database that you can use in early-stage development
// It's not persistent, but can be used for testing and debugging
// It allows you to evolve your application in the absense of a real database

import { IDatabase } from './dac';
import { IChatMessage } from '../../common/chatMessage.interface';
import { IReply } from '../../common/reply.interface';
import { IUser } from '../../common/user.interface';
import { IAppError } from '../../common/server.responses';

export class InMemoryDB implements IDatabase {
  // TODO
  private users: Map<string, IUser> = new Map();
  private messages: Map<string, IChatMessage> = new Map();
  private replies: Map<string, IReply[]> = new Map();

  async connect(): Promise<void> {
    // TODO
  }

  async init(): Promise<void> {
    // TODO
    this.users = new Map();
    this.messages = new Map();
  }

  async close(): Promise<void> {
    // TODO
  }

  async saveUser(user: IUser): Promise<IUser> {
    // TODO: must return a copy of the saved user
    if (this.users.has(user.credentials.username)) {
      throw {
        type: 'ClientError',
        name: 'UserExists',
        message: 'The email supplied belongs to an already-registered user',
      } as IAppError;
    }
    const userToSave: IUser = structuredClone(user);
    this.users.set(userToSave.credentials.username, userToSave);
    return structuredClone(userToSave);
  }

  async findUserByUsername(username: string): Promise<IUser | null> {
    const user = this.users.get(username);
    return user ? structuredClone(user) : null;
  }

  async findAllUsers(): Promise<IUser[]> {
    return Array.from(this.users.values()).map(user => structuredClone(user));
  }

  async saveChatMessage(message: IChatMessage): Promise<IChatMessage> {
    if (!message._id) {
      throw {
        type: 'ClientError',
        name: 'MissingMsgId',
        message: 'Message must have an ID',
      } as IAppError;
    }
    if (!message.timestamp) {
      throw {
        type: 'ClientError',
        name: 'MissingTimestamp',
        message: 'Message must have a timestamp',
      } as IAppError;
    }
    this.messages.set(message._id, message);
    return structuredClone(message);
  }

  async findChatMessageById(_id: string): Promise<IChatMessage | null> {
    // TODO
    return null;
  }

  async findAllChatMessages(): Promise<IChatMessage[]> {
    return Array.from(this.messages.values()).map(message => structuredClone(message));
  }

  async deleteUser(username: string): Promise<IUser | null> {
    const deletedUser = this.users.get(username);
    if (deletedUser) {
      this.users.delete(username);
    }
    return deletedUser ? structuredClone(deletedUser) : null;
  }

  async deleteChatMessageByAuthor(author: string): Promise<IChatMessage[]> {
    const deletedMessages: IChatMessage[] = [];
    for (const [id, message] of this.messages) {
      if (message.author === author) {
        deletedMessages.push(structuredClone(message));
        this.messages.delete(id);
      }
    }
    return deletedMessages;
  }

  async deleteChatMessageById(_id: string): Promise<IChatMessage | null> {
    const deletedMessage = this.messages.get(_id);
    if (deletedMessage) {
      this.messages.delete(_id);
    }
    return deletedMessage ? structuredClone(deletedMessage) : null;
  }

  async findRepliesByMessageId(messageId: string): Promise<IReply[]> {
    const replies = this.replies.get(messageId);
    return replies ? replies.map(reply => structuredClone(reply)) : [];
  }

  async saveReply(reply: IReply): Promise<IReply> {
    const replies = this.replies.get(reply.messageId) || [];
    replies.push(reply);
    this.replies.set(reply.messageId, replies);
    return structuredClone(reply);
  }

  async addChatMessageReplyCount(_id: string): Promise<IChatMessage> {
    const message = this.messages.get(_id);
    if (!message) {
      throw {
        type: 'ClientError',
        name: 'MessageNotFound',
        message: 'Message not found',
      } as IAppError;
    } 

    message.replyNum = (message.replyNum || 0) + 1;
    this.messages.set(_id, message);
    return structuredClone(message);
  }
}
