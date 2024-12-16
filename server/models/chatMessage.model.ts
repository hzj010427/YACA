// This is the model for chat messages
// It is used by the controllers to access functionality related chat messages, including database access

import DAC from '../db/dac';
import { v4 as uuidV4, validate } from 'uuid';
import { IChatMessage, IReaction } from '../../common/chatMessage.interface';
import { IUser } from '../../common/user.interface';
import { ReactionType } from '../../common/reactionType';
import { IAppError } from '../../common/server.responses';
import { User } from './user.model';

export class ChatMessage implements IChatMessage {
  public timestamp: string;
  public _id: string;
  public displayName?: string;

  constructor(
    public author: string,
    public text: string,
  ) {
    this._id = uuidV4();
    this.timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  async post(): Promise<IChatMessage> {
    try {
      const user = await User.getUserForUsername(this.author);
      this.displayName = user?.extra;
      return await DAC.db.saveChatMessage(this);
    } catch (err) {
      throw {
        type: 'ServerError',
        name: 'PostRequestFailure',
        message: 'Failed to post chat message',
      } as IAppError;
    }
  }

  static async updateReaction(messageId: string, reaction: IReaction): Promise<IChatMessage> {
    const message = await DAC.db.findChatMessageById(messageId);
    if (!message) {
      throw {
        type: 'ClientError',
        name: 'OrphanedReaction',
        message: 'Cannot add reaction to non-existent message',
      } as IAppError;
    }

    this.validateReaction(reaction);

    if (!message.reactions) {
      message.reactions = [];
    }

    const existingReaction = message.reactions.find(r => r.type === reaction.type && r.author === reaction.author);
    if (existingReaction) {
      message.reactions = message.reactions.filter(r => r !== existingReaction);
    } else {
      message.reactions.push(reaction);
    }

    await DAC.db.saveChatMessage(message);
    return message;
  }

  static async getAllChatMessages(): Promise<IChatMessage[]> {
    try {
      return await DAC.db.findAllChatMessages();
    } catch (err) {
      throw {
        type: 'ServerError',
        name: 'GetRequestFailure',
        message: 'Failed to retrieve chat messages',
      } as IAppError;
    }
  }

  static async deleteChatMessagesByAuthor(author: string): Promise<IChatMessage[]> {
    try {
      return await DAC.db.deleteChatMessageByAuthor(author);
    } catch (err) {
      throw {
        type: 'ServerError',
        name: 'DeleteRequestFailure',
        message: 'Failed to delete chat messages',
      } as IAppError;
    }
  }

  static async deleteChatMessagesById(messageId: string): Promise<IChatMessage | null> {
    try {
      return await DAC.db.deleteChatMessageById(messageId);
    } catch (err) {
      throw {
        type: 'ServerError',
        name: 'DeleteRequestFailure',
        message: 'Failed to delete chat message',
      } as IAppError;
    }
  }

  static async addChatMessageReplyCount(messageId: string): Promise<IChatMessage> {
    try {
      return await DAC.db.addChatMessageReplyCount(messageId);
    } catch (err) {
      throw {
        type: 'ServerError',
        name: 'PatchRequestFailure',
        message: 'Failed to update chat message',
      } as IAppError;
    }
  }

  private static validateReaction(reaction: IReaction): void {
    if (!Object.values(ReactionType).includes(reaction.type)) {
      throw {
        type: 'ClientError',
        name: 'InvalidReactionType',
        message: 'Invalid reaction type',
      } as IAppError;
    }
  }
}
