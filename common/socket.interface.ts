// these are TS types required by socket.io

import { IChatMessage } from './chatMessage.interface';
import { IReply } from './reply.interface';

export interface ServerToClientEvents {
  newChatMessage: (chatMessage: IChatMessage) => void;
  deletedChatMessages: (chatMessages: IChatMessage[]) => void;
  updatedChatMessage: (chatMessage: IChatMessage) => void;
  deletedChatMessage: (chatMessage: IChatMessage) => void;
  newReply: (reply: IReply) => void;
}

export interface ClientToServerEvents {
  ping: () => void;
}
