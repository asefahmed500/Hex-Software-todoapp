document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const noteInput = document.getElementById('note-input');
    const addNoteBtn = document.getElementById('add-note');
    const notesList = document.getElementById('notes-list');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const viewToggleBtn = document.getElementById('view-toggle');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const voiceNoteBtn = document.getElementById('voice-note');
    const pomodoroTimer = document.getElementById('pomodoro-timer');
    const pomodoroStartBtn = document.getElementById('pomodoro-start');
    const pomodoroResetBtn = document.getElementById('pomodoro-reset');
    const pomodoroCloseBtn = document.getElementById('pomodoro-close');
    const pomodoroContainer = document.querySelector('.pomodoro-container');
    const currentPomodoroTask = document.getElementById('current-pomodoro-task');
    const kanbanContainer = document.querySelector('.kanban-container');
    const listContainer = document.querySelector('.list-container');
    const chartContainer = document.querySelector('.chart-container');
    const totalNotesEl = document.getElementById('total-notes');
    const completedNotesEl = document.getElementById('completed-notes');
    const importantNotesEl = document.getElementById('important-notes');
    const todoItems = document.getElementById('todo-items');
    const inProgressItems = document.getElementById('in-progress-items');
    const doneItems = document.getElementById('done-items');
    const confettiContainer = document.querySelector('.confetti-container');
    const noteModal = document.getElementById('note-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const statsToggleBtn = document.getElementById('stats-toggle');

    // App State
    let notes = JSON.parse(localStorage.getItem('notes')) || [];
    let currentFilter = 'all';
    let currentView = 'list';
    let currentTheme = localStorage.getItem('theme') || 'light';
    let pomodoroInterval;
    let pomodoroTime = 25 * 60; // 25 minutes in seconds
    let isPomodoroRunning = false;
    let currentTaskForPomodoro = null;
    let productivityData = JSON.parse(localStorage.getItem('productivityData')) || {
        completedPerDay: Array(7).fill(0),
        createdPerDay: Array(7).fill(0)
    };

    // Initialize the app
    init();

    function init() {
        // Set theme
        setTheme(currentTheme);
        
        // Load notes
        renderNotes();
        updateStats();
        renderProductivityChart();
        
        // Initialize event listeners
        setupEventListeners();
        
        // Initialize drag and drop for list view
        initSortableList();
        
        // Initialize drag and drop for kanban view
        initKanbanSortable();
    }

    function setupEventListeners() {
        // Add note
        addNoteBtn.addEventListener('click', addNote);
        noteInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addNote();
        });

        // Filter buttons
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.dataset.filter;
                renderNotes();
            });
        });

        // View toggle
        viewToggleBtn.addEventListener('click', toggleView);

        // Theme toggle
        themeToggleBtn.addEventListener('click', toggleTheme);
        
        // Stats toggle
        if (statsToggleBtn) {
            statsToggleBtn.addEventListener('click', toggleStats);
        }

        // Voice input
        voiceNoteBtn.addEventListener('click', startVoiceInput);

        // Pomodoro controls
        pomodoroStartBtn.addEventListener('click', togglePomodoro);
        pomodoroResetBtn.addEventListener('click', resetPomodoro);
        pomodoroCloseBtn.addEventListener('click', closePomodoro);
        
        // Modal close functionality
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', function() {
                if (noteModal) {
                    noteModal.classList.add('hidden');
                }
            });
        }
        
        // Close modal if clicking outside of it
        window.addEventListener('click', function(event) {
            if (noteModal && event.target == noteModal) {
                noteModal.classList.add('hidden');
            }
        });
    }

    // Note CRUD Operations
    function addNote() {
        const text = noteInput.value.trim();
        if (!text) return;

        // Parse text for dates and priorities using NLP (simplified)
        const parsedNote = parseNoteText(text);

        const newNote = {
            id: Date.now(),
            text: parsedNote.text,
            completed: false,
            important: parsedNote.important,
            dueDate: parsedNote.dueDate,
            priority: parsedNote.priority,
            status: 'todo',
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        notes.unshift(newNote);
        saveNotes();
        renderNotes();
        updateStats();
        noteInput.value = '';
        
        // Update productivity data
        const day = new Date().getDay(); // 0 (Sunday) to 6 (Saturday)
        productivityData.createdPerDay[day]++;
        saveProductivityData();
        renderProductivityChart();
    }

    function parseNoteText(text) {
        const result = {
            text: text,
            important: false,
            dueDate: null,
            priority: 'normal'
        };

        // Check for importance
        if (text.toLowerCase().includes('#important') || text.includes('!')) {
            result.important = true;
            result.text = result.text.replace(/#important/gi, '').replace('!', '').trim();
            result.priority = 'high';
        }

        // Check for priority tags
        const priorityRegex = /#(low|normal|high|critical)/i;
        const priorityMatch = text.match(priorityRegex);
        if (priorityMatch) {
            result.priority = priorityMatch[1].toLowerCase();
            result.text = result.text.replace(priorityRegex, '').trim();
        }

        // Simple date parsing (for demo purposes)
        const dateKeywords = ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 
                            'thursday', 'friday', 'saturday', 'sunday', 'next week'];
        
        const timeKeywords = ['at', 'by', 'on'];
        
        for (const keyword of dateKeywords) {
            if (text.toLowerCase().includes(keyword)) {
                // Very simplified date parsing for demo
                const now = new Date();
                
                if (keyword === 'today') {
                    result.dueDate = now.toISOString();
                } else if (keyword === 'tomorrow') {
                    const tomorrow = new Date(now);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    result.dueDate = tomorrow.toISOString();
                } else if (keyword === 'next week') {
                    const nextWeek = new Date(now);
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    result.dueDate = nextWeek.toISOString();
                } else {
                    // Day of week
                    const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 
                                    'thursday', 'friday', 'saturday'].indexOf(keyword.toLowerCase());
                    if (dayIndex !== -1) {
                        const targetDate = new Date(now);
                        const currentDay = now.getDay();
                        let daysToAdd = (dayIndex - currentDay + 7) % 7;
                        daysToAdd = daysToAdd === 0 ? 7 : daysToAdd; // Next week if same day
                        targetDate.setDate(targetDate.getDate() + daysToAdd);
                        result.dueDate = targetDate.toISOString();
                    }
                }
                
                // Try to parse time
                const timeMatch = text.match(/(\d{1,2})(:\d{2})?\s?(am|pm)?/i);
                if (timeMatch && result.dueDate) {
                    let hours = parseInt(timeMatch[1]);
                    const minutes = timeMatch[2] ? parseInt(timeMatch[2].substring(1)) : 0;
                    const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
                    
                    if (period === 'pm' && hours < 12) hours += 12;
                    if (period === 'am' && hours === 12) hours = 0;
                    
                    const dueDate = new Date(result.dueDate);
                    dueDate.setHours(hours, minutes, 0, 0);
                    result.dueDate = dueDate.toISOString();
                }
                
                break;
            }
        }

        return result;
    }

    function deleteNote(id) {
        notes = notes.filter(note => note.id !== id);
        saveNotes();
        renderNotes();
        updateStats();
    }

    function toggleNoteCompletion(id) {
        const note = notes.find(n => n.id === id);
        if (note) {
            note.completed = !note.completed;
            note.completedAt = note.completed ? new Date().toISOString() : null;
            
            // Update productivity data if completing a task
            if (note.completed) {
                const day = new Date().getDay();
                productivityData.completedPerDay[day]++;
                saveProductivityData();
                renderProductivityChart();
                
                // Check if this was an important task for confetti
                if (note.important) {
                    triggerConfetti();
                }
            } else {
                // If un-completing, remove from stats
                if (note.completedAt) {
                    const day = new Date(note.completedAt).getDay();
                    productivityData.completedPerDay[day]--;
                    saveProductivityData();
                    renderProductivityChart();
                }
            }
            
            saveNotes();
            renderNotes();
            updateStats();
        }
    }

    function editNote(id, newText) {
        const note = notes.find(n => n.id === id);
        if (note) {
            note.text = newText;
            
            // Re-parse the text for any new dates/priorities
            const parsedNote = parseNoteText(newText);
            note.important = parsedNote.important;
            note.dueDate = parsedNote.dueDate;
            note.priority = parsedNote.priority;
            
            saveNotes();
            renderNotes();
            updateStats();
        }
    }

    function changeNoteStatus(id, newStatus) {
        const note = notes.find(n => n.id === id);
        if (note) {
            note.status = newStatus;
            saveNotes();
            renderKanbanView();
        }
    }

    function saveNotes() {
        localStorage.setItem('notes', JSON.stringify(notes));
    }

    function saveProductivityData() {
        localStorage.setItem('productivityData', JSON.stringify(productivityData));
    }

    // Rendering Functions
    function renderNotes() {
        if (currentView === 'list') {
            renderListView();
        } else {
            renderKanbanView();
        }
    }

    function renderListView() {
        notesList.innerHTML = '';
        
        // Filter notes based on current filter
        let filteredNotes = [...notes];
        if (currentFilter === 'active') {
            filteredNotes = filteredNotes.filter(note => !note.completed);
        } else if (currentFilter === 'completed') {
            filteredNotes = filteredNotes.filter(note => note.completed);
        } else if (currentFilter === 'important') {
            filteredNotes = filteredNotes.filter(note => note.important);
        }
        
        // Progressive task revelation - only show 5 at a time
        const visibleNotes = filteredNotes.slice(0, 5);
        const remainingNotes = filteredNotes.slice(5);
        
        if (visibleNotes.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No notes found. Add a new note to get started!';
            notesList.appendChild(emptyMessage);
            return;
        }
        
        visibleNotes.forEach(note => {
            const noteElement = createNoteElement(note);
            notesList.appendChild(noteElement);
        });
        
        if (remainingNotes.length > 0) {
            const showMoreBtn = document.createElement('button');
            showMoreBtn.className = 'btn show-more-btn';
            showMoreBtn.textContent = `Show ${remainingNotes.length} more tasks...`;
            showMoreBtn.addEventListener('click', () => {
                remainingNotes.forEach(note => {
                    const noteElement = createNoteElement(note);
                    notesList.appendChild(noteElement);
                });
                showMoreBtn.remove();
            });
            notesList.appendChild(showMoreBtn);
        }
    }

    function createNoteElement(note) {
        const noteElement = document.createElement('div');
        noteElement.className = `note-item ${note.completed ? 'completed' : ''} ${note.important ? 'important' : ''}`;
        noteElement.dataset.id = note.id;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'note-checkbox';
        checkbox.checked = note.completed;
        checkbox.addEventListener('change', () => toggleNoteCompletion(note.id));
        
        const textSpan = document.createElement('span');
        textSpan.className = `note-text ${note.completed ? 'completed' : ''}`;
        textSpan.textContent = note.text;
        textSpan.addEventListener('click', () => {
            const newText = prompt('Edit your note:', note.text);
            if (newText !== null && newText.trim() !== note.text) {
                editNote(note.id, newText.trim());
            }
        });
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'note-actions';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'note-action-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNote(note.id);
        });
        
        const pomodoroBtn = document.createElement('button');
        pomodoroBtn.className = 'note-action-btn';
        pomodoroBtn.innerHTML = '<i class="fas fa-clock"></i>';
        pomodoroBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startPomodoroForTask(note.id, note.text);
        });
        
        actionsDiv.appendChild(pomodoroBtn);
        actionsDiv.appendChild(deleteBtn);
        
        noteElement.appendChild(checkbox);
        noteElement.appendChild(textSpan);
        noteElement.appendChild(actionsDiv);
        
        // Add due date if exists
        if (note.dueDate) {
            const dueDate = new Date(note.dueDate);
            const dueDateSpan = document.createElement('span');
            dueDateSpan.className = 'note-due-date';
            
            const icon = document.createElement('i');
            icon.className = 'far fa-calendar-alt';
            
            dueDateSpan.appendChild(icon);
            dueDateSpan.appendChild(document.createTextNode(formatDate(dueDate)));
            
            noteElement.appendChild(dueDateSpan);
        }
        
        // Add priority if not normal
        if (note.priority && note.priority !== 'normal') {
            const prioritySpan = document.createElement('span');
            prioritySpan.className = 'note-priority';
            prioritySpan.textContent = note.priority;
            noteElement.appendChild(prioritySpan);
        }
        
        return noteElement;
    }

    function renderKanbanView() {
        todoItems.innerHTML = '';
        inProgressItems.innerHTML = '';
        doneItems.innerHTML = '';
        
        // Filter notes based on current filter
        let filteredNotes = [...notes];
        if (currentFilter === 'active') {
            filteredNotes = filteredNotes.filter(note => !note.completed);
        } else if (currentFilter === 'completed') {
            filteredNotes = filteredNotes.filter(note => note.completed);
        } else if (currentFilter === 'important') {
            filteredNotes = filteredNotes.filter(note => note.important);
        }
        
        filteredNotes.forEach(note => {
            const noteElement = createKanbanNoteElement(note);
            
            switch (note.status) {
                case 'todo':
                    todoItems.appendChild(noteElement);
                    break;
                case 'in-progress':
                    inProgressItems.appendChild(noteElement);
                    break;
                case 'done':
                    doneItems.appendChild(noteElement);
                    break;
            }
        });
    }

    function createKanbanNoteElement(note) {
        const noteElement = document.createElement('div');
        noteElement.className = `kanban-note ${note.completed ? 'completed' : ''} ${note.important ? 'important' : ''}`;
        noteElement.dataset.id = note.id;
        
        const textSpan = document.createElement('div');
        textSpan.className = `kanban-note-text ${note.completed ? 'completed' : ''}`;
        textSpan.textContent = note.text;
        textSpan.addEventListener('click', () => {
            const newText = prompt('Edit your note:', note.text);
            if (newText !== null && newText.trim() !== note.text) {
                editNote(note.id, newText.trim());
            }
        });
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'kanban-note-actions';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'kanban-note-checkbox';
        checkbox.checked = note.completed;
        checkbox.addEventListener('change', () => toggleNoteCompletion(note.id));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'kanban-note-action-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNote(note.id);
        });
        
        actionsDiv.appendChild(checkbox);
        actionsDiv.appendChild(deleteBtn);
        
        noteElement.appendChild(textSpan);
        noteElement.appendChild(actionsDiv);
        
        return noteElement;
    }

    function updateStats() {
        totalNotesEl.textContent = notes.length;
        completedNotesEl.textContent = notes.filter(n => n.completed).length;
        importantNotesEl.textContent = notes.filter(n => n.important).length;
    }

    // Toggle functions
    function toggleView() {
        if (currentView === 'list') {
            currentView = 'kanban';
            viewToggleBtn.querySelector('span').textContent = 'List View';
            listContainer.classList.add('hidden');
            kanbanContainer.classList.remove('hidden');
            chartContainer.classList.add('hidden');
        } else {
            currentView = 'list';
            viewToggleBtn.querySelector('span').textContent = 'Kanban View';
            listContainer.classList.remove('hidden');
            kanbanContainer.classList.add('hidden');
            chartContainer.classList.remove('hidden');
        }
        renderNotes();
    }

    function toggleStats() {
        if (chartContainer.classList.contains('hidden')) {
            chartContainer.classList.remove('hidden');
            renderProductivityChart();
        } else {
            chartContainer.classList.add('hidden');
        }
    }

    function toggleTheme() {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(currentTheme);
        localStorage.setItem('theme', currentTheme);
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const icon = theme === 'dark' ? 'fa-sun' : 'fa-moon';
        themeToggleBtn.innerHTML = `<i class="fas ${icon}"></i>`;
    }

    // Drag and Drop
    function initSortableList() {
        if (notesList) {
            new Sortable(notesList, {
                animation: 150,
                ghostClass: 'dragging',
                onEnd: function(evt) {
                    // Get the array of note IDs in the new order
                    const noteElements = Array.from(notesList.children)
                        .filter(el => el.classList.contains('note-item'));
                    
                    const noteIds = noteElements.map(el => parseInt(el.dataset.id));
                    
                    // Reorder the notes array
                    const newNotesOrder = [];
                    noteIds.forEach(id => {
                        const note = notes.find(n => n.id === id);
                        if (note) newNotesOrder.push(note);
                    });
                    
                    // Add any notes that weren't in the DOM (filtered out)
                    notes.forEach(note => {
                        if (!noteIds.includes(note.id)) {
                            newNotesOrder.push(note);
                        }
                    });
                    
                    notes = newNotesOrder;
                    saveNotes();
                }
            });
        }
    }

    function initKanbanSortable() {
        // Make each kanban column sortable
        [todoItems, inProgressItems, doneItems].forEach(column => {
            if (column) {
                new Sortable(column, {
                    group: 'kanban',
                    animation: 150,
                    ghostClass: 'dragging',
                    onEnd: function(evt) {
                        const noteId = parseInt(evt.item.dataset.id);
                        const newStatus = evt.to.parentElement.parentElement.dataset.status;
                        changeNoteStatus(noteId, newStatus);
                    }
                });
            }
        });
    }

    // Pomodoro Timer
    function startPomodoroForTask(id, text) {
        currentTaskForPomodoro = { id, text };
        currentPomodoroTask.textContent = text;
        pomodoroContainer.classList.remove('hidden');
        resetPomodoro();
    }

    function togglePomodoro() {
        if (isPomodoroRunning) {
            clearInterval(pomodoroInterval);
            isPomodoroRunning = false;
            pomodoroStartBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            isPomodoroRunning = true;
            pomodoroStartBtn.innerHTML = '<i class="fas fa-pause"></i>';
            
            pomodoroInterval = setInterval(() => {
                pomodoroTime--;
                updatePomodoroDisplay();
                
                if (pomodoroTime <= 0) {
                    clearInterval(pomodoroInterval);
                    isPomodoroRunning = false;
                    pomodoroStartBtn.innerHTML = '<i class="fas fa-play"></i>';
                    
                    // Play completion sound
                    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
                    audio.play();
                    
                    // Mark task as completed if one was selected
                    if (currentTaskForPomodoro) {
                        toggleNoteCompletion(currentTaskForPomodoro.id);
                    }
                }
            }, 1000);
        }
    }

    function resetPomodoro() {
        clearInterval(pomodoroInterval);
        isPomodoroRunning = false;
        pomodoroTime = 25 * 60; // Reset to 25 minutes
        updatePomodoroDisplay();
        pomodoroStartBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    function closePomodoro() {
        clearInterval(pomodoroInterval);
        isPomodoroRunning = false;
        pomodoroContainer.classList.add('hidden');
        currentTaskForPomodoro = null;
    }

    function updatePomodoroDisplay() {
        const minutes = Math.floor(pomodoroTime / 60);
        const seconds = pomodoroTime % 60;
        pomodoroTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Voice Input
    function startVoiceInput() {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            
            voiceNoteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            voiceNoteBtn.classList.add('active');
            
            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                noteInput.value = transcript;
                voiceNoteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                voiceNoteBtn.classList.remove('active');
            };
            
            recognition.onerror = function(event) {
                console.error('Voice recognition error', event.error);
                voiceNoteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                voiceNoteBtn.classList.remove('active');
            };
            
            recognition.start();
        } else {
            alert('Voice recognition is not supported in your browser. Try Chrome or Edge.');
        }
    }

    // Productivity Chart
    function renderProductivityChart() {
        const chartElement = document.getElementById('productivity-chart');
        if (!chartElement) return;
        
        const ctx = chartElement.getContext('2d');
        if (!ctx) return;
        
        // Destroy previous chart if it exists
        if (window.productivityChart) {
            window.productivityChart.destroy();
        }
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        window.productivityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [
                    {
                        label: 'Tasks Created',
                        data: productivityData.createdPerDay,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Tasks Completed',
                        data: productivityData.completedPerDay,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim()
                        }
                    }
                }
            }
        });
    }

    // Confetti Animation
    function triggerConfetti() {
        if (typeof ConfettiGenerator === 'undefined') {
            console.error('Confetti library not loaded');
            return;
        }
        
        const confettiSettings = {
            target: 'confetti-container',
            max: 150,
            size: 1.5,
            animate: true,
            props: ['circle', 'square', 'triangle', 'line'],
            colors: [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [255, 0, 255], [0, 255, 255]],
            clock: 25,
            rotate: true,
            start_from_edge: true,
            respawn: true
        };
        
        const confetti = new ConfettiGenerator(confettiSettings);
        confetti.render();
        
        setTimeout(() => {
            confetti.clear();
        }, 3000);
    }

    // Helper Functions
    function formatDate(date) {
        const options = { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('en-US', options);
    }
});