import { v4 as uuidV4 } from 'uuid';

import { IFriend } from '../common/friend.interface';

let friends: IFriend[] = [];

function loadFriends(): IFriend[] {
  // TODO: read friends from local storage

  const friendsStr = localStorage.getItem('friends');

  if (friendsStr) {
    try {
      return JSON.parse(friendsStr);
    } catch (error) {
      console.error('Error parsing friends from local storage', error);
    }
  }

  return [];
}

function saveFriends(): void {
  // TODO: save friends to local storage

  try {
    localStorage.setItem('friends', JSON.stringify(friends));
  } catch (error) {
    console.error('Error saving friends to local storage', error);
  }
}

function createRawFriendElement(friend: IFriend): HTMLElement {
  const friendElement = document.createElement('div');
  friendElement.innerHTML = `
    <div class="friendInfo">
      <div class="friendInfoHeader">
        <input 
          type="checkbox" 
          class="selectFriend" 
          name="selectFriend" 
          ${friend.invited ? 'checked' : ''}
        />
        <span class="friendName">${friend.displayName}</span>
        <button class="cancelButton" title="Delete">&times;</button>
      </div>
      <span class="friendEmail">${friend.email}</span>
    </div>
  `;

  return friendElement.firstElementChild as HTMLElement;
}

function handleFriendElement(): void {
  const container = document.getElementById('friendList');

  container?.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement;
    if (target?.type === 'checkbox') {
      const checkBoxes = Array.from(
        container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
      );
      handleCheckBox(checkBoxes, target);
    }
  });

  container?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains('cancelButton')) {
      handleCancelButton(target as HTMLButtonElement, container);
    }
  });
}

function handleFormElement(): void {
  const newFriendForm = document.getElementById('newFriendForm');
  const clearBtn = document.getElementById('clearAllBtn');

  newFriendForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    onAddFriend();
  });

  clearBtn?.addEventListener('click', () => {
    onClearAllFriends();
  });
}

function handleCheckBox(
  checkBoxes: HTMLInputElement[],
  target: HTMLInputElement
): void {
  const index = checkBoxes.indexOf(target);

  const friend = friends[index];

  if (target.checked) {
    onInviteFriend(friend);
    friend.invited = true;
  } else {
    alert(
      'You may have already invited this friend! After unchecking this checkbox, you can re-invite this friend by rechecking it.'
    );
    target.checked = false;
    friend.invited = false;
  }

  saveFriends();
}

function handleCancelButton(
  target: HTMLButtonElement,
  container: HTMLElement
): void {
  const isConfirmed = window.confirm(
    'Are you sure you want to delete this Friend?'
  );

  if (isConfirmed) {
    const friendRow = target
      .closest('.friendInfoHeader')
      ?.closest('.friendInfo');

    if (friendRow) {
      const friendIndex = Array.from(container.children).indexOf(friendRow);
      friends.splice(friendIndex, 1);
      friendRow.remove();
      saveFriends();
    }
  }
}

function addBehaviorToFriendElement(friendEmnt: HTMLElement): HTMLElement {
  // TODO: add required listeners to the  HTML friend element

  return new HTMLElement();
}

function appendFriendElementToDocument(friendEmnt: HTMLElement): void {
  // TODO: add HTML friend element with listeners to the right HTML elememnt in the document
}

function loadFriendsIntoDocument(): void {
  // TODO: read friends from local storage and add them to the document
}

function onAddFriend(): void {
  // TODO: event handler to create a new friend from form info and append it to right HTML element in the document

  const friendList = document.getElementById('friendList') as HTMLFormElement;
  const nameInput = document.getElementById(
    'newFriendName'
  ) as HTMLInputElement;
  const emailInput = document.getElementById(
    'newFriendEmail'
  ) as HTMLInputElement;
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();

  if (!name || !email) {
    alert('Please enter a name and email');
    return;
  }

  if (isDuplicateEmail(email)) {
    alert('Email already exists');
    emailInput.value = '';
    return;
  }

  const newFriend: IFriend = {
    id: uuidV4(),
    displayName: name,
    email: email,
    invited: false
  };

  friends.push(newFriend);
  saveFriends();

  const friendElem = createRawFriendElement(newFriend);
  friendList.appendChild(friendElem);

  nameInput.value = '';
  emailInput.value = '';

  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: 'smooth'
  });
}

function onClearAllFriends(): void {
  if (friends.length) {
    const isConfirmed = window.confirm(
      'Are you sure you want to clear your Friend List?'
    );

    if (isConfirmed) {
      friends = [];
      saveFriends();
      displayFriendList();
    }
  } else {
    alert('You have no friends to clear!');
  }
}

function onInviteFriend(friend: IFriend): void {
  // TODO: event handler to invite a friend by email when a checkbox is checked

  const subject = 'I am inviting you to YACA';
  const body =
    'Please visit http://yaca-myandrewid.onrender.com to register and invite your own Friends.';
  const mailtoLink = `mailto:${friend.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const newWindow: Window | null = window.open(
    mailtoLink,
    '_blank',
    'toolbar=no,scrollbars=no,width=300px,height=400px'
  );
  if (newWindow) {
    newWindow.focus();
  }
}

function displayFriendList(): void {
  friends = loadFriends();

  const friendListContainer = document.getElementById('friendList');
  if (!friendListContainer) return;

  friendListContainer.innerHTML = '';

  friends.forEach((friend) => {
    const friendElem = createRawFriendElement(friend);
    friendListContainer.appendChild(friendElem);
  });

  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: 'smooth'
  });
}

function isDuplicateEmail(email: string): boolean {
  if (!friends) return false;

  return friends.some((friend) => friend.email === email);
}

document.addEventListener('DOMContentLoaded', () => {
  displayFriendList();
  handleFriendElement();
  handleFormElement();
});
