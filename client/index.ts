// Possibly nothing to do here
// But who knows!
import axios, { AxiosResponse } from 'axios';

async function onTest(e: Event): Promise<void> {
    e.preventDefault();

    try {
        const token = localStorage.getItem('token');

        if (!token) {
            window.location.href = '/auth';
            return;
        }

        const response: AxiosResponse<string> = await axios.get('/chat/pug', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.status === 200) {
            const chatPage = response.data;
            document.open();
            document.write(chatPage);
            document.close();
        } else {
            alert('Failed to load chat page. Please try again.');
        }
    } catch (err) {
        console.error('Error loading chat page:', err);
        alert('An error occurred while loading the chat page.');
    }
}

document.addEventListener('DOMContentLoaded', async function (e: Event) {
    // Document-ready event handler
    console.log('Landing page loaded successfully');
    e.preventDefault();

    const testPugBtn = document.getElementById('chat-pug') as HTMLAnchorElement;
    testPugBtn.addEventListener('click', onTest);
});