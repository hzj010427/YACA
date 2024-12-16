import { IChatMessage } from '../common/chatMessage.interface';
import { io, Socket } from 'socket.io-client';
import axios, { AxiosResponse } from 'axios';
import { IResponse, isSuccess } from '../common/server.responses';
import { ServerToClientEvents, ClientToServerEvents } from '../common/socket.interface';

const token = localStorage.getItem('token');

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
    query: {
        token: token
    }
})

function onLogout(e: Event): void {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    alert('You have been logged out');
    window.location.href = '/auth';
}

async function postChatMessage(chatMsg: IChatMessage): Promise<void> {
    try {
        const token = localStorage.getItem('token');

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

function makeChatMessage(author: string, timestamp: string, text: string, displayName?: string, _id?: string): HTMLDivElement {
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
        messageElement.setAttribute('data-message-id', _id);
    }

    return messageElement;
}

function onNewChatMessage(chatMsg: IChatMessage): void {
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


document.addEventListener('DOMContentLoaded', async function (e: Event) {
    // Document-ready event handler
    console.log('Pug chat page loaded successfully');
    e.preventDefault();

    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
        window.location.href = '/auth';
        return;
    }

    const logoutBtn = document.getElementById('logoutBtn') as HTMLAnchorElement;
    logoutBtn.addEventListener('click', onLogout);

    const postBtn = document.getElementById('postBtn') as HTMLButtonElement;
    postBtn.addEventListener('click', onPost);

    const leaveBtn = document.getElementById('leaveBtn') as HTMLAnchorElement;
    leaveBtn.addEventListener('click', onLeave);

    socket.on('newChatMessage', onNewChatMessage);
    socket.on('deletedChatMessages', onDeletedChatMessages);
});
