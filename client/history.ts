/** PART 1: IMPLEMENTING THE STOPWATCH FE TS
 *  Naive implementation of a stopwatch using setInterval window func
 */

// Global vars used to sync time and calculate time elapsed
let counter: number = 0;          // Counter to keep track of the time elapsed
let timeInterval: number | null;  // Holds the setInterval ID to start/stop updates
let running: boolean = false;     // Flag to check if the stopwatch is running

// HTML elements
const timeDisplay = document.getElementById('time') as HTMLElement;
const startButton = document.getElementById(
  'startStopBtn'
) as HTMLButtonElement;
const resetButton = document.getElementById('resetBtn') as HTMLButtonElement;

// Helper function to format and display time
function updateTimeDisplay() {
  const hours = Math.floor(counter / 3600);
  const minutes = Math.floor((counter % 3600) / 60);
  const seconds = counter % 60;

  // Format time to always show two digits
  const hoursStr = hours.toString().padStart(2, '0');
  const minutesStr = minutes.toString().padStart(2, '0');
  const secondsStr = seconds.toString().padStart(2, '0');

  // Update the time display
  timeDisplay.innerText = `${hoursStr}:${minutesStr}:${secondsStr}`;
}

// Event handler start button
function startStopwatch() {
  // Run an update immediately after button is pressed to avoid
  // any latency and time drifts with button spams
  updateTimeDisplay();

  if (timeInterval == null) {
    // Update the time every 1000ms (1s), stores the call Id to timeInterval
    timeInterval = window.setInterval(() => {
      counter += 1;
      updateTimeDisplay();
    }, 1000);
  }
  running = true;
  startButton.innerText = 'Stop';
}

// Event handler for stop button
function stopStopwatch() {
  if (timeInterval) {
    window.clearInterval(timeInterval);
    timeInterval = null;
    running = false;
    startButton.innerText = 'Start';
  } else {
    console.error(
      'Something went wrong; timeInterval is null, cannot be cleared'
    );
  }
}

// Event handler to reset the stopwatch
function resetStopwatch() {
  if (running) {
    stopStopwatch();
  }

  counter = 0;
  updateTimeDisplay();
}

// Event listeners for stopwatch buttons:
startButton.addEventListener('click', () => {
  if (running) {
    console.log('Stop button pressed');
    stopStopwatch();
  } else {
    console.log('Start button pressed');
    startStopwatch();
  }
});

resetButton.addEventListener('click', () => {
  console.log('Reset button pressed');
  resetStopwatch();
});

/** PART 2: IMPLEMENTING THE ADD NOTE FE TS
 *
 **/

// Event handlers for add note button:
const addNoteForm = document.querySelector('.add-note-form') as HTMLFormElement;

// Creating new raw note HTML element given title and content
function createRawNoteElement(title: string, content: string): HTMLElement {
  const noteElement = document.createElement('div');
  noteElement.className = 'update-card';
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleString('en-US', { month: 'short', day: '2-digit' });
  noteElement.innerHTML = `       
            <span class="update-card-time">${formattedDate}</span>
            <div class="update-card-info">
                <span class="update-card-info-title">${title}</span>
                <p class="update-card-info-description">${content}</p>
            </div>
            `;
  return noteElement;
}

// Event handler for add note button
function onAddNote(event: SubmitEvent) {
  event.preventDefault();
  const title = document.querySelector(
    '.add-note-title-input'
  ) as HTMLInputElement;
  const content = document.querySelector(
    '.add-note-textarea'
  ) as HTMLInputElement;

  if (title && content && title.value && content.value) {
    const notesContainer = document.querySelector(
      '.notes-container'
    ) as HTMLElement;
    if (notesContainer) {
      const noteElement = createRawNoteElement(title.value, content.value);
      notesContainer.appendChild(noteElement);
      notesContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }
  title.value = '';
  content.value = '';
}

// Event listener for add note button
addNoteForm.addEventListener('submit', (event) => {
  onAddNote(event);
});