import DAC from '../db/dac';
import { v4 as uuidV4 } from 'uuid';
import { IReply } from '../../common/reply.interface';
import { IAppError } from '../../common/server.responses';
import { User } from './user.model';

export class Reply implements IReply {
    public timestamp?: string;
    public displayName?: string;
    public _id?: string;

    constructor(
        public author: string,
        public text: string,
        public messageId: string,
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

    async post(): Promise<IReply> {
        try {
            const message = await DAC.db.findChatMessageById(this.messageId);
            if (!message) {
                throw {
                    type: 'ClientError',
                    name: 'OrphanedReply',
                    message: 'Cannot add reply to non-existent message',
                } as IAppError;
            }
            const user = await User.getUserForUsername(this.author);
            this.displayName = user?.extra;
            return await DAC.db.saveReply(this);
        } catch (err) {
            throw {
                type: 'ServerError',
                name: 'PostRequestFailure',
                message: 'Failed to post reply',
            } as IAppError;
        }
    }

    static async getRepliesForMessage(messageId: string): Promise<IReply[]> {
        try {
            return await DAC.db.findRepliesByMessageId(messageId);
        } catch (err) {
            throw {
                type: 'ServerError',
                name: 'GetRequestFailure',
                message: 'Failed to get replies for message',
            } as IAppError;
        }
    }
}