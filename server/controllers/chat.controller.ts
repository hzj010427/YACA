// Controller serving the chat room page and handling the loading, posting, and update of chat messages
// Note that controllers don't access the DB direcly, only through the models

import Controller from './controller';
import { ILogin, IUser } from '../../common/user.interface';
import { User } from '../models/user.model';
import { ChatMessage } from '../models/chatMessage.model';
import { Reply } from '../models/reply.model';
import { IChatMessage, IReaction } from '../../common/chatMessage.interface';
import { IReply } from '../../common/reply.interface';
import { NextFunction, Request, Response } from 'express';
import * as responses from '../../common/server.responses';
import jwt from 'jsonwebtoken';
import { JWT_KEY as secretKey, JWT_EXP as tokenExpiry } from '../env';

export default class ChatController extends Controller {
  public constructor(path: string) {
    super(path);
  }

  public initializeRoutes(): void {
    this.router.get('/', this.chatRoomPage);
    this.router.get('/messages', this.authorize, this.getAllMessages);
    this.router.post('/messages', this.validateRequest, this.authorize, this.postMessage);
    this.router.delete('/users/:username?', this.authorize, this.deleteUser);
    this.router.get('/usernames', this.authorize, this.getAllUsers);
    this.router.get('/users/:username?', this.authorize, async (req, res, next) => {
      const { username } = req.params;
      if (!username) {
        return this.getAllUsers(req, res, next);
      }
      return this.getUser(req, res, next);
    });

    this.router.get('/pug', this.authorize, this.renderChatPug);

    this.router.patch('/messages/:messageId/reactions', this.authorize, this.updateReaction);
    this.router.delete('/messages/:messageId', this.authorize, this.deleteMessage);
    this.router.post('/messages/:messageId/replies', this.authorize, this.postReply);
    this.router.get('/messages/:messageId/replies', this.authorize, this.getReplies);
  }

  public chatRoomPage(req: Request, res: Response) {
    res.redirect('/pages/chat.html');
  }

  public async validateRequest(req: Request, res: Response, next: NextFunction) {

    const { author, text } = req.body;

    // check if the author is missing
    if (!author || author.trim() === '') {
      const errorRes: responses.IAppError = {
        type: 'ClientError',
        name: 'MissingAuthor',
        message: 'The author of the chat message is missing',
      };
      return res.status(400).json(errorRes);
    }

    // check if the message is empty
    if (!text || text.trim() === '') {
      const errorRes: responses.IAppError = {
        type: 'ClientError',
        name: 'MissingChatText',
        message: 'The chat message is empty',
      };
      return res.status(400).json(errorRes);
    }

    // check if the message is orphaned
    const user = await User.getUserForUsername(author);
    if (!user) {
      const errorRes: responses.IAppError = {
        type: 'ClientError',
        name: 'OrphanedChatMessage',
        message: 'An orphaned message is not permitted',
      };
      return res.status(401).json(errorRes);
    }

    next();
  }

  public async authorize(req: Request, res: Response, next: NextFunction) {
    try {
      // check if the token is present
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        const errorRes: responses.IAppError = {
          type: 'ClientError',
          name: 'MissingToken',
          message: 'A token is missing and is required for authorization',
        };
        return res.status(401).json(errorRes);
      }

      // check if the token is valid
      const decoded = jwt.verify(token, secretKey) as { username: string };

      // check if the posting user is the same as the author
      const { author } = req.body;
      if (req.method === 'POST' && decoded.username !== author) {
        const errorRes: responses.IAppError = {
          type: 'ClientError',
          name: 'UnauthorizedRequest',
          message: 'Posting a chat message on behalf of another User is not permitted',
        };
        return res.status(401).json(errorRes);
      }
    } catch (err) {
      const errorRes: responses.IAppError = {
        type: 'ClientError',
        name: 'InvalidToken',
        message: 'The token is invalid',
      };
      return res.status(401).json(errorRes);
    }

    next();
  }

  public async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users: string[] = await User.getAllUsernames();

      const successRes: responses.ISuccess = {
        name: users.length === 0 ? 'NoUsersYet' : 'UsersFound',
        message: 'All users retrieved successfully',
        payload: users,
      };

      res.status(200).json(successRes);
    } catch (err) {
      next(err);
    }
  }

  public async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { username } = req.params;

      const user: IUser | null = await User.getUserForUsername(username);

      if (!user) {
        const errorRes: responses.IAppError = {
          type: 'ClientError',
          name: 'UserNotFound',
          message: `User ${username} not found`,
        };
        throw errorRes;
      }

      const successRes: responses.ISuccess = {
        name: 'UserFound',
        message: 'User found successfully',
        payload: user,
      };

      res.status(200).json(successRes);
    } catch (err) {
      next(err);
    }
  }

  public async postMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { author, text } = req.body;
      const message: ChatMessage = new ChatMessage(author, text);

      const newMessage: IChatMessage = await message.post();

      Controller.io.emit('newChatMessage', newMessage);

      const successRes: responses.ISuccess = {
        name: 'ChatMessageCreated',
        message: 'Chat message posted successfully',
        payload: newMessage,
      };

      res.status(201).json(successRes);
    } catch (err) {
      next(err);
    }
  }

  public async getAllMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const msgs = await ChatMessage.getAllChatMessages();
      if (msgs.length === 0) {
        const noMessagesRes: responses.ISuccess = {
          name: 'NoChatMessagesYet',
          message: 'There are no chat messages yet.',
          payload: [],
        };
        return res.status(200).json(noMessagesRes);
      }

      const successRes: responses.ISuccess = {
        name: 'ChatMessagesFound',
        message: 'All chat messages retrieved successfully',
        payload: msgs,
      };

      res.status(200).json(successRes);
    } catch (err) {
      next(err);
    }
  }

  public async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { username } = req.params;

      const deletedChatMsgs: IChatMessage[] = await ChatMessage.deleteChatMessagesByAuthor(username);

      const deletedUser: IUser | null = await User.deleteUser(username);

      if (!deletedUser) {
        const errorRes: responses.IAppError = {
          type: 'ClientError',
          name: 'UserNotFound',
          message: 'Cannot delete a user that does not exist',
        };
        throw errorRes;
      }

      Controller.io.emit('deletedChatMessages', deletedChatMsgs);

      const successRes: responses.ISuccess = {
        name: 'UserDeleted',
        message: 'User deleted successfully',
        payload: deletedUser,
      };

      res.status(200).json(successRes);
    } catch (err) {
      next(err);
    }
  }

  public async renderChatPug(req: Request, res: Response, next: NextFunction) {
    try {
      // just wanna get the username from the token
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        const errorRes: responses.IAppError = {
          type: 'ClientError',
          name: 'MissingToken',
          message: 'A token is missing and is required for authorization',
        };
        return res.status(401).json(errorRes);
      }

      const decoded = jwt.verify(token, secretKey) as { username: string };

      const author = decoded.username;

      const messages: IChatMessage[] = await ChatMessage.getAllChatMessages();
      
      res.render('chat', { messages, author });
    } catch (err) {
      next(err);
    }
  }

  public async updateReaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { messageId } = req.params;
      const { author, type } = req.body;
      const reaction: IReaction = { author, type };

      const message: IChatMessage = await ChatMessage.updateReaction(messageId, reaction);

      Controller.io.emit('updatedChatMessage', message);

      const successRes: responses.ISuccess = {
        name: 'ReactionUpdated',
        message: 'Reaction updated successfully',
        payload: message,
      };

      res.status(200).json(successRes);
    } catch (err) {
      next(err);
    }
  }

  public async deleteMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { messageId } = req.params;

      const deletedMessage: IChatMessage | null = await ChatMessage.deleteChatMessagesById(messageId);

      if (!deletedMessage) {
        const errorRes: responses.IAppError = {
          type: 'ClientError',
          name: 'MessageNotFound',
          message: 'Cannot delete a message that does not exist',
        };
        throw errorRes;
      }

      Controller.io.emit('deletedChatMessage', deletedMessage);

      const successRes: responses.ISuccess = {
        name: 'MessageDeleted',
        message: 'Message deleted successfully',
        payload: deletedMessage,
      };

      res.status(200).json(successRes);
    } catch (err) {
      next(err);
    }
  }

  public async postReply(req: Request, res: Response, next: NextFunction) {
    try {
      const { messageId } = req.params;
      const { author, text } = req.body;
      const reply: Reply = new Reply(author, text, messageId);

      const newReply: IReply = await reply.post();

      const updatedMessage: IChatMessage = await ChatMessage.addChatMessageReplyCount(messageId);

      Controller.io.emit('newReply', newReply);

      Controller.io.emit('updatedChatMessage', updatedMessage);

      const successRes: responses.ISuccess = {
        name: 'ReplyCreated',
        message: 'Reply posted successfully',
        payload: newReply,
      };

      res.status(201).json(successRes);
    } catch (err) {
      next(err);
    }
  }

  public async getReplies(req: Request, res: Response, next: NextFunction) {
    try {
      const { messageId } = req.params;

      const replies: IReply[] = await Reply.getRepliesForMessage(messageId);

      if (replies.length === 0) {
        const noRepliesRes: responses.ISuccess = {
          name: 'NoRepliesYet',
          message: 'There are no replies to this message yet.',
          payload: [],
        };
        return res.status(200).json(noRepliesRes);
      }

      const successRes: responses.ISuccess = {
        name: 'RepliesFound',
        message: 'All replies retrieved successfully',
        payload: replies,
      };

      res.status(200).json(successRes);
    } catch (err) {
      next(err);
    }
  }
}
