/**
 * Fitness Tracker - Daily Goal Management
 * 
 * Handles:
 * - Daily fitness goal creation and management
 * - Date navigation (previous/next days)
 * - Goal completion tracking with checkboxes
 * - Real-time progress statistics
 * - Firebase integration for persistence
 * - Touch-friendly UI interactions
 * - Local storage for daily check-in state
 * 
 * @module fitness-tracker
 */

import { auth, database } from '../js/firebase-config.js';
import { escapeHtml } from '../js/utils.js';
import {
    initAuthListener,
    getCurrentUser,
    waitForAuthReady,
    onAuthStateChange,
    signInUser,
    signUpUser,
    signInWithGoogle,
    signOutUser,
    resetPassword,
    changePassword
} from '../js/firebase-auth-service.js';

// ========================================
// State Management
// ========================================

let currentDate = new Date();
let currentDateKey = getDateKey(new Date());
let fitnessGoals = {};
let completedGoals = new Set();
let unsubscribeAuth = null;
let unsubscribeGoals = null;
let currentUser = null;
let isInitialized = false;

// ========================================
// Date Utilities
// ========================================

function getDateKey(date) {
    return date.toISOString().split('T')[0];
}

function formatDateDisplay(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateString = getDateKey(date);
    const todayString = getDateKey(today);
    const yesterdayString = getDateKey(yesterday);
    const tomorrowString = getDateKey(tomorrow);

    if (dateString === todayString) return 'Today';
    if (dateString === yesterdayString) return 'Yesterday';
    if (dateString === tomorrowString) return 'Tomorrow';

    return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}

function updateDateDisplay() {
    const display = document.getElementById('dateDisplay');
    if (display) {
        display.textContent = formatDateDisplay(currentDate);
    }
}

// ========================================
// Navigation Functions
// ========================================

function goToPreviousDay() {
    currentDate.setDate(currentDate.getDate() - 1);
    currentDateKey = getDateKey(currentDate);
    updateDateDisplay();
    loadGoalsForDate();
}

function goToNextDay() {
    currentDate.setDate(currentDate.getDate() + 1);
    currentDateKey = getDateKey(currentDate);
    updateDateDisplay();
    loadGoalsForDate();
}

function goToToday() {
    currentDate = new Date();
    currentDateKey = getDateKey(currentDate);
    updateDateDisplay();
    loadGoalsForDate();
}

// ========================================
// Firebase Database Functions
// ========================================

function initFirebaseListeners() {
    if (!currentUser) return;

    // Listen to goals data
    const userId = currentUser.uid;
    const goalsRef = database.ref(`fitness-goals/${userId}`);

    if (unsubscribeGoals) {
        unsubscribeGoals();
    }

    unsubscribeGoals = goalsRef.on('value', (snapshot) => {
        fitnessGoals = snapshot.val() || {};
        loadGoalsForDate();
    }, (error) => {
        console.error('Error loading fitness goals:', error);
        showToast('Failed to load fitness goals', 'error');
    });
}

function saveGoal(goalData) {
    if (!currentUser) {
        showToast('Please sign in to save goals', 'warning');
        return Promise.reject(new Error('User not authenticated'));
    }

    const userId = currentUser.uid;
    const goalId = goalData.id || database.ref().push().key;
    const goalWithId = {
        ...goalData,
        id: goalId,
        createdAt: goalData.createdAt || Date.now(),
        updatedAt: Date.now()
    };

    return database.ref(`fitness-goals/${userId}/${goalId}`).set(goalWithId)
        .then(() => {
            showToast('Goal saved successfully!', 'success');
            return goalId;
        })
        .catch((error) => {
            console.error('Error saving goal:', error);
            showToast('Failed to save goal', 'error');
            throw error;
        });
}

function updateGoalCompletion(goalId, isCompleted) {
    if (!currentUser) {
        showToast('Please sign in to update goals', 'warning');
        return Promise.reject(new Error('User not authenticated'));
    }

    const userId = currentUser.uid;
    const completionKey = `completion-${currentDateKey}`;

    return database.ref(`fitness-goals/${userId}/${goalId}/${completionKey}`).set(isCompleted)
        .then(() => {
            if (isCompleted) {
                completedGoals.add(goalId);
            } else {
                completedGoals.delete(goalId);
            }
            updateStats();
            return true;
        })
        .catch((error) => {
            console.error('Error updating goal completion:', error);
            showToast('Failed to update goal', 'error');
            throw error;
        });
}

function deleteGoal(goalId) {
    if (!currentUser) return Promise.reject(new Error('User not authenticated'));

    const userId = currentUser.uid;
    return database.ref(`fitness-goals/${userId}/${goalId}`).remove()
        .then(() => {
            showToast('Goal deleted successfully', 'success');
        })
        .catch((error) => {
            console.error('Error deleting goal:', error);
            showToast('Failed to delete goal', 'error');
            throw error;
        });
}

// ========================================
// Goal Rendering
// ========================================

function loadGoalsForDate() {
    const container = document.getElementById('fitnessGoalsListContainer');
    if (!container) return;

    completedGoals.clear();
    const goalsForDate = [];
    const recurringGoals = [];

    // Find goals for the selected date
    for (const goalId in fitnessGoals) {
        const goal = fitnessGoals[goalId];
        const goalDate = goal.date || goal.goalDate;

        // Check if goal is for this date
        if (goalDate === currentDateKey) {
            goalsForDate.push(goal);
        }

        // Check if goal should appear today (recurring goals)
        if (goal.recurring && goalDate <= currentDateKey) {
            if (!goalsForDate.find(g => g.id === goalId)) {
                recurringGoals.push(goal);
            }
        }

        // Check completion status
        const completionKey = `completion-${currentDateKey}`;
        if (goal[completionKey]) {
            completedGoals.add(goalId);
        }
    }

    const allGoalsForDate = [...goalsForDate, ...recurringGoals];

    if (allGoalsForDate.length === 0) {
        renderEmptyState(container);
    } else {
        renderGoalsList(container, allGoalsForDate);
    }

    updateStats();
}

function renderEmptyState(container) {
    container.innerHTML = `
        <div class="empty-state">
            <i class="bi bi-inbox"></i>
            <p>No fitness goals for this day yet.</p>
            <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addGoalModal">
                <i class="bi bi-plus-circle"></i> Create Your First Goal
            </button>
        </div>
    `;
}

function renderGoalsList(container, goals) {
    container.innerHTML = goals
        .map(goal => createGoalCard(goal))
        .join('');

    // Attach event listeners
    attachGoalEventListeners();
}

function createGoalCard(goal) {
    const isCompleted = completedGoals.has(goal.id);
    const goalCategory = goal.category || 'other';
    const completionKey = `completion-${currentDateKey}`;
    const isChecked = goal[completionKey] ? 'checked' : '';

    // Build meta information based on category
    let metaItems = [];

    // Add duration if available
    if (goal.duration) {
        metaItems.push(`<div class="goal-meta-item"><i class="bi bi-hourglass-split"></i><span>${escapeHtml(goal.duration)}</span></div>`);
    }

    // Add category-specific information
    switch (goalCategory) {
        case 'cardio':
            if (goal.distance) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-geo-alt"></i><span>${escapeHtml(goal.distance)}km</span></div>`);
            if (goal.calories) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-fire"></i><span>${escapeHtml(goal.calories)} cal</span></div>`);
            break;
        case 'strength':
            if (goal.sets) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-repeat"></i><span>${escapeHtml(goal.sets)}</span></div>`);
            if (goal.weight) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-weight"></i><span>${escapeHtml(goal.weight)}</span></div>`);
            break;
        case 'walking':
            if (goal.distance) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-geo-alt"></i><span>${escapeHtml(goal.distance)}km</span></div>`);
            if (goal.steps) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-walking"></i><span>${escapeHtml(goal.steps)} steps</span></div>`);
            break;
        case 'cycling':
            if (goal.distance) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-bicycle"></i><span>${escapeHtml(goal.distance)}km</span></div>`);
            if (goal.calories) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-fire"></i><span>${escapeHtml(goal.calories)} cal</span></div>`);
            break;
        case 'swimming':
            if (goal.distance) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-water"></i><span>${escapeHtml(goal.distance)}m</span></div>`);
            if (goal.calories) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-fire"></i><span>${escapeHtml(goal.calories)} cal</span></div>`);
            break;
        case 'nutrition':
            if (goal.calories) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-cup-straw"></i><span>${escapeHtml(goal.calories)} cal</span></div>`);
            if (goal.mealtype) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-egg-fried"></i><span>${escapeHtml(goal.mealtype)}</span></div>`);
            break;
        case 'water':
            if (goal.amount) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-droplet"></i><span>${escapeHtml(goal.amount)}</span></div>`);
            break;
        case 'sleep':
            if (goal.bedtime) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-moon"></i><span>Bed: ${escapeHtml(goal.bedtime)}</span></div>`);
            if (goal.waketime) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-sunrise"></i><span>Wake: ${escapeHtml(goal.waketime)}</span></div>`);
            break;
        case 'meditation':
            if (goal.meditationtype) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-peace"></i><span>${escapeHtml(goal.meditationtype)}</span></div>`);
            break;
        case 'weight':
            if (goal.weighttarget) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-speedometer2"></i><span>${escapeHtml(goal.weighttarget)}kg</span></div>`);
            if (goal.weighttype) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-arrow-${goal.weighttype === 'lose' ? 'down' : goal.weighttype === 'gain' ? 'up' : 'right'}"></i><span>${escapeHtml(goal.weighttype)}</span></div>`);
            break;
        case 'yoga':
            if (goal.yogatType) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-yin-yang"></i><span>${escapeHtml(goal.yogatType)}</span></div>`);
            break;
        case 'sports':
            if (goal.sporttype) metaItems.push(`<div class="goal-meta-item"><i class="bi bi-trophy"></i><span>${escapeHtml(goal.sporttype)}</span></div>`);
            break;
    }

    // Add date
    metaItems.push(`<div class="goal-meta-item"><i class="bi bi-calendar3"></i><span>${new Date(goal.date || goal.goalDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span></div>`);

    // Add recurring indicator
    if (goal.recurring) {
        metaItems.push(`<div class="goal-meta-item"><i class="bi bi-arrow-repeat"></i><span>Daily</span></div>`);
    }

    // Add time if specified
    if (goal.time) {
        metaItems.push(`<div class="goal-meta-item"><i class="bi bi-clock"></i><span>${escapeHtml(goal.time)}</span></div>`);
    }

    return `
        <div class="goal-card ${goalCategory} ${isCompleted ? 'completed' : ''}" data-goal-id="${goal.id}">
            <div class="goal-header">
                <div class="goal-checkbox">
                    <input
                        type="checkbox"
                        class="goal-checkbox-input"
                        data-goal-id="${goal.id}"
                        ${isChecked}
                        aria-label="Mark goal as complete"
                    >
                </div>
                <div class="goal-info">
                    <h3 class="goal-title">${escapeHtml(goal.title || 'Untitled Goal')}</h3>
                    <span class="goal-category-badge">${escapeHtml(goalCategory)}</span>
                </div>
            </div>

            <div class="goal-meta">
                ${metaItems.join('')}
            </div>

            ${goal.notes ? `<p class="goal-notes">"${escapeHtml(goal.notes)}"</p>` : ''}

            <div class="goal-actions">
                <button type="button" class="goal-action-btn edit-goal-btn" data-goal-id="${goal.id}" data-bs-toggle="modal" data-bs-target="#addGoalModal">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button type="button" class="goal-action-btn delete delete-goal-btn" data-goal-id="${goal.id}">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
}

function attachGoalEventListeners() {
    // Checkbox listeners
    document.querySelectorAll('.goal-checkbox-input').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const goalId = e.target.dataset.goalId;
            updateGoalCompletion(goalId, e.target.checked);
        });
    });

    // Delete button listeners
    document.querySelectorAll('.delete-goal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const goalId = e.currentTarget.dataset.goalId;
            if (confirm('Are you sure you want to delete this goal?')) {
                deleteGoal(goalId);
            }
        });
    });

    // Edit button listeners
    document.querySelectorAll('.edit-goal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const goalId = e.currentTarget.dataset.goalId;
            const goal = fitnessGoals[goalId];
            if (goal) {
                populateFormWithGoal(goal);
            }
        });
    });
}

// ========================================
// Stats Management
// ========================================

function updateStats() {
    const goalsCount = document.getElementById('totalGoalsCount');
    const completedCount = document.getElementById('completedGoalsCount');
    const inProgressCount = document.getElementById('inProgressGoalsCount');
    const percentageDisplay = document.getElementById('completionPercentage');

    const total = getTotalGoalsForDate();
    const completed = completedGoals.size;
    const inProgress = total - completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    if (goalsCount) goalsCount.textContent = total;
    if (completedCount) completedCount.textContent = completed;
    if (inProgressCount) inProgressCount.textContent = inProgress;
    if (percentageDisplay) percentageDisplay.textContent = `${percentage}%`;
}

function getTotalGoalsForDate() {
    let count = 0;
    for (const goalId in fitnessGoals) {
        const goal = fitnessGoals[goalId];
        const goalDate = goal.date || goal.goalDate;

        if (goalDate === currentDateKey || (goal.recurring && goalDate <= currentDateKey)) {
            count++;
        }
    }
    return count;
}

// ========================================
// Form Management
// ========================================


function updateDynamicFields() {
    const category = document.getElementById('goalCategory').value;
    const dynamicFieldsContainer = document.getElementById('dynamicFields');

    if (!dynamicFieldsContainer) return;

    let fieldsHTML = '';

    switch (category) {
        case 'cardio':
            fieldsHTML = `
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalDuration" class="form-label">Duration <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="goalDuration" placeholder="e.g., 30 minutes, 45 minutes" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalDistance" class="form-label">Distance (km)</label>
                        <input type="number" class="form-control" id="goalDistance" placeholder="e.g., 5.0" step="0.1" min="0">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalCalories" class="form-label">Calories to Burn</label>
                        <input type="number" class="form-control" id="goalCalories" placeholder="e.g., 300" min="0">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalIntensity" class="form-label">Intensity Level</label>
                        <select class="form-select" id="goalIntensity">
                            <option value="">Select intensity</option>
                            <option value="low">Low (Walking pace)</option>
                            <option value="moderate">Moderate (Jogging)</option>
                            <option value="high">High (Running/Sprinting)</option>
                        </select>
                    </div>
                </div>
            `;
            break;

        case 'strength':
            fieldsHTML = `
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalDuration" class="form-label">Duration</label>
                        <input type="text" class="form-control" id="goalDuration" placeholder="e.g., 45 minutes, 1 hour">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalSets" class="form-label">Sets & Reps</label>
                        <input type="text" class="form-control" id="goalSets" placeholder="e.g., 3x12, 4x10">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalWeight" class="form-label">Weight/Resistance</label>
                        <input type="text" class="form-control" id="goalWeight" placeholder="e.g., 20kg, bodyweight">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalMuscleGroups" class="form-label">Target Muscle Groups</label>
                        <input type="text" class="form-control" id="goalMuscleGroups" placeholder="e.g., Chest, Back, Legs">
                    </div>
                </div>
            `;
            break;

        case 'yoga':
            fieldsHTML = `
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalDuration" class="form-label">Duration <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="goalDuration" placeholder="e.g., 30 minutes, 60 minutes" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalYogaType" class="form-label">Yoga Type</label>
                        <select class="form-select" id="goalYogaType">
                            <option value="">Select type</option>
                            <option value="hatha">Hatha Yoga</option>
                            <option value="vinyasa">Vinyasa Flow</option>
                            <option value="ashtanga">Ashtanga</option>
                            <option value="bikram">Bikram/Hot Yoga</option>
                            <option value="yin">Yin Yoga</option>
                            <option value="restorative">Restorative</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalDifficulty" class="form-label">Difficulty Level</label>
                        <select class="form-select" id="goalDifficulty">
                            <option value="">Select difficulty</option>
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalFocus" class="form-label">Focus Area</label>
                        <input type="text" class="form-control" id="goalFocus" placeholder="e.g., Flexibility, Balance, Strength">
                    </div>
                </div>
            `;
            break;

        case 'walking':
            fieldsHTML = `
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalDuration" class="form-label">Duration</label>
                        <input type="text" class="form-control" id="goalDuration" placeholder="e.g., 30 minutes, 1 hour">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalDistance" class="form-label">Distance (km) <span class="text-danger">*</span></label>
                        <input type="number" class="form-control" id="goalDistance" placeholder="e.g., 5.0" step="0.1" min="0" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalSteps" class="form-label">Steps Count</label>
                        <input type="number" class="form-control" id="goalSteps" placeholder="e.g., 8000" min="0">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalCalories" class="form-label">Calories to Burn</label>
                        <input type="number" class="form-control" id="goalCalories" placeholder="e.g., 200" min="0">
                    </div>
                </div>
            `;
            break;

        case 'cycling':
            fieldsHTML = `
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalDuration" class="form-label">Duration <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="goalDuration" placeholder="e.g., 45 minutes, 1 hour" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalDistance" class="form-label">Distance (km)</label>
                        <input type="number" class="form-control" id="goalDistance" placeholder="e.g., 20.0" step="0.1" min="0">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalCalories" class="form-label">Calories to Burn</label>
                        <input type="number" class="form-control" id="goalCalories" placeholder="e.g., 400" min="0">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalTerrain" class="form-label">Terrain Type</label>
                        <select class="form-select" id="goalTerrain">
                            <option value="">Select terrain</option>
                            <option value="road">Road Cycling</option>
                            <option value="mountain">Mountain Biking</option>
                            <option value="stationary">Stationary Bike</option>
                            <option value="indoor">Indoor Cycling</option>
                        </select>
                    </div>
                </div>
            `;
            break;

        case 'swimming':
            fieldsHTML = `
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalDuration" class="form-label">Duration <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="goalDuration" placeholder="e.g., 30 minutes, 45 minutes" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalDistance" class="form-label">Distance (meters)</label>
                        <input type="number" class="form-control" id="goalDistance" placeholder="e.g., 1000" min="0">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalCalories" class="form-label">Calories to Burn</label>
                        <input type="number" class="form-control" id="goalCalories" placeholder="e.g., 350" min="0">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalStroke" class="form-label">Stroke Type</label>
                        <select class="form-select" id="goalStroke">
                            <option value="">Select stroke</option>
                            <option value="freestyle">Freestyle</option>
                            <option value="breaststroke">Breaststroke</option>
                            <option value="backstroke">Backstroke</option>
                            <option value="butterfly">Butterfly</option>
                            <option value="mixed">Mixed Strokes</option>
                        </select>
                    </div>
                </div>
            `;
            break;

        case 'sports':
            fieldsHTML = `
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalDuration" class="form-label">Duration</label>
                        <input type="text" class="form-control" id="goalDuration" placeholder="e.g., 1 hour, 90 minutes">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalSportType" class="form-label">Sport Type <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="goalSportType" placeholder="e.g., Basketball, Tennis, Soccer" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalCalories" class="form-label">Calories to Burn</label>
                        <input type="number" class="form-control" id="goalCalories" placeholder="e.g., 500" min="0">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalIntensity" class="form-label">Intensity Level</label>
                        <select class="form-select" id="goalIntensity">
                            <option value="">Select intensity</option>
                            <option value="low">Low (Casual play)</option>
                            <option value="moderate">Moderate (Competitive)</option>
                            <option value="high">High (Intense training)</option>
                        </select>
                    </div>
                </div>
            `;
            break;

        case 'nutrition':
            fieldsHTML = `
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalCalories" class="form-label">Calorie Target</label>
                        <input type="number" class="form-control" id="goalCalories" placeholder="e.g., 2000" min="0">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalMacros" class="form-label">Macronutrient Goals</label>
                        <input type="text" class="form-control" id="goalMacros" placeholder="e.g., 150g Protein, 200g Carbs">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalMealType" class="form-label">Meal Type</label>
                        <select class="form-select" id="goalMealType">
                            <option value="">Select meal type</option>
                            <option value="breakfast">Breakfast</option>
                            <option value="lunch">Lunch</option>
                            <option value="dinner">Dinner</option>
                            <option value="snack">Snack</option>
                            <option value="daily">Daily Total</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalNutritionFocus" class="form-label">Nutrition Focus</label>
                        <input type="text" class="form-control" id="goalNutritionFocus" placeholder="e.g., High Protein, Low Carb">
                    </div>
                </div>
            `;
            break;

        case 'water':
            fieldsHTML = `
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalAmount" class="form-label">Water Amount <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="goalAmount" placeholder="e.g., 8 glasses, 2 liters" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalFrequency" class="form-label">Frequency</label>
                        <select class="form-select" id="goalFrequency">
                            <option value="">Select frequency</option>
                            <option value="daily">Daily Total</option>
                            <option value="hourly">Hourly Reminder</option>
                            <option value="meal">With Each Meal</option>
                        </select>
                    </div>
                </div>
                <div class="col-12">
                    <div class="mb-3">
                        <label for="goalHydrationTip" class="form-label">Hydration Reminder</label>
                        <input type="text" class="form-control" id="goalHydrationTip" placeholder="e.g., Drink 1 glass every hour">
                    </div>
                </div>
            `;
            break;

        case 'sleep':
            fieldsHTML = `
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalDuration" class="form-label">Sleep Duration <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="goalDuration" placeholder="e.g., 8 hours, 7-9 hours" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalBedtime" class="form-label">Target Bedtime</label>
                        <input type="time" class="form-control" id="goalBedtime" placeholder="e.g., 22:30">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalWakeTime" class="form-label">Target Wake Time</label>
                        <input type="time" class="form-control" id="goalWakeTime" placeholder="e.g., 06:30">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalSleepQuality" class="form-label">Sleep Quality Focus</label>
                        <select class="form-select" id="goalSleepQuality">
                            <option value="">Select focus</option>
                            <option value="duration">Sleep Duration</option>
                            <option value="consistency">Sleep Consistency</option>
                            <option value="quality">Sleep Quality</option>
                        </select>
                    </div>
                </div>
            `;
            break;

        case 'meditation':
            fieldsHTML = `
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalDuration" class="form-label">Duration <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="goalDuration" placeholder="e.g., 10 minutes, 20 minutes" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalMeditationType" class="form-label">Meditation Type</label>
                        <select class="form-select" id="goalMeditationType">
                            <option value="">Select type</option>
                            <option value="mindfulness">Mindfulness</option>
                            <option value="transcendental">Transcendental</option>
                            <option value="guided">Guided Meditation</option>
                            <option value="breathing">Breathing Exercises</option>
                            <option value="body-scan">Body Scan</option>
                            <option value="loving-kindness">Loving Kindness</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalFocus" class="form-label">Focus Area</label>
                        <input type="text" class="form-control" id="goalFocus" placeholder="e.g., Stress relief, Focus, Sleep">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalFrequency" class="form-label">Frequency</label>
                        <select class="form-select" id="goalFrequency">
                            <option value="">Select frequency</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="multiple">Multiple times daily</option>
                        </select>
                    </div>
                </div>
            `;
            break;

        case 'weight':
            fieldsHTML = `
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalWeightTarget" class="form-label">Weight Target (kg)</label>
                        <input type="number" class="form-control" id="goalWeightTarget" placeholder="e.g., 70.0" step="0.1" min="0">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalWeightType" class="form-label">Goal Type <span class="text-danger">*</span></label>
                        <select class="form-select" id="goalWeightType" required>
                            <option value="">Select goal type</option>
                            <option value="lose">Lose Weight</option>
                            <option value="gain">Gain Weight</option>
                            <option value="maintain">Maintain Weight</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalWeeklyChange" class="form-label">Weekly Change Target</label>
                        <input type="text" class="form-control" id="goalWeeklyChange" placeholder="e.g., 0.5kg loss, 0.2kg gain">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalMeasurement" class="form-label">Measurement Frequency</label>
                        <select class="form-select" id="goalMeasurement">
                            <option value="">Select frequency</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                </div>
            `;
            break;

        default:
            fieldsHTML = `
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalDuration" class="form-label">Duration / Amount</label>
                        <input type="text" class="form-control" id="goalDuration" placeholder="e.g., 30 minutes, 10 reps, 5km">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="goalCalories" class="form-label">Calories to Burn/Consume</label>
                        <input type="number" class="form-control" id="goalCalories" placeholder="e.g., 300" min="0">
                    </div>
                </div>
            `;
    }

    dynamicFieldsContainer.innerHTML = fieldsHTML;
}

function getCategorySpecificData(category) {
    const data = {};

    // Get values from dynamic fields
    const fields = [
        'goalDuration', 'goalDistance', 'goalCalories', 'goalIntensity', 'goalSets',
        'goalWeight', 'goalMuscleGroups', 'goalYogaType', 'goalDifficulty', 'goalFocus',
        'goalSteps', 'goalTerrain', 'goalStroke', 'goalSportType', 'goalMacros',
        'goalMealType', 'goalNutritionFocus', 'goalAmount', 'goalFrequency',
        'goalHydrationTip', 'goalBedtime', 'goalWakeTime', 'goalSleepQuality',
        'goalMeditationType', 'goalWeightTarget', 'goalWeightType', 'goalWeeklyChange',
        'goalMeasurement'
    ];

    fields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element && element.value.trim()) {
            const key = fieldId.replace('goal', '').toLowerCase();
            data[key] = element.value.trim();
        }
    });

    return data;
}

function populateFormWithGoal(goal) {
    const form = document.getElementById('addGoalForm');
    const modal = document.getElementById('addGoalModal');
    const modalTitle = document.getElementById('addGoalModalTitle');

    document.getElementById('goalTitle').value = goal.title || '';
    document.getElementById('goalCategory').value = goal.category || '';
    document.getElementById('goalDate').value = goal.date || goal.goalDate || getDateKey(new Date());
    document.getElementById('goalTime').value = goal.time || '';
    document.getElementById('goalNotes').value = goal.notes || '';
    document.getElementById('recurringGoal').checked = goal.recurring || false;
    document.getElementById('reminderEnabled').checked = goal.reminderEnabled || false;

    // Populate category-specific fields
    const categoryFields = [
        'duration', 'distance', 'calories', 'intensity', 'sets', 'weight', 'musclegroups',
        'yogatType', 'difficulty', 'focus', 'steps', 'terrain', 'stroke', 'sporttype',
        'macros', 'mealtype', 'nutritionfocus', 'amount', 'frequency', 'hydrationtip',
        'bedtime', 'waketime', 'sleepquality', 'meditationtype', 'weighttarget',
        'weighttype', 'weeklychange', 'measurement'
    ];

    categoryFields.forEach(field => {
        const element = document.getElementById(`goal${field.charAt(0).toUpperCase() + field.slice(1)}`);
        if (element && goal[field]) {
            element.value = goal[field];
        }
    });

    // Update dynamic fields for the selected category
    updateDynamicFields();

    form.dataset.editingId = goal.id;
    modalTitle.innerHTML = '<i class="bi bi-pencil"></i> Edit Fitness Goal';

    if (modal) {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

// ========================================
// UI Event Listeners
// ========================================

function attachUIListeners() {
    // Date navigation
    document.getElementById('prevDayBtn')?.addEventListener('click', goToPreviousDay);
    document.getElementById('nextDayBtn')?.addEventListener('click', goToNextDay);
    document.getElementById('todayBtn')?.addEventListener('click', goToToday);

    // Add goal button
    document.getElementById('addGoalBtn')?.addEventListener('click', () => {
        const form = document.getElementById('addGoalForm');
        if (form) {
            form.reset();
            form.dataset.editingId = '';
            document.getElementById('goalDate').value = getDateKey(new Date());
        }
    });

    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.className = newTheme === 'dark' ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.className = savedTheme === 'dark' ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
    }
}

// ========================================
// Toast Notifications
// ========================================

function showToast(message, type = 'info') {
    const toastContainer = document.body;
    const toastHTML = document.createElement('div');
    toastHTML.className = `toast ${type}`;
    toastHTML.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 9999;
        max-width: 400px;
        animation: slideInUp 0.3s ease-out;
    `;
    toastHTML.textContent = message;
    toastContainer.appendChild(toastHTML);

    setTimeout(() => {
        toastHTML.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => toastHTML.remove(), 300);
    }, 3000);
}

// ========================================
// Authentication
// ========================================

function initAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authButtons = document.getElementById('authButtons');
    const userProfile = document.getElementById('userProfile');
    const userEmail = document.getElementById('userEmail');
    const authModal = document.getElementById('authModal');

    if (loginBtn) loginBtn.addEventListener('click', () => {
        const modal = new bootstrap.Modal(authModal);
        modal.show();
    });

    if (signupBtn) signupBtn.addEventListener('click', () => {
        const modal = new bootstrap.Modal(authModal);
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
        modal.show();
    });

    if (logoutBtn) logoutBtn.addEventListener('click', signOutUser);

    // Form switches
    document.getElementById('showSignupForm')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
    });

    document.getElementById('showLoginForm')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
    });

    // Auth form submissions
    document.getElementById('loginForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        signInUser(email, password);
    });

    document.getElementById('signupForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;

        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        signUpUser(email, password);
    });

    document.getElementById('googleSignInBtn')?.addEventListener('click', signInWithGoogle);
    document.getElementById('googleSignUpBtn')?.addEventListener('click', signInWithGoogle);

    // Listen to auth state changes
    onAuthStateChange((user) => {
        if (user) {
            currentUser = user;
            if (authButtons) authButtons.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';
            if (userEmail) userEmail.textContent = user.email || 'User';

            // Initialize Firebase listeners
            initFirebaseListeners();
        } else {
            currentUser = null;
            completedGoals.clear();
            fitnessGoals = {};
            if (authButtons) authButtons.style.display = 'flex';
            if (userProfile) userProfile.style.display = 'none';
            renderEmptyState(document.getElementById('fitnessGoalsListContainer'));
            showToast('Please sign in to manage fitness goals', 'warning');
        }
    });
}

// ========================================
// Initialization
// ========================================

async function initialize() {
    if (isInitialized) return;

    // Initialize theme
    initTheme();

    // Initialize UI listeners
    attachUIListeners();

    // Initialize auth UI
    initAuthUI();

    // Update date display
    updateDateDisplay();

    // Initialize empty state
    const container = document.getElementById('fitnessGoalsListContainer');
    if (container) {
        renderEmptyState(container);
    }

    // Wait for auth to be ready
    await waitForAuthReady();

    // Initialize add goal form (after auth ready)
    initAddGoalForm();

    isInitialized = true;
}

// ========================================
// Bootstrap
// ========================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Export for testing
export { getDateKey, getTotalGoalsForDate, showToast };
