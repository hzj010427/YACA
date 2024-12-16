export interface IReply {
    messageId: string; // id of the chat message that this reply is associated with
    author: string;
    text: string;
    timestamp?: string;
    displayName?: string;
    _id?: string;  // unique id of the reply
}