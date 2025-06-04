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
    const checkedInAthletesContainer = document.getElementById('checked-in-athletes-container'); // New
    const availableVolunteerList = document.getElementById('available-volunteer-list');
    // const athleteSelect = document.getElementById('athlete-select'); // Removed
    // const currentAssignmentsList = document.getElementById('current-assignments'); // Removed
    // const athleteNotesDisplay = document.getElementById('athlete-notes-display'); // Removed
    // const pastVolunteerDisplay = document.getElementById('past-volunteer-display'); // Removed

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
        // Clear existing content
        checkedInAthletesContainer.innerHTML = '';
        availableVolunteerList.innerHTML = '';

        // Render Checked-in Athletes or empty state message
        if (appData.checkedInAthletes.length === 0) {
            checkedInAthletesContainer.innerHTML = '<p class="empty-state-message">No athletes are currently checked in.</p>';
        } else {
            appData.checkedInAthletes.forEach(athleteId => {
                const athlete = appData.athletes.find(a => a.id === athleteId);
                if (athlete) {
                    const athleteCard = document.createElement('div');
                    athleteCard.classList.add('athlete-card');
                    athleteCard.dataset.id = athlete.id;

                    // Make athlete card a drop target
                    athleteCard.addEventListener('dragover', (event) => {
                        event.preventDefault(); // Allow drop
                        athleteCard.classList.add('drag-over');
                    });

                    athleteCard.addEventListener('dragleave', () => {
                        athleteCard.classList.remove('drag-over');
                    });

                    athleteCard.addEventListener('drop', (event) => {
                        event.preventDefault();
                        athleteCard.classList.remove('drag-over');

                        const volunteerId = event.dataTransfer.getData('text/plain');
                        const sourceAthleteId = event.dataTransfer.getData('sourceAthleteId'); // Get source athlete
                        const targetAthleteId = event.currentTarget.dataset.id; // Athlete card where dropped

                        if (sourceAthleteId) { // If volunteer was dragged from another athlete
                            if (sourceAthleteId !== targetAthleteId) {
                                // console.log(`Reassigning ${volunteerId} from ${sourceAthleteId} to ${targetAthleteId}`);
                                unassignVolunteerFromAthlete(sourceAthleteId, volunteerId, false); // Suppress re-render
                                assignVolunteerToAthlete(targetAthleteId, volunteerId, false);   // Suppress re-render
                                renderAssignmentsSection(); // Re-render once after both operations
                            } else {
                                // Volunteer dropped on the same athlete card it came from - do nothing.
                                // console.log("Volunteer dropped on the same athlete.");
                            }
                        } else { // Volunteer was dragged from the "Available Volunteers" list
                            assignVolunteerToAthlete(targetAthleteId, volunteerId);
                        }
                    });

                    const nameHeader = document.createElement('h4');
                    nameHeader.textContent = athlete.name;
                    athleteCard.appendChild(nameHeader);

                    const assignedDiv = document.createElement('div');
                    assignedDiv.classList.add('assigned-volunteers-to-athlete');

                    const assignedP = document.createElement('p');
                    const volunteerNamesSpan = document.createElement('span');
                    volunteerNamesSpan.className = 'volunteer-names';
                    assignedP.textContent = 'Assigned: ';
                    assignedP.appendChild(volunteerNamesSpan);
                    assignedDiv.appendChild(assignedP);

                    const assignedUl = document.createElement('ul');
                    assignedUl.classList.add('assigned-volunteer-list-for-athlete');
                    assignedDiv.appendChild(assignedUl);
                    athleteCard.appendChild(assignedDiv);

                    // Populate assigned volunteers and setup unassign buttons
                    const assignedVolunteers = appData.assignments[athlete.id] || [];
                    assignedUl.innerHTML = ''; // Clear previous list items

                    if (assignedVolunteers.length === 0) {
                        volunteerNamesSpan.textContent = 'None';
                    } else {
                        const assignedVolunteerNames = assignedVolunteers.map(volId => {
                            const vol = appData.volunteers.find(v => v.id === volId);
                            return vol ? vol.name : 'Unknown Volunteer';
                        });
                        volunteerNamesSpan.textContent = assignedVolunteerNames.join(', ');

                        assignedVolunteers.forEach(volId => {
                            const volunteer = appData.volunteers.find(v => v.id === volId);
                            if (volunteer) {
                                const li = document.createElement('li');
                                li.textContent = volunteer.name; // Volunteer name

                                // Make it draggable for reassignment
                                li.draggable = true;
                                li.addEventListener('dragstart', (event) => {
                                    event.stopPropagation(); // Prevent athlete card drag interference
                                    event.dataTransfer.setData('text/plain', volunteer.id); // volunteer being dragged
                                    event.dataTransfer.setData('sourceAthleteId', athlete.id); // athlete they are coming from
                                    event.dataTransfer.effectAllowed = 'move';
                                    event.target.classList.add('dragging');
                                });
                                li.addEventListener('dragend', (event) => {
                                    event.stopPropagation();
                                    event.target.classList.remove('dragging');
                                });

                                // Existing remove button logic
                                const removeBtn = document.createElement('button');
                                removeBtn.textContent = 'X';
                                removeBtn.className = 'unassign-volunteer-btn';
                                removeBtn.dataset.athleteId = athlete.id;
                                removeBtn.dataset.volunteerId = volId;
                                removeBtn.addEventListener('click', () => {
                                    unassignVolunteerFromAthlete(athlete.id, volId);
                                });

                                // Add a spacer or style for button positioning if needed, then append button
                                const spacer = document.createTextNode(' '); // Simple space
                                li.appendChild(spacer);
                                li.appendChild(removeBtn);
                                assignedUl.appendChild(li);
                            }
                        });
                    }

                    const notesDiv = document.createElement('div');
                    notesDiv.classList.add('athlete-specific-notes');
                    const notesP = document.createElement('p');
                    notesP.innerHTML = `Notes: <span class="notes-text">${appData.athleteNotes[athlete.id] || 'No notes.'}</span>`;
                    notesDiv.appendChild(notesP);
                    athleteCard.appendChild(notesDiv);

                    checkedInAthletesContainer.appendChild(athleteCard);
                }
            });
        }

        // Render Available Volunteers or empty state message
        if (appData.checkedInVolunteers.length === 0) {
            availableVolunteerList.innerHTML = '<p class="empty-state-message">No volunteers are currently checked in or available.</p>';
        } else {
            appData.checkedInVolunteers.forEach(volunteerId => {
                const volunteer = appData.volunteers.find(v => v.id === volunteerId);
                if (volunteer) {
                    const li = document.createElement('li');
                    li.dataset.id = volunteer.id;
                    li.textContent = volunteer.name;
                    li.draggable = true; // Make volunteer draggable

                    li.addEventListener('dragstart', (event) => {
                        event.dataTransfer.setData('text/plain', volunteer.id);
                        event.dataTransfer.effectAllowed = 'move';
                        event.target.classList.add('dragging'); // Add class when drag starts
                    });

                    li.addEventListener('dragend', (event) => {
                        event.target.classList.remove('dragging'); // Remove class when drag ends
                    });

                    // Visually distinguish if volunteer is assigned elsewhere
                    let isAssigned = false;
                    for (const athleteIdInAssignments in appData.assignments) {
                        if (appData.assignments[athleteIdInAssignments].includes(volunteer.id)) {
                            isAssigned = true;
                            break;
                        }
                    }
                    if (isAssigned) {
                        li.classList.add('assigned-elsewhere');
                    } else {
                        li.classList.remove('assigned-elsewhere');
                    }

                    availableVolunteerList.appendChild(li);
                }
            });
        }

        // REMOVED: Call to updateAssignmentsDisplay as its functionality will be integrated differently
    }


    function unassignVolunteerFromAthlete(athleteId, volunteerId, shouldRender = true) {
        // console.log('Unassigning:', volunteerId, 'from athlete:', athleteId, 'Render:', shouldRender);
        if (appData.assignments[athleteId]) {
            const index = appData.assignments[athleteId].indexOf(volunteerId);
            if (index > -1) {
                appData.assignments[athleteId].splice(index, 1);
            }
            // Clean up empty assignment arrays for the athlete
            if (appData.assignments[athleteId].length === 0) {
                delete appData.assignments[athleteId];
            }
        }
        saveData();
        if (shouldRender) {
            renderAssignmentsSection(); // Re-render the UI
        }
    }


    function assignVolunteerToAthlete(athleteId, volunteerId, shouldRender = true) {
        // console.log('Assigning:', volunteerId, 'to athlete:', athleteId, 'Render:', shouldRender);
        // Ensure assignments array exists for the athlete
        appData.assignments[athleteId] = appData.assignments[athleteId] || [];

        // Add volunteer to assignments if not already assigned
        if (!appData.assignments[athleteId].includes(volunteerId)) {
            appData.assignments[athleteId].push(volunteerId);
        }

        // Update volunteer history for the athlete
        appData.volunteerHistory[athleteId] = appData.volunteerHistory[athleteId] || [];
        if (!appData.volunteerHistory[athleteId].includes(volunteerId)) {
            appData.volunteerHistory[athleteId].push(volunteerId);
        }

        saveData();
        if (shouldRender) {
            renderAssignmentsSection(); // Re-render the UI to reflect the new assignment
        }
    }


/* // Old toggleAssignment function - no longer used by primary assignment UI
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
*/

    function updateAssignmentsDisplay(athleteId) {
        // This function's logic will be refactored.
        // For now, it's emptied or commented out to prevent errors with removed DOM elements.
        // console.log(`updateAssignmentsDisplay called for athlete: ${athleteId}, but is currently disabled.`);
        /*
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
        */
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

    // REMOVED: athleteSelect.addEventListener('change', (event) => {
    //     updateAssignmentsDisplay(event.target.value);
    // });

    // --- Initial Load ---
    loadData();
    renderCheckinLists(); // Start on the check-in screen
    showSection(checkinSection);
});
