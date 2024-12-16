import { IChatMessage, IReaction } from '../common/chatMessage.interface';
import { ReactionType } from '../common/reactionType';
import { IReply } from '../common/reply.interface';
import { io, Socket } from 'socket.io-client';
import axios, { AxiosResponse } from 'axios';
import { IResponse, isSuccess } from '../common/server.responses';
import { IUser } from '../common/user.interface';
import { ServerToClientEvents, ClientToServerEvents } from '../common/socket.interface';

let replyToMessageId: string | null = null; // used to store the message ID of the message being replied to

const token = localStorage.getItem('token');

const reactionEmojiMap: { [key in ReactionType]: string } = {
  [ReactionType.Like]: '👍',
  [ReactionType.Love]: '❤️',
  [ReactionType.Laugh]: '😂',
  [ReactionType.Surprised]: '😲',
  [ReactionType.Sad]: '😢',
  [ReactionType.Angry]: '😡',
  [ReactionType.Fire]: '🔥',
  [ReactionType.ThumbsUp]: '👍',
  [ReactionType.ThumbsDown]: '👎',
  [ReactionType.Ok]: '👌',
  [ReactionType.Smile]: '😊'
};

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  query: {
    token: token
  }
})

function onLogout(e: Event): void {
  e.preventDefault();
  // logout by deleting locally stored token and current user
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  alert('You have been logged out');
  window.location.href = '/auth';
}

async function postChatMessage(chatMsg: IChatMessage): Promise<void> {
  try {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    if (replyToMessageId) {
      const messageInput = document.getElementById('chatMessage') as HTMLTextAreaElement;
      const messageText = messageInput.value.trim();

      const response: AxiosResponse<IResponse> = await axios.post(`/chat/messages/${replyToMessageId}/replies`, {
        author: username,
        text: messageText
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (isSuccess(response.data)) {
        replyToMessageId = null;
        const replyPreview = document.getElementById('replyPreview');
        if (replyPreview) {
          replyPreview.remove();
        }
      }

      return;
    }

    await axios.post('/chat/messages', chatMsg, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      alert(err.response?.data?.message);
    } else {
      alert('Unknown error');
      console.error('Unknown error:', err);
    }
  }
}

function onPost(e: Event): void {
  e.preventDefault();

  const textInput = document.getElementById('chatMessage') as HTMLInputElement;

  const chatMsg: IChatMessage = {
    author: localStorage.getItem('username') as string,
    text: textInput.value,
  };

  postChatMessage(chatMsg)
    .then(() => {
      textInput.value = '';
    })
    .catch((error) => {
      console.error('Failed to post message:', error);
    });
}

async function onLeave(e: Event): Promise<void> {
  e.preventDefault();

  const confirmation = confirm('Are you sure you want to leave? This operation is irreversible.');
  if (!confirmation) {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');


    await axios.delete(`/chat/users/${username}`, {
      headers: {
        'Content-Type': 'Application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    alert('You have left the chat room');
    window.location.href = '/auth';
  } catch (err) {
    if (axios.isAxiosError(err)) {
      alert(err.response?.data?.message);
    } else {
      alert('Unknown error');
      console.error('Unknown error:', err);
    }
  }
}

function makeChatMessage(author: string, timestamp: string, text: string, displayName?: string, _id?: string, reactions?: IReaction[], replyNum?: number): HTMLDivElement {
  const currentUser = localStorage.getItem('username');
  const isMyMessage = author === currentUser;
  const containerClass = isMyMessage ? 'msgContainer myMsgContainer' : 'msgContainer';
  const dateClass = isMyMessage ? 'date myDate' : 'date';
  const msgHeaderClass = isMyMessage ? 'msgHeader myMsgHeader' : 'msgHeader';
  const msgItemClass = isMyMessage ? 'msgItem myMsgItem' : 'msgItem';
  const msgTextClass = isMyMessage ? 'myMsg' : 'msg';
  const msgFooterClass = isMyMessage ? 'msgFooter myMsgFooter' : 'msgFooter';
  const actionIconsClass = isMyMessage ? 'actionIcons myActionIcons' : 'actionIcons';
  const emojiContainerClass = isMyMessage ? 'emojiContainer myEmojiContainer' : 'emojiContainer';

  const messageElement = document.createElement('div');
  messageElement.classList.add(...containerClass.split(' '));
  messageElement.innerHTML = `
    <div class="${msgHeaderClass}">
      <div class="${dateClass}">${timestamp}</div>
      <div class="${actionIconsClass}">
        <div class="relative group">
          <button class="iconBtn">➕</button>
          <div class="emojiMenu">
            <button class="emojiItem" title="smile" id="smile">😊</button>
            <button class="emojiItem" title="laugh" id="laugh">😂</button>
            <button class="emojiItem" title="angry" id="angry">😡</button>
            <button class="emojiItem" title="sad" id="sad">😢</button>
            <button class="emojiItem" title="fire" id="fire">🔥</button>
            <button class="emojiItem" title="love" id="love">❤️</button>
            <button class="emojiItem" title="thumbs up" id="thumbs up">👍</button>
            <button class="emojiItem" title="thumbs down" id="thumbs down">👎</button>
            <button class="emojiItem" title="ok" id="ok">👌</button>
          </div>
        </div>
        <button class="iconBtn replyBtn" title="reply">💬</button>
        ${isMyMessage ? '<button class="iconBtn deleteBtn" title="retract">❌</button>' : ''}
      </div>
    </div>
    <div class="${msgItemClass}">
      <span class="avatar">${displayName}</span>
      <span class="${msgTextClass}">${text}</span>
    </div>
    <div class="${msgFooterClass}">
      <div class="${emojiContainerClass}">
        <!-- reactions go here -->
      </div>
      ${replyNum && replyNum > 0 ? `
      <div class="replyCounter">
        <span class="replyCount" title="view">${replyNum === 1 ? '1 reply' : `${replyNum} replies`}</span>
      </div>` : ''}
    </div>
  `;

  if (_id) {
    messageElement.setAttribute('data-message-id', _id);
  }

  if (reactions) {
    const emojiContainer = messageElement.querySelector(`.${emojiContainerClass.split(' ').join('.')}`) as HTMLDivElement;
    fillEmojiContainer(emojiContainer, reactions);
  }

  return messageElement;
}

function makeReplyMessage(author: string, timestamp: string, text: string, displayName?: string, _id?: string): HTMLDivElement {
  const currentUser = localStorage.getItem('username');
  const isMyMessage = author === currentUser;
  const containerClass = isMyMessage ? 'msgContainer myMsgContainer' : 'msgContainer';
  const dateClass = isMyMessage ? 'date myDate' : 'date';
  const msgItemClass = isMyMessage ? 'msgItem myMsgItem' : 'msgItem';
  const msgTextClass = isMyMessage ? 'myMsg' : 'msg';

  const messageElement = document.createElement('div');
  messageElement.classList.add(...containerClass.split(' '));
  messageElement.innerHTML = `
    <div class="${dateClass}">${timestamp}</div>
    <div class="${msgItemClass}">
      <span class="avatar">${displayName}</span>
      <span class="${msgTextClass}">${text}</span>
    </div>
  `;

  if (_id) {
    messageElement.setAttribute('data-reply-id', _id);
  }

  return messageElement;
}

function fillEmojiContainer(emojiContainer: HTMLDivElement, reactions: IReaction[]): void {
  const emojiCountMap = new Map<string, { count: number, isUserReaction: boolean }>();
  const currentUser = localStorage.getItem('username');

  reactions.forEach(reaction => {
    const emoji = reaction.type;
    const isUserReaction = reaction.author === currentUser;

    if (emojiCountMap.has(emoji)) {
      const existing = emojiCountMap.get(emoji)!;
      emojiCountMap.set(emoji, { count: existing.count + 1, isUserReaction: existing.isUserReaction || isUserReaction });
    } else {
      emojiCountMap.set(emoji, { count: 1, isUserReaction });
    }
  });

  emojiCountMap.forEach(({ count, isUserReaction }, emoji) => {
    const emojiItem = document.createElement('span');
    emojiItem.classList.add('emojiItem');
    if (isUserReaction) {
      emojiItem.classList.add('myEmojiItem');
    }
    emojiItem.setAttribute('title', emoji);
    emojiItem.id = emoji;
    emojiItem.innerHTML = `${reactionEmojiMap[emoji as ReactionType]} <span class="emojiCount">${count}</span>`;
    emojiContainer.appendChild(emojiItem);
  });
}

function onNewChatMessage(chatMsg: IChatMessage): void {
  // used to update chat message list
  const chatContainer = document.getElementById('existingChatMessages') as HTMLFormElement;
  const messageElement = makeChatMessage(chatMsg.author, chatMsg.timestamp ?? "Unknown Time", chatMsg.text, chatMsg.displayName, chatMsg._id);
  chatContainer.appendChild(messageElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function onDeletedChatMessages(chatMsgs: IChatMessage[]): void {
  const chatContainer = document.getElementById('existingChatMessages') as HTMLFormElement;
  chatMsgs.forEach((msg) => {
    const messageElement = chatContainer.querySelector(`[data-message-id="${msg._id}"]`);
    if (messageElement) {
      chatContainer.removeChild(messageElement);
    }
  });
}

async function getChatMessages(): Promise<void> {
  try {
    const token = localStorage.getItem('token');

    const response: AxiosResponse<IResponse> = await axios.get('/chat/messages', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (isSuccess(response.data)) {
      const messages = response.data.payload as IChatMessage[];

      const chatContainer = document.getElementById('existingChatMessages') as HTMLFormElement;
      chatContainer.innerHTML = '';
      messages.forEach((msg) => {
        const messageElement = makeChatMessage(msg.author, msg.timestamp ?? "Unknown Time", msg.text, msg.displayName, msg._id, msg.reactions, msg.replyNum);
        chatContainer.appendChild(messageElement);
      });
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  } catch (err) {
    if (axios.isAxiosError(err)) {
      alert(err.response?.data?.message);
    } else {
      alert('Unknown error');
      console.error('Unknown error:', err);
    }
  }
}

async function isLoggedIn(): Promise<boolean> {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  if (!token || !username) {
    return false;
  }

  try {
    const response: AxiosResponse<IResponse> = await axios.get(`/chat/users/${username}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return isSuccess(response.data);
  } catch (err) {
    return false;
  }
}

async function onRetract(e: Event): Promise<void> {
  e.preventDefault();
  const target = e.target as HTMLElement;
  const msgId = target.closest('.msgContainer')?.getAttribute('data-message-id');

  if (!msgId) {
    console.error('Message ID not found');
    return;
  }

  const confirmed = confirm('Are you sure you want to retract this message?');
  if (!confirmed) {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response: AxiosResponse<IResponse> = await axios.delete(`/chat/messages/${msgId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (isSuccess(response.data)) {
      alert('Message retracted successfully');
    }
  } catch (err) {
    if (axios.isAxiosError(err)) {
      alert(err.response?.data?.message);
    } else {
      alert('Unknown error occurred while retracting message');
    }
  }
}

async function onViewReply(e: Event): Promise<void> {
  e.preventDefault();
  const target = e.target as HTMLElement;
  const messageElement = target.closest('.msgContainer, .myMsgContainer');
  const messageId = messageElement?.getAttribute('data-message-id');

  const sideWindow = document.getElementById('sideWindow') as HTMLDivElement | null;
  if (sideWindow && !sideWindow.classList.contains('translate-x-full')) {
    return; // do nothing if side window is already open
  }

  try {
    const token = localStorage.getItem('token');
    const response: AxiosResponse<IResponse> = await axios.get(`/chat/messages/${messageId}/replies`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (isSuccess(response.data)) {
      const replies = response.data.payload as IReply[];
      showRepliesInSideWindow(replies);
    }
  } catch (err) {
    if (axios.isAxiosError(err)) {
      alert(err.response?.data?.message);
    } else {
      alert('Unknown error occurred while fetching replies');
    }
  }
}

function showRepliesInSideWindow(replies: IReply[]): void {
  const sideWindow = document.getElementById('sideWindow') as HTMLDivElement;

  if (sideWindow.classList.contains('translate-x-full')) {
    const closeButton = document.getElementById('closeSideWindow') as HTMLButtonElement;
    const contentContainer = document.getElementById('sideContent') as HTMLDivElement;

    contentContainer.innerHTML = '';

    replies.forEach(reply => {
      const replyElement = makeReplyMessage(
        reply.author,
        reply.timestamp ?? 'Unknown Time',
        reply.text,
        reply.displayName,
        reply._id
      );
      contentContainer.appendChild(replyElement);
    });

    sideWindow.appendChild(closeButton);
    sideWindow.appendChild(contentContainer);

    // show side window
    sideWindow.classList.remove('translate-x-full');

    contentContainer.scrollTop = sideWindow.scrollHeight;
  } else {
    // hide side window
    sideWindow.classList.add('translate-x-full');
  }
}

async function onReply(e: Event): Promise<void> {
  e.preventDefault();
  const existingReplyPreview = document.getElementById('replyPreview');
  if (existingReplyPreview) {
    existingReplyPreview.remove();
    replyToMessageId = null;
    return;
  }

  const target = e.target as HTMLElement;
  const messageElement = target.closest('.msgContainer, .myMsgContainer');
  const messageId = messageElement?.getAttribute('data-message-id');
  const messageText = messageElement?.querySelector('.msg, .myMsg')?.textContent;
  const displayName = messageElement?.querySelector('.avatar')?.textContent;

  if (messageId && messageText && displayName) {
    const replyPreview = document.createElement('div');
    replyPreview.id = 'replyPreview';
    replyPreview.classList.add('replyPreview');

    replyPreview.innerHTML = `
      <div class="replyContainer">
        <div class="replyContent">
          ${displayName}: ${messageText}
        </div>
        <button class="cancelButton" id="cancelReply" title="delete">&times;</button>
      </div>
    `;

    const inputWrapper = document.querySelector('.inputWrapper');
    if (inputWrapper) {
      inputWrapper.appendChild(replyPreview);
    }

    replyToMessageId = messageId;

    const cancelButton = replyPreview.querySelector('#cancelReply') as HTMLButtonElement;
    cancelButton.addEventListener('click', function () {
      replyPreview.remove();
    });
  }
}

async function onEmojiClick(e: Event): Promise<void> {
  e.preventDefault();
  const target = e.target as HTMLElement;
  const msgId = target.closest('.msgContainer')?.getAttribute('data-message-id');
  const emoji = target.id;

  try {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const reaction: IReaction = {
      author: username as string,
      type: emoji as ReactionType
    };

    const response: AxiosResponse<IResponse> = await axios.patch(`/chat/messages/${msgId}/reactions`, reaction, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      alert(err.response?.data?.message);
    } else {
      alert('Unknown error occurred while updating reaction');
    }
  }
}

function onDeletedChatMessage(chatMsg: IChatMessage): void {
  const messageElement = document.querySelector(`.msgContainer[data-message-id="${chatMsg._id}"]`);
  if (messageElement) {
    messageElement.remove();
  }
}

function onUpdatedChatMessage(chatMsg: IChatMessage): void {
  const messageElement = document.querySelector(`.msgContainer[data-message-id="${chatMsg._id}"]`) as HTMLDivElement;
  if (messageElement) {
    const emojiContainer = messageElement.querySelector('.emojiContainer') as HTMLDivElement;
    if (emojiContainer) {
      emojiContainer.innerHTML = '';
      fillEmojiContainer(emojiContainer, chatMsg.reactions || []);
    }
  }

  let replyCounter = messageElement.querySelector('.replyCounter') as HTMLDivElement;
  const replyCount = chatMsg.replyNum || 0;
  const replyCounterHTML = `
      ${replyCount > 0 ? `
      <div class="replyCounter">
        <span class="replyCount" title="View replies">${replyCount === 1 ? '1 reply' : `${replyCount} replies`}</span>
      </div>` : ''}
    `;

  if (replyCounter) {
    replyCounter.innerHTML = replyCounterHTML;
  } else if (replyCount > 0) {
    replyCounter = document.createElement('div');
    replyCounter.classList.add('replyCounter');
    replyCounter.innerHTML = replyCounterHTML;

    const msgFooter = messageElement.querySelector('.msgFooter, .myMsgFooter') as HTMLDivElement;
    msgFooter.appendChild(replyCounter);
  }
}

function onNewReply(reply: IReply): void {
  const sideWindow = document.getElementById('sideWindow') as HTMLDivElement;
  if (sideWindow && !sideWindow.classList.contains('translate-x-full')) {
    const contentContainer = sideWindow.querySelector('.flex-1') as HTMLDivElement;
    if (contentContainer) {
      const replyElement = makeReplyMessage(reply.author, reply.timestamp ?? 'Unknown Time', reply.text, reply.displayName, reply._id);
      contentContainer.appendChild(replyElement);
      contentContainer.scrollTop = sideWindow.scrollHeight;
    }
  }
}

function chatContainerHandler(e: Event): void {
  const target = e.target as HTMLElement;

  if (target.classList.contains('deleteBtn')) {
    onRetract(e);
  } else if (target.classList.contains('replyBtn')) {
    onReply(e);
  } else if (target.classList.contains('replyCount')) {
    onViewReply(e);
  } else if (target.classList.contains('emojiItem')) {
    onEmojiClick(e);
  }
}

document.addEventListener('DOMContentLoaded', async function (e: Event) {
  // Document-ready event handler
  console.log('Chat page loaded successfully');
  e.preventDefault();

  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    window.location.href = '/auth';
    return;
  }

  await getChatMessages();

  const logoutBtn = document.getElementById('logoutBtn') as HTMLAnchorElement;
  logoutBtn.addEventListener('click', onLogout);

  const postBtn = document.getElementById('postBtn') as HTMLButtonElement;
  postBtn.addEventListener('click', onPost);

  const leaveBtn = document.getElementById('leaveBtn') as HTMLAnchorElement;
  leaveBtn.addEventListener('click', onLeave);

  const chatContainers = document.getElementById('existingChatMessages') as HTMLDivElement;
  chatContainers.addEventListener('click', chatContainerHandler);

  const closeSideButton = document.getElementById('closeSideWindow') as HTMLButtonElement;
  closeSideButton.addEventListener('click', () => {
    const sideWindow = document.getElementById('sideWindow') as HTMLDivElement;
    sideWindow.classList.add('translate-x-full');
  });

  socket.on('newChatMessage', onNewChatMessage);
  socket.on('deletedChatMessages', onDeletedChatMessages);
  socket.on('deletedChatMessage', onDeletedChatMessage);
  socket.on('updatedChatMessage', onUpdatedChatMessage);
  socket.on('newReply', onNewReply);
});
