import { io } from 'socket.io-client';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Imh6ajAxMDQyN0BnbWFpbC5jb20iLCJwYXNzd29yZCI6IiQyYiQxMCRKQUdXVS91MDBuOWkxZUZ5d1JyUEJPRy5FcGpCeW10RTJZS1p3c2RWRVMyd3pUWlplM0RXaSIsImlhdCI6MTczMjM5MjkwOCwiZXhwIjoxNzYzOTI4OTA4fQ.cU_vzFA76OKPYABSqgsn2rNMFik_-tk4yY39K5eIBVU';

const socket = io('http://localhost:8080'); // socket connection without handshake

// const socket = io('http://localhost:8080', { // socket connection with handshake
//   query: {
//     token: token
//   }
// });

console.log('Eavesdropping on chat messages...');

// Eavesdropping on new chat messages
socket.on('newChatMessage', (chatMessage) => {
  console.log('New chat message received:', chatMessage);
});

// Eavesdropping on deleted chat messages
socket.on('deletedChatMessages', (chatMessages) => {
  console.log('Chat messages deleted:', chatMessages);
});
