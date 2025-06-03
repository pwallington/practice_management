document.addEventListener('DOMContentLoaded', () => {
    // --- Data Storage & Retrieval ---
    const storageKey = 'sportsPracticeData';

    let appData = {
        athletes: [],
        volunteers: [],
        checkedInAthletes: [],
        checkedInVolunteers: [],
        assignments: {}, // {athleteId: [volunteerId1, volunteerId2], ...}
        athleteNotes: {}, // {athleteId: "some notes", ...}
        volunteerHistory: {}, // {volunteerId: [athleteId1, athleteId2], ...}
    };

    function loadData() {
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
            appData = JSON.parse(storedData);
            // Ensure new properties are initialized if loading older data
            appData.assignments = appData.assignments || {};
            appData.athleteNotes = appData.athleteNotes || {};
            appData.volunteerHistory = appData.volunteerHistory || {};
        }
    }

    function saveData() {
        localStorage.setItem(storageKey, JSON.stringify(appData));
    }

    // --- DOM Elements ---
    const checkinSection = document.getElementById('checkin-section');
    const assignmentsSection = document.getElementById('assignments-section');
    const managementSection = document.getElementById('management-section');

    const showCheckinBtn = document.getElementById('show-checkin');
    const showAssignmentsBtn = document.getElementById('show-assignments');
    const showManagementBtn = document.getElementById('show-management');

    // Check-in elements
    const athleteCheckinList = document.getElementById('athlete-checkin-list');
    const volunteerCheckinList = document.getElementById('volunteer-checkin-list');
    const finalizeCheckinBtn = document.getElementById('finalize-checkin');

    // Assignment elements
    const athleteSelect = document.getElementById('athlete-select');
    const currentAssignmentsList = document.getElementById('current-assignments');
    const availableVolunteerList = document.getElementById('available-volunteer-list');
    const athleteNotesDisplay = document.getElementById('athlete-notes-display');
    const pastVolunteerDisplay = document.getElementById('past-volunteer-display');

    // Management elements
    const newAthleteNameInput = document.getElementById('new-athlete-name');
    const newAthleteNotesInput = document.getElementById('new-athlete-notes');
    const addAthleteBtn = document.getElementById('add-athlete-btn');
    const newVolunteerNameInput = document.getElementById('new-volunteer-name');
    const addVolunteerBtn = document.getElementById('add-volunteer-btn');
    const athleteRosterList = document.getElementById('athlete-roster-list');
    const volunteerRosterList = document.getElementById('volunteer-roster-list');

    // --- Helper Functions ---

    // Function to generate a unique ID
    function generateId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    // Function to switch visible sections
    function showSection(section) {
        document.querySelectorAll('.app-section').forEach(sec => {
            sec.classList.remove('active');
        });
        section.classList.add('active');
    }

    // --- Render Functions ---

    function renderCheckinLists() {
        athleteCheckinList.innerHTML = '';
        volunteerCheckinList.innerHTML = '';

        // Render athletes
        appData.athletes.forEach(athlete => {
            const li = document.createElement('li');
            li.dataset.id = athlete.id;
            li.textContent = athlete.name;
            if (appData.checkedInAthletes.includes(athlete.id)) {
                li.classList.add('checked-in');
            }
            li.addEventListener('click', () => {
                toggleCheckin(athlete.id, 'athlete');
            });
            athleteCheckinList.appendChild(li);
        });

        // Render volunteers
        appData.volunteers.forEach(volunteer => {
            const li = document.createElement('li');
            li.dataset.id = volunteer.id;
            li.textContent = volunteer.name;
            if (appData.checkedInVolunteers.includes(volunteer.id)) {
                li.classList.add('checked-in');
            }
            li.addEventListener('click', () => {
                toggleCheckin(volunteer.id, 'volunteer');
            });
            volunteerCheckinList.appendChild(li);
        });
    }

    function renderAssignmentsSection() {
        // Populate athlete select dropdown
        athleteSelect.innerHTML = '<option value="">Select Athlete</option>';
        appData.checkedInAthletes.forEach(athleteId => {
            const athlete = appData.athletes.find(a => a.id === athleteId);
            if (athlete) {
                const option = document.createElement('option');
                option.value = athlete.id;
                option.textContent = athlete.name;
                athleteSelect.appendChild(option);
            }
        });

        // Clear previous assignments and available volunteers
        currentAssignmentsList.innerHTML = '';
        availableVolunteerList.innerHTML = '';
        athleteNotesDisplay.textContent = 'No notes for this athlete.';
        pastVolunteerDisplay.innerHTML = '';

        // Render available volunteers (all checked-in volunteers initially)
        appData.checkedInVolunteers.forEach(volunteerId => {
            const volunteer = appData.volunteers.find(v => v.id === volunteerId);
            if (volunteer) {
                const li = document.createElement('li');
                li.dataset.id = volunteer.id;
                li.textContent = volunteer.name;
                li.addEventListener('click', () => {
                    if (athleteSelect.value) {
                        toggleAssignment(athleteSelect.value, volunteer.id);
                    } else {
                        alert('Please select an athlete first!');
                    }
                });
                availableVolunteerList.appendChild(li);
            }
        });

        // Trigger update if an athlete is already selected
        if (athleteSelect.value) {
            updateAssignmentsDisplay(athleteSelect.value);
        }
    }

    function updateAssignmentsDisplay(athleteId) {
        currentAssignmentsList.innerHTML = '';
        pastVolunteerDisplay.innerHTML = '';

        const athlete = appData.athletes.find(a => a.id === athleteId);
        if (!athlete) {
            athleteNotesDisplay.textContent = 'No notes for this athlete.';
            return;
        }

        // Display notes
        athleteNotesDisplay.textContent = appData.athleteNotes[athlete.id] || 'No notes for this athlete.';

        // Display current assignments
        const assignedVolunteers = appData.assignments[athlete.id] || [];
        assignedVolunteers.forEach(volId => {
            const volunteer = appData.volunteers.find(v => v.id === volId);
            if (volunteer) {
                const li = document.createElement('li');
                li.textContent = volunteer.name;
                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'X';
                removeBtn.style.backgroundColor = '#dc3545';
                removeBtn.style.color = 'white';
                removeBtn.style.border = 'none';
                removeBtn.style.borderRadius = '3px';
                removeBtn.style.padding = '3px 6px';
                removeBtn.style.cursor = 'pointer';
                removeBtn.style.marginLeft = '10px';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent toggling assignment if clicking X
                    toggleAssignment(athlete.id, volId);
                });
                li.appendChild(removeBtn);
                currentAssignmentsList.appendChild(li);

                // Mark volunteer as assigned in the available list
                const availableLi = availableVolunteerList.querySelector(`li[data-id="${volId}"]`);
                if (availableLi) {
                    availableLi.classList.add('assigned');
                }
            }
        });

        // Unmark previously assigned volunteers that are no longer assigned
        appData.checkedInVolunteers.forEach(volId => {
            if (!assignedVolunteers.includes(volId)) {
                const availableLi = availableVolunteerList.querySelector(`li[data-id="${volId}"]`);
                if (availableLi) {
                    availableLi.classList.remove('assigned');
                }
            }
        });


        // Display past volunteers
        const pastVolunteers = appData.volunteerHistory[athlete.id] || [];
        const uniquePastVolunteers = [...new Set(pastVolunteers)]; // Ensure unique display
        uniquePastVolunteers.forEach(volId => {
            // Only show past volunteers if they are not currently assigned to this athlete
            if (!assignedVolunteers.includes(volId)) {
                const volunteer = appData.volunteers.find(v => v.id === volId);
                if (volunteer) {
                    const li = document.createElement('li');
                    li.textContent = volunteer.name;
                    pastVolunteerDisplay.appendChild(li);
                }
            }
        });
        if (uniquePastVolunteers.length === 0 || pastVolunteerDisplay.innerHTML === '') {
            pastVolunteerDisplay.innerHTML = '<li>No past volunteers recorded.</li>';
        }
    }


    function renderRosters() {
        athleteRosterList.innerHTML = '';
        volunteerRosterList.innerHTML = '';

        appData.athletes.forEach(athlete => {
            const li = document.createElement('li');
            li.textContent = athlete.name;
            athleteRosterList.appendChild(li);
        });

        appData.volunteers.forEach(volunteer => {
            const li = document.createElement('li');
            li.textContent = volunteer.name;
            volunteerRosterList.appendChild(li);
        });
    }

    // --- Event Handlers / Core Logic ---

    function toggleCheckin(id, type) {
        let list;
        if (type === 'athlete') {
            list = appData.checkedInAthletes;
        } else {
            list = appData.checkedInVolunteers;
        }

        const index = list.indexOf(id);
        if (index > -1) {
            list.splice(index, 1); // Remove if already checked in
        } else {
            list.push(id); // Add if not checked in
        }
        saveData();
        renderCheckinLists(); // Re-render to update UI
    }

    function addAthlete() {
        const name = newAthleteNameInput.value.trim();
        const notes = newAthleteNotesInput.value.trim();
        if (name) {
            const newAthlete = { id: generateId(), name: name };
            appData.athletes.push(newAthlete);
            appData.athleteNotes[newAthlete.id] = notes; // Store notes with athlete ID
            saveData();
            newAthleteNameInput.value = '';
            newAthleteNotesInput.value = '';
            renderRosters();
            renderCheckinLists(); // Update check-in list as well
            alert(`${name} added to athletes!`);
        } else {
            alert('Athlete name cannot be empty.');
        }
    }

    function addVolunteer() {
        const name = newVolunteerNameInput.value.trim();
        if (name) {
            const newVolunteer = { id: generateId(), name: name };
            appData.volunteers.push(newVolunteer);
            saveData();
            newVolunteerNameInput.value = '';
            renderRosters();
            renderCheckinLists(); // Update check-in list as well
            alert(`${name} added to volunteers!`);
        } else {
            alert('Volunteer/Coach name cannot be empty.');
        }
    }

    function finalizeCheckin() {
        // Reset assignments and volunteer history for non-present athletes
        const currentAssignments = {};
        const currentVolunteerHistory = {};

        // Only carry over assignments for checked-in athletes
        appData.checkedInAthletes.forEach(athleteId => {
            if (appData.assignments[athleteId]) {
                currentAssignments[athleteId] = appData.assignments[athleteId].filter(volId =>
                    appData.checkedInVolunteers.includes(volId)
                );
            }
            // Carry over volunteer history
            currentVolunteerHistory[athleteId] = appData.volunteerHistory[athleteId] || [];
        });

        appData.assignments = currentAssignments;
        appData.volunteerHistory = currentVolunteerHistory;

        saveData();
        renderAssignmentsSection(); // Re-render assignments after finalizing
        alert('Check-in finalized. Assignments can now be made.');
        showSection(assignmentsSection); // Automatically move to assignments
    }


    function toggleAssignment(athleteId, volunteerId) {
        if (!athleteId) {
            alert('Please select an athlete first.');
            return;
        }

        appData.assignments[athleteId] = appData.assignments[athleteId] || [];
        const currentAssignments = appData.assignments[athleteId];

        const index = currentAssignments.indexOf(volunteerId);
        if (index > -1) {
            // Remove assignment
            currentAssignments.splice(index, 1);
        } else {
            // Add assignment
            currentAssignments.push(volunteerId);
        }

        // Update volunteer history for the athlete
        appData.volunteerHistory[athleteId] = appData.volunteerHistory[athleteId] || [];
        if (!appData.volunteerHistory[athleteId].includes(volunteerId)) {
            appData.volunteerHistory[athleteId].push(volunteerId);
        }

        saveData();
        updateAssignmentsDisplay(athleteId); // Re-render assignments for the selected athlete
        renderAssignmentsSection(); // Re-render the overall assignment section to update available volunteers
    }


    // --- Event Listeners ---
    showCheckinBtn.addEventListener('click', () => {
        showSection(checkinSection);
        renderCheckinLists();
    });
    showAssignmentsBtn.addEventListener('click', () => {
        showSection(assignmentsSection);
        renderAssignmentsSection();
    });
    showManagementBtn.addEventListener('click', () => {
        showSection(managementSection);
        renderRosters();
    });

    addAthleteBtn.addEventListener('click', addAthlete);
    addVolunteerBtn.addEventListener('click', addVolunteer);

    finalizeCheckinBtn.addEventListener('click', finalizeCheckin);

    athleteSelect.addEventListener('change', (event) => {
        updateAssignmentsDisplay(event.target.value);
    });

    // --- Initial Load ---
    loadData();
    renderCheckinLists(); // Start on the check-in screen
    showSection(checkinSection);
});
