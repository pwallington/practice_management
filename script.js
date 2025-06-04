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
        athleteRoles: [],
        volunteerRoles: [],
        editingItemId: null,
        editingItemType: null,
    };

    function loadData() {
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
            appData = JSON.parse(storedData);
            // Ensure new properties are initialized if loading older data
            appData.assignments = appData.assignments || {};
            appData.athleteNotes = appData.athleteNotes || {};
            appData.volunteerHistory = appData.volunteerHistory || {};
            appData.athleteRoles = appData.athleteRoles || [];
            appData.volunteerRoles = appData.volunteerRoles || [];
            appData.editingItemId = appData.editingItemId || null;
            appData.editingItemType = appData.editingItemType || null;

            appData.athletes.forEach(athlete => athlete.roles = athlete.roles || []);
            appData.volunteers.forEach(volunteer => volunteer.roles = volunteer.roles || []);
        }
    }

    function deleteAthleteRole(roleId) {
        const roleToDelete = appData.athleteRoles.find(r => r.id === roleId);
        if (!roleToDelete) return;

        const athletesWithRole = appData.athletes.filter(a => a.roles.includes(roleId));
        let confirmed = true;
        if (athletesWithRole.length > 0) {
            confirmed = confirm(`Athlete role "${roleToDelete.name}" is assigned to ${athletesWithRole.length} athlete(s). Deleting it will remove it from them. Continue?`);
        }

        if (confirmed) {
            appData.athleteRoles = appData.athleteRoles.filter(r => r.id !== roleId);
            appData.athletes.forEach(athlete => {
                athlete.roles = athlete.roles.filter(r => r !== roleId);
            });
            saveData();
            renderRoleSelectors();
            renderManageRolesList();
            renderRosters(); // Re-render rosters as roles might be displayed there
        }
    }

    function deleteVolunteerRole(roleId) {
        const roleToDelete = appData.volunteerRoles.find(r => r.id === roleId);
        if (!roleToDelete) return;

        const volunteersWithRole = appData.volunteers.filter(v => v.roles.includes(roleId));
        let confirmed = true;
        if (volunteersWithRole.length > 0) {
            confirmed = confirm(`Volunteer role "${roleToDelete.name}" is assigned to ${volunteersWithRole.length} volunteer(s). Deleting it will remove it from them. Continue?`);
        }

        if (confirmed) {
            appData.volunteerRoles = appData.volunteerRoles.filter(r => r.id !== roleId);
            appData.volunteers.forEach(volunteer => {
                volunteer.roles = volunteer.roles.filter(r => r !== roleId);
            });
            saveData();
            renderRoleSelectors();
            renderManageRolesList();
            renderRosters(); // Re-render rosters
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
    const cancelAthleteEditBtn = document.getElementById('cancel-athlete-edit-btn');
    const cancelVolunteerEditBtn = document.getElementById('cancel-volunteer-edit-btn');
    const newAthleteRoleNameInput = document.getElementById('new-athlete-role-name');
    const addAthleteRoleBtn = document.getElementById('add-athlete-role-btn');
    const athleteRoleCheckboxesContainer = document.getElementById('athlete-role-checkboxes');
    const newVolunteerRoleNameInput = document.getElementById('new-volunteer-role-name');
    const addVolunteerRoleBtn = document.getElementById('add-volunteer-role-btn');
    const volunteerRoleCheckboxesContainer = document.getElementById('volunteer-role-checkboxes');
    const manageAthleteRolesList = document.getElementById('manage-athlete-roles-list');
    const manageVolunteerRolesList = document.getElementById('manage-volunteer-roles-list');

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

    function clearAllHighlights() {
        document.querySelectorAll('#athlete-roster-list li, #volunteer-roster-list li').forEach(item => {
            item.classList.remove('editing-item');
        });
    }

    function resetAthleteForm() {
        newAthleteNameInput.value = '';
        newAthleteNotesInput.value = '';
        addAthleteBtn.textContent = 'Add Athlete';
        cancelAthleteEditBtn.style.display = 'none';
        appData.editingItemId = null;
        appData.editingItemType = null;
        document.querySelectorAll('#athlete-role-checkboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
        clearAllHighlights();
    }

    function resetVolunteerForm() {
        newVolunteerNameInput.value = '';
        addVolunteerBtn.textContent = 'Add Volunteer';
        cancelVolunteerEditBtn.style.display = 'none';
        // If editingItemId and Type point to volunteer, reset them.
        if (appData.editingItemType === 'volunteer') {
            appData.editingItemId = null;
            appData.editingItemType = null;
        }
        document.querySelectorAll('#volunteer-role-checkboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
        clearAllHighlights();
    }

    // --- Render Functions ---

    function renderRoleSelectors() {
        athleteRoleCheckboxesContainer.innerHTML = '';
        appData.athleteRoles.forEach(role => {
            const div = document.createElement('div');
            // Ensure unique IDs for labels and inputs if roles can have same names (though IDs should be unique)
            div.innerHTML = `<input type="checkbox" id="arole_${role.id}" name="athlete_role" value="${role.id}"> <label for="arole_${role.id}">${role.name}</label>`;
            athleteRoleCheckboxesContainer.appendChild(div);
        });

        volunteerRoleCheckboxesContainer.innerHTML = '';
        appData.volunteerRoles.forEach(role => {
            const div = document.createElement('div');
            div.innerHTML = `<input type="checkbox" id="vrole_${role.id}" name="volunteer_role" value="${role.id}"> <label for="vrole_${role.id}">${role.name}</label>`;
            volunteerRoleCheckboxesContainer.appendChild(div);
        });
    }

    function renderManageRolesList() {
        manageAthleteRolesList.innerHTML = '';
        appData.athleteRoles.forEach(role => {
            const li = document.createElement('li');
            li.textContent = role.name + ' ';
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('delete-role-btn');
            deleteBtn.addEventListener('click', () => deleteAthleteRole(role.id));
            li.appendChild(deleteBtn);
            manageAthleteRolesList.appendChild(li);
        });

        manageVolunteerRolesList.innerHTML = '';
        appData.volunteerRoles.forEach(role => {
            const li = document.createElement('li');
            li.textContent = role.name + ' ';
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('delete-role-btn');
            deleteBtn.addEventListener('click', () => deleteVolunteerRole(role.id));
            li.appendChild(deleteBtn);
            manageVolunteerRolesList.appendChild(li);
        });
    }

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
                        const athleteId = athleteCard.dataset.id; // or event.currentTarget.dataset.id
                        assignVolunteerToAthlete(athleteId, volunteerId);
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
                                li.textContent = volunteer.name + ' '; // Add space for button
                                const removeBtn = document.createElement('button');
                                removeBtn.textContent = 'X';
                                removeBtn.className = 'unassign-volunteer-btn';
                                removeBtn.dataset.athleteId = athlete.id;
                                removeBtn.dataset.volunteerId = volId;
                                removeBtn.addEventListener('click', () => {
                                    // console.log('Attempting to unassign:', athlete.id, volId);
                                    unassignVolunteerFromAthlete(athlete.id, volId);
                                });
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


    function unassignVolunteerFromAthlete(athleteId, volunteerId) {
        // console.log('Unassigning:', volunteerId, 'from athlete:', athleteId);
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
        renderAssignmentsSection(); // Re-render the UI
    }


    function assignVolunteerToAthlete(athleteId, volunteerId) {
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
        renderAssignmentsSection(); // Re-render the UI to reflect the new assignment
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
            let athleteDisplayText = athlete.name;
            const athleteRoleNames = athlete.roles.map(roleId => {
                const role = appData.athleteRoles.find(r => r.id === roleId);
                return role ? role.name : '';
            }).filter(name => name).join(', ');
            if (athleteRoleNames) {
                athleteDisplayText += ` (Roles: ${athleteRoleNames})`;
            }
            li.textContent = athleteDisplayText;
            li.dataset.id = athlete.id; // Ensure ID is set for editing
            li.addEventListener('click', () => {
                clearAllHighlights();
                li.classList.add('editing-item');
                resetVolunteerForm(); // Reset other form
                appData.editingItemId = athlete.id;
                appData.editingItemType = 'athlete';
                newAthleteNameInput.value = athlete.name;
                newAthleteNotesInput.value = appData.athleteNotes[athlete.id] || '';
                addAthleteBtn.textContent = 'Update Athlete';
                cancelAthleteEditBtn.style.display = 'inline-block';
                renderRoleSelectors(); // Render checkboxes first
                appData.athleteRoles.forEach(role => {
                    const checkbox = document.getElementById(`arole_${role.id}`);
                    if (checkbox) {
                        checkbox.checked = athlete.roles.includes(role.id);
                    }
                });
            });
            athleteRosterList.appendChild(li);
        });

        appData.volunteers.forEach(volunteer => {
            const li = document.createElement('li');
            let volunteerDisplayText = volunteer.name;
            const volunteerRoleNames = volunteer.roles.map(roleId => {
                const role = appData.volunteerRoles.find(r => r.id === roleId);
                return role ? role.name : '';
            }).filter(name => name).join(', ');
            if (volunteerRoleNames) {
                volunteerDisplayText += ` (Roles: ${volunteerRoleNames})`;
            }
            li.textContent = volunteerDisplayText;
            li.dataset.id = volunteer.id; // Ensure ID is set for editing
            li.addEventListener('click', () => {
                clearAllHighlights();
                li.classList.add('editing-item');
                resetAthleteForm(); // Reset other form
                appData.editingItemId = volunteer.id;
                appData.editingItemType = 'volunteer';
                newVolunteerNameInput.value = volunteer.name;
                addVolunteerBtn.textContent = 'Update Volunteer';
                cancelVolunteerEditBtn.style.display = 'inline-block';
                renderRoleSelectors(); // Render checkboxes first
                appData.volunteerRoles.forEach(role => {
                    const checkbox = document.getElementById(`vrole_${role.id}`);
                    if (checkbox) {
                        checkbox.checked = volunteer.roles.includes(role.id);
                    }
                });
            });
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

    function addAthleteRole() {
        const roleName = newAthleteRoleNameInput.value.trim();
        if (roleName && !appData.athleteRoles.find(r => r.name === roleName)) {
            const newRole = { id: generateId(), name: roleName };
            appData.athleteRoles.push(newRole);
            saveData();
            renderRoleSelectors();
            renderManageRolesList();
            newAthleteRoleNameInput.value = '';
        } else if (!roleName) {
            alert('Role name cannot be empty.');
        } else {
            alert('Athlete role already exists.');
        }
    }

    function addVolunteerRole() {
        const roleName = newVolunteerRoleNameInput.value.trim();
        if (roleName && !appData.volunteerRoles.find(r => r.name === roleName)) {
            const newRole = { id: generateId(), name: roleName };
            appData.volunteerRoles.push(newRole);
            saveData();
            renderRoleSelectors();
            renderManageRolesList();
            newVolunteerRoleNameInput.value = '';
        } else if (!roleName) {
            alert('Role name cannot be empty.');
        } else {
            alert('Volunteer role already exists.');
        }
    }

    function addAthlete() {
        const name = newAthleteNameInput.value.trim();
        const notes = newAthleteNotesInput.value.trim();

        if (!name) {
            alert('Athlete name cannot be empty.');
            return;
        }

        if (appData.editingItemId && appData.editingItemType === 'athlete') {
            // Edit mode
            const athlete = appData.athletes.find(a => a.id === appData.editingItemId);
            if (athlete) {
                athlete.name = name;
                appData.athleteNotes[appData.editingItemId] = notes;
                const selectedRoleIds = [];
                document.querySelectorAll('#athlete-role-checkboxes input[type="checkbox"]:checked').forEach(checkbox => {
                    selectedRoleIds.push(checkbox.value);
                });
                athlete.roles = selectedRoleIds;
                saveData();
                renderRosters();
                resetAthleteForm();
                alert(`${name} updated!`);
            }
            return;
        }

        // Add new athlete mode
        const selectedRoleIds = [];
        document.querySelectorAll('#athlete-role-checkboxes input[type="checkbox"]:checked').forEach(checkbox => {
            selectedRoleIds.push(checkbox.value);
        });
        const newAthlete = { id: generateId(), name: name, roles: selectedRoleIds };
        appData.athletes.push(newAthlete);
        appData.athleteNotes[newAthlete.id] = notes; // Store notes with athlete ID
        saveData();
        resetAthleteForm(); // Clears inputs and resets button text etc.
        renderRosters();
        renderCheckinLists(); // Update check-in list as well
        alert(`${name} added to athletes!`);
    }

    function addVolunteer() {
        const name = newVolunteerNameInput.value.trim();

        if (!name) {
            alert('Volunteer/Coach name cannot be empty.');
            return;
        }

        if (appData.editingItemId && appData.editingItemType === 'volunteer') {
            // Edit mode
            const volunteer = appData.volunteers.find(v => v.id === appData.editingItemId);
            if (volunteer) {
                volunteer.name = name;
                const selectedRoleIds = [];
                document.querySelectorAll('#volunteer-role-checkboxes input[type="checkbox"]:checked').forEach(checkbox => {
                    selectedRoleIds.push(checkbox.value);
                });
                volunteer.roles = selectedRoleIds;
                saveData();
                renderRosters();
                resetVolunteerForm();
                alert(`${name} updated!`);
            }
            return;
        }

        // Add new volunteer mode
        const selectedRoleIds = [];
        document.querySelectorAll('#volunteer-role-checkboxes input[type="checkbox"]:checked').forEach(checkbox => {
            selectedRoleIds.push(checkbox.value);
        });
        const newVolunteer = { id: generateId(), name: name, roles: selectedRoleIds };
        appData.volunteers.push(newVolunteer);
        saveData();
        resetVolunteerForm(); // Clears input and resets button text etc.
        renderRosters();
        renderCheckinLists(); // Update check-in list as well
        alert(`${name} added to volunteers!`);
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
        // updateAssignmentsDisplay(athleteId); // This was part of the old logic
        renderAssignmentsSection(); // Re-render the overall assignment section
    }
*/

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
        renderRoleSelectors(); // Ensure roles are displayed
        renderManageRolesList(); // Ensure role management list is displayed
        resetAthleteForm(); // Ensure form is reset when navigating to this section
        resetVolunteerForm(); // Ensure form is reset
    });

    addAthleteBtn.addEventListener('click', addAthlete);
    addVolunteerBtn.addEventListener('click', addVolunteer);

    cancelAthleteEditBtn.addEventListener('click', resetAthleteForm);
    cancelVolunteerEditBtn.addEventListener('click', resetVolunteerForm);

    addAthleteRoleBtn.addEventListener('click', addAthleteRole);
    addVolunteerRoleBtn.addEventListener('click', addVolunteerRole);

    newAthleteNameInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission, if any
            addAthleteBtn.click();
        }
    });

    newVolunteerNameInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission, if any
            addVolunteerBtn.click();
        }
    });

    finalizeCheckinBtn.addEventListener('click', finalizeCheckin);

    // REMOVED: athleteSelect.addEventListener('change', (event) => {
    //     updateAssignmentsDisplay(event.target.value);
    // });

    // --- Initial Load ---
    loadData();
    renderCheckinLists(); // Start on the check-in screen
    renderRoleSelectors(); // Render role selectors on initial load
    renderManageRolesList(); // Render role management list on initial load
    showSection(checkinSection);
});
