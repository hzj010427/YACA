// This is the real database, using MongoDB and Mongoose
// It can be initialized with a MongoDB URL pointing to a production or development/test database

import { IDatabase } from './dac';
import mongoose from 'mongoose';
import { Schema, model } from 'mongoose';
import { IUser } from '../../common/user.interface';
import { IChatMessage, IReaction } from '../../common/chatMessage.interface';
import { IReply } from '../../common/reply.interface';
import { IAppError } from '../../common/server.responses';
import { ReactionType } from '../../common/reactionType';

// Temporarily this class delegates all operations to an instance of in-memory DB
// Remove in-memory completely after implementing ALL mongoDB methods

const UserSchema = new Schema<IUser>({
  credentials: {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  _id: { type: String, required: false },
  extra: { type: String, required: false },
});

const ReactionSchema = new Schema<IReaction>({
  author: { type: String, required: true },
  type: { type: String, enum: Object.values(ReactionType), required: true },
});

const ChatMessageSchema = new Schema<IChatMessage>({
  author: { type: String, required: true },
  text: { type: String, required: true },
  displayName: { type: String, required: false },
  timestamp: { type: String, required: false },
  _id: { type: String, required: false },
  reactions: { type: [ReactionSchema], required: false },
  replyNum: { type: Number, required: false },
});

const ReplySchema = new Schema<IReply>({
  messageId: { type: String, required: true },
  author: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: String, required: false },
  displayName: { type: String, required: false },
  _id: { type: String, required: false },
});

const MUser = model<IUser>('User', UserSchema);

const MChatMessage = model<IChatMessage>('Message', ChatMessageSchema);

const MReply = model<IReply>('Reply', ReplySchema);

export class MongoDB implements IDatabase {
  public dbURL: string;

  private db: mongoose.Connection | undefined;

  constructor(dbURL: string) {
    this.dbURL = dbURL;
  }

  async connect(): Promise<void> {
    // TODO
    try {
      await mongoose.connect(this.dbURL);
      this.db = mongoose.connection;
      console.log('⚡️[Server]: Connected to MongoDB');
    } catch (error) {
      console.error('⚡️[Server]: Error connecting to MongoDB:', error);
      throw error;
    }
  }

  async init(): Promise<void> {
    // TODO
    if (!this.db) {
      throw new Error('Database connection is not initialized. Call connect() first.');
    }
    console.log('⚡️[Server]: MongoDB initialized');
  }

  async close(): Promise<void> {
    // TODO
    if (this.db) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }

  async saveUser(user: IUser): Promise<IUser> {
    try {
      const existingUser = await MUser.findOne({ 'credentials.username': user.credentials.username }).exec();
      if (existingUser) {
        throw {
          type: 'ClientError',
          name: 'UserExists',
          message: 'The email supplied belongs to an already-registered user',
        } as IAppError;
      }

      const newUser = new MUser(user);
      const savedUser = await newUser.save();
      return savedUser.toObject();
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: error.message,
      }
    }
  }

  async findUserByUsername(username: string): Promise<IUser | null> {
    // TODO
    try {
      return MUser.findOne({ 'credentials.username': username }).exec();
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: error.message,
      }
    }
  }

  async findAllUsers(): Promise<IUser[]> {
    // TODO
    try {
      return MUser.find().exec();
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: error.message,
      }
    }
  }

  async saveChatMessage(message: IChatMessage): Promise<IChatMessage> {
    // TODO
    try {
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
      const newMessage = new MChatMessage(message);
      const savedMessage = await newMessage.save();
      return savedMessage.toObject();
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: error.message,
      }
    }
  }

  async findAllChatMessages(): Promise<IChatMessage[]> {
    // TODO
    try {
      return MChatMessage.find().exec();
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: error.message,
      }
    }
  }

  async findChatMessageById(_id: string): Promise<IChatMessage | null> {
    // TODO
    try {
      return MChatMessage.findById(_id).exec();
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: error.message,
      }
    }
  }

  async deleteUser(username: string): Promise<IUser | null> {
    try {
      return MUser.findOneAndDelete({ 'credentials.username': username }).exec();
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: error.message,
      }
    }
  }

  async deleteChatMessageByAuthor(author: string): Promise<IChatMessage[]> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const deletedMsgs: IChatMessage[] = await MChatMessage.find({ author }).session(session).exec();

      await MChatMessage.deleteMany({ author }).session(session).exec();

      await session.commitTransaction();

      return deletedMsgs;
    } catch (error) {
      await session.abortTransaction();
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: error.message,
      }
    } finally {
      session.endSession();
    }
  }

  async deleteChatMessageById(_id: string): Promise<IChatMessage | null> {
    try {
      return MChatMessage.findByIdAndDelete(_id).exec();
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: error.message,
      }
    }
  }

  async findRepliesByMessageId(messageId: string): Promise<IReply[]> {
    try {
      return MReply.find({ messageId }).exec();
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: error.message,
      }
    }
  }

  async saveReply(reply: IReply): Promise<IReply> {
    try {
      const newReply = new MReply(reply);
      const savedReply = await newReply.save();
      return savedReply.toObject();
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: error.message,
      }
    }
  }

  async addChatMessageReplyCount(_id: string): Promise<IChatMessage> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const message = await MChatMessage.findById(_id).session(session).exec();
      if (!message) {
        throw {
          type: 'ClientError',
          name: 'MessageNotFound',
          message: 'Message not found',
        } as IAppError;
      }
      message.replyNum = (message.replyNum || 0) + 1;
      await message.save({ session });
      await session.commitTransaction();
      return message.toObject();
    } catch (error) {
      await session.abortTransaction();
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: error.message,
      }
    } finally {
      session.endSession();
    }
  }
}
