// Student Dashboard JavaScript - FIXED VERSION

// Global variables
let currentClassId = null;
let enrolledClasses = [];
let assignments = [];
let submissions = [];
let calendarEvents = {};
let notifications = [];

// Get student data from backend
let studentData = {
  id: null,
  student_id: null,
  name: null
};


// DOM Elements
const sidebar = document.getElementById('sidebar');
const contentSections = document.querySelectorAll('.content-section');
const navLinks = document.querySelectorAll('.sidebar nav a');
const profileDropdown = document.getElementById('profile-dropdown');
const dropdownMenu = document.getElementById('dropdown-menu');

// ✅ Storage quota warning system
function checkStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(estimate => {
            const percentUsed = (estimate.usage / estimate.quota) * 100;
            console.log(`📊 Storage: ${(estimate.usage / 1024 / 1024).toFixed(2)}MB / ${(estimate.quota / 1024 / 1024).toFixed(2)}MB (${percentUsed.toFixed(1)}%)`);
            
            if (percentUsed > 90) {
                // ✅ OFFER TO CLEAR CACHE
                clearLocalStorageCache();
            }
        });
    }
}

// Check on page load
checkStorageQuota();

// Check every 5 minutes
setInterval(checkStorageQuota, 300000);

// Sidebar toggle
function toggleSidebar() {
  sidebar.classList.toggle('collapsed');
}

// ✅ FIX #2: Load notifications from localStorage
function loadNotifications() {
  const userType = 'student';
  const saved = localStorage.getItem(`${userType}_notifications`);
  if (saved) {
    try {
      notifications = JSON.parse(saved);
      updateNotificationBadge();
    } catch (e) {
      console.error('Error loading notifications:', e);
      notifications = [];
    }
  }
}

// ✅ FIX #2: Save notifications to localStorage
function saveNotifications() {
  const userType = 'student';
  localStorage.setItem(`${userType}_notifications`, JSON.stringify(notifications));
  updateNotificationBadge();
}

// ✅ FIX #2: Add a new notification with settings check
function addNotification(type, title, message, link = null) {
  const settings = getNotificationSettings();
  
  const typeToSetting = {
    'assignment': 'assignments',
    'grade': 'grades',
    'material': 'materials',
    'deadline': 'deadlines',
    'feedback': 'grades',
    'enrollment': 'assignments'
  };
  
  const settingKey = typeToSetting[type];
  if (settingKey && !settings[settingKey]) {
    console.log(`🔕 Notification blocked by settings: ${type}`);
    return;
  }
  
  const notification = {
    id: Date.now().toString(),
    type: type,
    title: title,
    message: message,
    link: link,
    timestamp: new Date().toISOString(),
    read: false
  };
  
  notifications.unshift(notification);
  
  if (notifications.length > 50) {
    notifications = notifications.slice(0, 50);
  }
  
  saveNotifications();
  
  if (settings[settingKey] && "Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(title, {
        body: message,
        icon: '/images/logo.png',
        badge: '/images/logo.png'
      });
    }
  }
}

// ✅ FIX #2: Get notification settings
function getNotificationSettings() {
  const saved = localStorage.getItem('student_notification_settings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading notification settings:', e);
    }
  }
  return {
    assignments: true,
    grades: true,
    materials: true,
    deadlines: true
  };
}

// ✅ FIX #2: Update notification badge
function updateNotificationBadge() {
  const badge = document.querySelector('.notification-badge');
  if (badge) {
    const unreadCount = notifications.filter(n => !n.read).length;
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
  }
}

// Mark notification as read
function markNotificationRead(notificationId) {
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    saveNotifications();
  }
}

// Mark all as read
function markAllNotificationsRead() {
  notifications.forEach(n => n.read = true);
  saveNotifications();
}

// Clear all notifications
function clearAllNotifications() {
  if (confirm('⚠️ Are you sure you want to clear all notifications?')) {
    notifications = [];
    saveNotifications();
    closeNotificationPanel();
  }
}

// ✅ FIX #2: Show notification panel
function showNotificationPanel() {
  const existingPanel = document.getElementById('notification-panel');
  if (existingPanel) {
    existingPanel.remove();
    return;
  }
  
  const panel = document.createElement('div');
  panel.id = 'notification-panel';
  panel.style.cssText = `
    position: fixed;
    top: 70px;
    right: 20px;
    width: 400px;
    max-height: 600px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    z-index: 10000;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;
  
  let panelHTML = `
    <div style="padding: 1.5rem; border-bottom: 2px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center; background: #4a90a4; color: white;">
      <h3 style="margin: 0; font-size: 1.2rem;">
        <i class="fas fa-bell"></i> Notifications
      </h3>
      <div style="display: flex; gap: 0.5rem;">
        <button onclick="markAllNotificationsRead()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;" title="Mark all as read">
          <i class="fas fa-check-double"></i>
        </button>
        <button onclick="clearAllNotifications()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;" title="Clear all">
          <i class="fas fa-trash"></i>
        </button>
        <button onclick="closeNotificationPanel()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    <div style="overflow-y: auto; max-height: 500px;">
  `;
  
  if (notifications.length === 0) {
    panelHTML += `
      <div style="padding: 3rem; text-align: center; color: #666;">
        <i class="fas fa-bell-slash" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
        <p>No notifications</p>
      </div>
    `;
  } else {
    notifications.forEach(notification => {
      const iconMap = {
        'assignment': 'fa-tasks',
        'grade': 'fa-star',
        'material': 'fa-file-upload',
        'enrollment': 'fa-user-plus',
        'submission': 'fa-paper-plane',
        'deadline': 'fa-clock',
        'feedback': 'fa-comment'
      };
      
      const colorMap = {
        'assignment': '#4a90a4',
        'grade': '#28a745',
        'material': '#17a2b8',
        'enrollment': '#6c757d',
        'submission': '#ffc107',
        'deadline': '#dc3545',
        'feedback': '#fd7e14'
      };
      
      const icon = iconMap[notification.type] || 'fa-bell';
      const color = colorMap[notification.type] || '#4a90a4';
      const isUnread = !notification.read;
      
      panelHTML += `
        <div onclick="handleNotificationClick('${notification.id}', '${notification.link || ''}')" 
             style="padding: 1rem 1.5rem; border-bottom: 1px solid #f0f0f0; cursor: pointer; background: ${isUnread ? '#f8f9fa' : 'white'}; transition: all 0.2s ease;"
             onmouseover="this.style.background='#e8f4f8'"
             onmouseout="this.style.background='${isUnread ? '#f8f9fa' : 'white'}'">
          <div style="display: flex; gap: 1rem; align-items: start;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: ${color}20; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <i class="fas ${icon}" style="color: ${color}; font-size: 1.1rem;"></i>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.25rem;">
                <strong style="font-size: 0.95rem; color: #333;">${notification.title}</strong>
                ${isUnread ? '<span style="width: 8px; height: 8px; background: #4a90a4; border-radius: 50%; display: inline-block; margin-left: 0.5rem;"></span>' : ''}
              </div>
              <p style="margin: 0; color: #666; font-size: 0.85rem; line-height: 1.4;">${notification.message}</p>
              <span style="font-size: 0.75rem; color: #999; margin-top: 0.5rem; display: block;">
                ${formatNotificationTime(notification.timestamp)}
              </span>
            </div>
          </div>
        </div>
      `;
    });
  }
  
  panelHTML += `</div>`;
  panel.innerHTML = panelHTML;
  document.body.appendChild(panel);
  
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick);
  }, 100);
}

function handleOutsideClick(e) {
  const panel = document.getElementById('notification-panel');
  const notificationIcon = document.querySelector('.notification-icon');
  
  if (panel && !panel.contains(e.target) && !notificationIcon.contains(e.target)) {
    closeNotificationPanel();
  }
}

function closeNotificationPanel() {
  const panel = document.getElementById('notification-panel');
  if (panel) {
    panel.remove();
    document.removeEventListener('click', handleOutsideClick);
  }
}

function handleNotificationClick(notificationId, link) {
  markNotificationRead(notificationId);
  
  if (link) {
    if (link.startsWith('class:')) {
      const classId = link.replace('class:', '');
      openClass(classId);
    } else if (link.startsWith('section:')) {
      const sectionId = link.replace('section:', '');
      showSection(sectionId);
    }
  }
  
  closeNotificationPanel();
}

function formatNotificationTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

// ✅ FIX #3: Main Search Bar Functionality
function initializeMainSearch() {
  const searchInput = document.querySelector('.topbar .search-bar input');
  if (!searchInput) return;
  
  let searchTimeout = null;
  
  searchInput.addEventListener('input', function(e) {
    const query = e.target.value.trim().toLowerCase();
    
    // Clear existing results
    const existingResults = document.querySelector('.search-results-dropdown');
    if (existingResults) {
      existingResults.remove();
    }
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // If query is empty or less than 2 characters, don't search
    if (query.length < 2) {
      return;
    }
    
    searchTimeout = setTimeout(() => {
      performSearch(query, searchInput);
    }, 300);
  });
  
  // Close search results when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-bar')) {
      const searchResults = document.querySelector('.search-results-dropdown');
      if (searchResults) {
        searchResults.remove();
      }
    }
  });
  
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const searchResults = document.querySelector('.search-results-dropdown');
      if (searchResults) {
        const firstResult = searchResults.querySelector('.search-result-item');
        if (firstResult && firstResult.onclick) {
          firstResult.click();
        }
      }
    }
    
    // Close on Escape key
    if (e.key === 'Escape') {
      const searchResults = document.querySelector('.search-results-dropdown');
      if (searchResults) {
        searchResults.remove();
      }
      searchInput.blur();
    }
  });
}

function performSearch(query, inputElement) {
  const results = [];
  
  const professorClasses = localStorage.getItem('professor_classes');
  let profClasses = [];
  if (professorClasses) {
    try {
      profClasses = JSON.parse(professorClasses);
    } catch (e) {
      console.error('Error loading professor data:', e);
    }
  }
  
  enrolledClasses.forEach(classItem => {
    const matchingClass = profClasses.find(pc => pc.code === classItem.code);
    
    if (classItem.name.toLowerCase().includes(query) || 
        classItem.code.toLowerCase().includes(query) ||
        (classItem.description && classItem.description.toLowerCase().includes(query))) {
      results.push({
        type: 'class',
        title: classItem.name,
        subtitle: `Class • Code: ${classItem.code}`,
        description: classItem.description || '',
        icon: 'fa-book-open',
        color: '#4a90a4',
        action: () => openClass(classItem.id)
      });
    }
    
    const assignments = matchingClass && matchingClass.assignments ? 
                       matchingClass.assignments : (classItem.assignments || []);
    
    if (assignments) {
      assignments.forEach(assignment => {
        if (assignment.title.toLowerCase().includes(query) || 
            assignment.description.toLowerCase().includes(query) ||
            (assignment.instructions && assignment.instructions.toLowerCase().includes(query))) {
          
          const submission = assignment.submissions ? 
            assignment.submissions.find(s => String(s.studentId) === String(studentData.id)) : null;
          const isSubmitted = !!submission;
          const isOverdue = new Date(assignment.dueDate) < new Date() && !isSubmitted;
          
          results.push({
            type: 'assignment',
            title: assignment.title,
            subtitle: `Assignment • ${classItem.name}`,
            description: `Due: ${new Date(assignment.dueDate).toLocaleDateString()} • ${assignment.points} pts`,
            icon: isOverdue ? 'fa-exclamation-triangle' : (isSubmitted ? 'fa-check-circle' : 'fa-tasks'),
            color: isOverdue ? '#dc3545' : (isSubmitted ? '#28a745' : '#17a2b8'),
            action: () => {
              openClass(classItem.id);
              setTimeout(() => switchTab('assignments'), 300);
            }
          });
        }
      });
    }
    
    const materials = matchingClass && matchingClass.materials ? 
                     matchingClass.materials : (classItem.materials || []);
    
    if (materials) {
      materials.forEach(material => {
        if (material.title.toLowerCase().includes(query) || 
            material.description.toLowerCase().includes(query)) {
          results.push({
            type: 'material',
            title: material.title,
            subtitle: `Material • ${classItem.name}`,
            description: `Posted: ${new Date(material.date).toLocaleDateString()}`,
            icon: 'fa-file-alt',
            color: '#fd7e14',
            action: () => {
              openClass(classItem.id);
              setTimeout(() => switchTab('posts'), 300);
            }
          });
        }
      });
    }
  });
  
  if (results.length === 0) {
    results.push({
      type: 'empty',
      title: 'No results found',
      subtitle: `No matches for "${query}"`,
      description: 'Try different keywords or check spelling',
      icon: 'fa-search',
      color: '#999',
      action: null
    });
  }
  
  showSearchResults(results, inputElement, query);
}

function showSearchResults(results, inputElement, query) {
  const searchBar = inputElement.closest('.search-bar');
  
  const existingResults = searchBar.querySelector('.search-results-dropdown');
  if (existingResults) {
    existingResults.remove();
  }
  
  const resultsDiv = document.createElement('div');
  resultsDiv.className = 'search-results-dropdown';
  resultsDiv.style.cssText = `
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    max-height: 500px;
    overflow-y: auto;
    z-index: 1000;
    border: 1px solid #e0e0e0;
  `;
  
  const headerDiv = document.createElement('div');
  headerDiv.style.cssText = `
    padding: 1rem 1.25rem;
    border-bottom: 2px solid #f0f0f0;
    background: #f8f9fa;
    border-radius: 12px 12px 0 0;
    position: sticky;
    top: 0;
    z-index: 1;
  `;
  headerDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 600; color: #333;">
        ${results.length > 0 && results[0].type !== 'empty' ? `Found ${results.length} result${results.length > 1 ? 's' : ''}` : 'No results'}
      </span>
      <span style="font-size: 0.85rem; color: #666;">
        <kbd style="padding: 0.25rem 0.5rem; background: white; border: 1px solid #ddd; border-radius: 4px; font-size: 0.75rem;">Enter</kbd> to select
      </span>
    </div>
  `;
  resultsDiv.appendChild(headerDiv);
  
  results.slice(0, 15).forEach((result, index) => {
    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item';
    resultItem.style.cssText = `
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f0f0f0;
      cursor: ${result.action ? 'pointer' : 'default'};
      transition: all 0.2s;
      display: flex;
      align-items: start;
      gap: 1rem;
    `;
    
    const highlightText = (text) => {
      const regex = new RegExp(`(${query})`, 'gi');
      return text.replace(regex, '<mark style="background: #fff3cd; padding: 0 2px; border-radius: 2px;">$1</mark>');
    };
    
    resultItem.innerHTML = `
      <div style="width: 48px; height: 48px; border-radius: 12px; background: ${result.color}15; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <i class="fas ${result.icon}" style="color: ${result.color}; font-size: 1.3rem;"></i>
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; color: #333; font-size: 0.95rem; margin-bottom: 0.25rem;">
          ${highlightText(result.title)}
        </div>
        <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.25rem;">
          ${result.subtitle}
        </div>
        ${result.description ? `
          <div style="font-size: 0.8rem; color: #999;">
            ${result.description}
          </div>
        ` : ''}
      </div>
      ${result.action ? `
        <div style="display: flex; align-items: center; color: #cbd5e0;">
          <i class="fas fa-chevron-right"></i>
        </div>
      ` : ''}
    `;
    
    if (result.action) {
      resultItem.addEventListener('mouseover', () => {
        resultItem.style.background = '#f8f9fa';
        resultItem.style.transform = 'translateX(4px)';
      });
      
      resultItem.addEventListener('mouseout', () => {
        resultItem.style.background = 'white';
        resultItem.style.transform = 'translateX(0)';
      });
      
      resultItem.addEventListener('click', () => {
        result.action();
        resultsDiv.remove();
        inputElement.value = '';
        inputElement.blur();
      });
    }
    
    resultsDiv.appendChild(resultItem);
  });
  
  searchBar.style.position = 'relative';
  searchBar.appendChild(resultsDiv);
}


// Show section function
function showSection(sectionId, element = null) {
  contentSections.forEach(section => {
    section.classList.remove('active');
  });

  if (element) {
    navLinks.forEach(link => {
      link.classList.remove('active');
    });
    element.classList.add('active');
  }

  document.getElementById(sectionId).classList.add('active');
  
  if (sectionId === 'assignments-section') {
    loadAllAssignments();
  } else if (sectionId === 'archived-classes-section') {
    // ✅ FIX: Load archived classes
    loadArchivedClasses();
  } else if (sectionId === 'missed-tasks-section') {
    loadMissedTasks();
  }
}

// Profile dropdown toggle
if (profileDropdown) {
  profileDropdown.addEventListener('click', function(e) {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });
}

// Close dropdown when clicking outside
document.addEventListener('click', function() {
  dropdownMenu.classList.remove('show');
});

document.addEventListener('DOMContentLoaded', async function() {
  loadNotifications();
  
  const notificationIcon = document.querySelector('.notification-icon');
  if (notificationIcon) {
    notificationIcon.addEventListener('click', function(e) {
      e.stopPropagation();
      showNotificationPanel();
    });
  }
  
  initializeMainSearch();
  await fetchStudentProfile();
  updateDashboardStats();
  await loadEnrolledClasses();
  initializeCalendar();

  // Event listeners
  document.getElementById('join-class-btn').addEventListener('click', showJoinClassModal);
  document.getElementById('cancel-join-class').addEventListener('click', hideJoinClassModal);
  document.getElementById('join-class').addEventListener('click', joinClass);

  // ✅ FIX: Close submission modal button
  const closeSubmissionModal = document.getElementById('close-submission-modal');
  if (closeSubmissionModal) {
    closeSubmissionModal.addEventListener('click', function() {
      const modal = document.getElementById('submission-modal');
      if (modal) {
        modal.style.display = 'none';
        document.getElementById('submission-text').value = '';
        document.getElementById('submission-files').value = '';
        document.getElementById('submission-files-chosen').textContent = 'No files selected';
        
        // Clear modal data
        modal.dataset.assignmentId = '';
        modal.dataset.classId = '';
        modal.dataset.isResubmit = '';
        modal.dataset.previousSubmitDate = '';
      }
    });
  }

  // ✅ FIX: Properly attach submit button listener
  const submitBtn = document.getElementById('submit-assignment');
  if (submitBtn) {
    // Remove any existing listeners by cloning
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
    
    // Add fresh listener
    newSubmitBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('🔵 Submit button clicked');
      
      if (this.disabled) {
        console.log('⚠️ Button already disabled');
        return;
      }
      
      // Call the submit function
      await submitAssignment();
    });
    
    console.log('✅ Submit button listener attached');
  } else {
    console.error('❌ Submit button not found in DOM');
  }
  
  // ✅ FIX: File input display
  const submissionFiles = document.getElementById('submission-files');
  if (submissionFiles) {
    submissionFiles.addEventListener('change', function() {
      const fileChosen = document.getElementById('submission-files-chosen');
      if (this.files.length > 0) {
        fileChosen.textContent = `${this.files.length} file(s) selected`;
      } else {
        fileChosen.textContent = 'No files selected';
      }
    });
  }

// ✅ REPLACE THIS ENTIRE SECTION
const avatarUpload = document.getElementById('avatar-upload');
const profileAvatar = document.getElementById('profile-avatar');
const topbarAvatar = document.getElementById('topbar-avatar');

const userType = 'student';

// ✅ Load avatar from database on page load
async function loadAvatarFromDatabase() {
  try {
    const response = await fetch(`/api/profile/avatar/${userType}/${studentData.id}`);
    if (response.ok) {
      const data = await response.json();
      if (data.avatar && profileAvatar && topbarAvatar) {
        profileAvatar.src = data.avatar;
        topbarAvatar.src = data.avatar;
        localStorage.setItem(`${userType}_avatar`, data.avatar);
      }
    }
  } catch (e) {
    console.error('Error loading avatar:', e);
  }
}

// Load avatar when page loads
if (studentData && studentData.id) {
  loadAvatarFromDatabase();
}

// Load from localStorage as fallback (instant display while fetching from DB)
 const savedAvatar = localStorage.getItem(`${userType}_avatar`);
  if (savedAvatar && profileAvatar && topbarAvatar) {
    profileAvatar.src = savedAvatar;
    topbarAvatar.src = savedAvatar;
  }

if (avatarUpload && profileAvatar && topbarAvatar) {
  const newAvatarUpload = avatarUpload.cloneNode(true);
  avatarUpload.parentNode.replaceChild(newAvatarUpload, avatarUpload);
  
  newAvatarUpload.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, GIF)');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
      const avatarData = e.target.result;
      
      // Update UI immediately
      profileAvatar.src = avatarData;
      topbarAvatar.src = avatarData;
      
      try {
        // ✅ FIX: Save to database
        const response = await fetch('/api/profile/update-avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: avatarData })
        });
        
        if (!response.ok) {
          throw new Error('Failed to save avatar');
        }
        
        // ✅ Save to localStorage with user-specific key
        const userKey = `avatar_student_${studentData.id}`;
        localStorage.setItem(userKey, avatarData);
        localStorage.setItem('student_avatar', avatarData); // Fallback
        
        showSuccessToast('Profile Picture Updated!', 'Your avatar has been saved');
        
      } catch (error) {
        console.error('Error saving avatar:', error);
        alert('Error saving avatar: ' + error.message);
      }
    };
    
    reader.readAsDataURL(file);
  });
}
  
  // Settings tabs
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      
      document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
      
      this.classList.add('active');
      document.getElementById(`${tabName}-settings`).classList.add('active');
    });
  });
  
  // Password update
  document.getElementById('settings-update-password')?.addEventListener('click', async function() {
    const currentPassword = document.getElementById('settings-current-password').value.trim();
    const newPassword = document.getElementById('settings-new-password').value.trim();
    const confirmPassword = document.getElementById('settings-confirm-password').value.trim();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }
    
    if (newPassword.length < 8) {
      alert('New password must be at least 8 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    
    try {
      this.disabled = true;
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
      
      const response = await fetch('/api/profile/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // ✅ Show success toast
        showSuccessToast('Password Updated!', 'Your password has been changed successfully');
        
        document.getElementById('settings-current-password').value = '';
        document.getElementById('settings-new-password').value = '';
        document.getElementById('settings-confirm-password').value = '';
      } else {
        alert('❌ ' + (result.error || 'Failed to update password'));
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      this.disabled = false;
      this.innerHTML = 'Update Password';
    }
  });
  
  document.getElementById('save-notification-settings')?.addEventListener('click', function() {
    const settings = {
      assignments: document.getElementById('notif-assignments').checked,
      grades: document.getElementById('notif-grades').checked,
      materials: document.getElementById('notif-materials').checked,
      deadlines: document.getElementById('notif-deadlines').checked
    };
    
    localStorage.setItem('student_notification_settings', JSON.stringify(settings));
    
    // ✅ Show success toast
    showSuccessToast('Settings Saved!', 'Notification preferences updated');
  });
  
  document.getElementById('save-privacy-settings')?.addEventListener('click', function() {
    const settings = {
      profileVisible: document.getElementById('privacy-profile').checked,
      emailVisible: document.getElementById('privacy-email').checked
    };
    
    localStorage.setItem('student_privacy_settings', JSON.stringify(settings));
    
    // ✅ Show success toast
    showSuccessToast('Settings Saved!', 'Privacy settings updated');
  });
  
  document.getElementById('clear-all-data')?.addEventListener('click', function() {
    if (confirm('⚠️ This will clear ALL your data. Continue?')) {
      if (confirm('⚠️ FINAL WARNING: This cannot be undone!')) {
        localStorage.removeItem('student_classes');
        localStorage.removeItem('student_notifications');
        localStorage.removeItem('student_avatar');
        localStorage.removeItem('student_notification_settings');
        localStorage.removeItem('student_privacy_settings');
        
        alert('✅ All data cleared. Reloading...');
        window.location.reload();
      }
    }
  });
  
  loadSavedSettings();
  
  document.getElementById('back-to-classes').addEventListener('click', () => {
    const classView = document.getElementById('class-view');
    classView.classList.add('hidden');
    classView.classList.remove('active');
    document.getElementById('classes-section').classList.add('active');
  });
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
  
  document.getElementById('assignment-filter')?.addEventListener('change', function() {
    filterAssignments(this.value);
  });
  
  document.getElementById('grade-filter')?.addEventListener('change', function() {
    filterGrades(this.value);
  });
});

function showSuccessToast(title, message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
    padding: 1.25rem 1.5rem;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(40, 167, 69, 0.3);
    z-index: 10000;
    animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 320px;
    max-width: 400px;
  `;
  
  toast.innerHTML = `
    <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
      <i class="fas fa-check-circle" style="font-size: 1.75rem;"></i>
    </div>
    <div style="flex: 1;">
      <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 0.25rem;">${title}</div>
      <div style="font-size: 0.9rem; opacity: 0.95; line-height: 1.4;">${message}</div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// REPLACE the filterGrades function with this:
function filterGrades(classId) {
  const gradesContainer = document.getElementById('grades-details');
  if (!gradesContainer) return;
  
  gradesContainer.innerHTML = '';
  
  // ✅ REPLACE WITH THIS:
  const filteredClasses = classId === 'all' ? 
    enrolledClasses : 
    enrolledClasses.filter(c => String(c.id) === String(classId));
  
  if (filteredClasses.length === 0) {
    gradesContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-chart-line"></i>
        <h3>No Grades Available</h3>
        <p>Grades will appear here once assignments are graded</p>
      </div>
    `;
    return;
  }
  
  filteredClasses.forEach(classItem => {
    // ✅ Load fresh data
    const professorClasses = localStorage.getItem('professor_classes');
    if (professorClasses) {
      try {
        const profClasses = JSON.parse(professorClasses);
        const matchingClass = profClasses.find(pc => pc.code === classItem.code);
        if (matchingClass && matchingClass.assignments) {
          classItem.assignments = matchingClass.assignments;
        }
      } catch (e) {
        console.error('Error loading professor data:', e);
      }
    }
    
    if (!classItem.assignments || classItem.assignments.length === 0) return;
    
    const classCard = document.createElement('div');
    classCard.className = 'class-grade-card';
    classCard.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    
    let gradesHTML = `
      <h3 style="margin-bottom: 1rem; color: #4a90a4;">
        <i class="fas fa-book"></i> ${classItem.name}
      </h3>
      <div class="grades-table" style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #e0e0e0;">Assignment</th>
              <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #e0e0e0;">Due Date</th>
              <th style="padding: 0.75rem; text-align: center; border-bottom: 2px solid #e0e0e0;">Points</th>
              <th style="padding: 0.75rem; text-align: center; border-bottom: 2px solid #e0e0e0;">Your Grade</th>
              <th style="padding: 0.75rem; text-align: center; border-bottom: 2px solid #e0e0e0;">Status</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    let totalEarned = 0;
    let totalPossible = 0;
    let gradedCount = 0;
    
    classItem.assignments.forEach(assignment => {
      const submission = assignment.submissions ? 
        assignment.submissions.find(s => String(s.studentId) === String(studentData.id)) : null;
      
      const isSubmitted = !!submission;
      const isGraded = isSubmitted && submission.grade !== undefined && submission.grade !== null;
      
      if (isGraded) {
        totalEarned += submission.grade;
        totalPossible += assignment.points;
        gradedCount++;
      }
      
      let statusClass = 'pending';
      let statusText = 'Not Submitted';
      if (isGraded) {
        statusClass = 'graded';
        statusText = 'Graded';
      } else if (isSubmitted) {
        statusClass = 'submitted';
        statusText = 'Submitted';
      }
      
      gradesHTML += `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 0.75rem; word-wrap: break-word; max-width: 200px;">${assignment.title}</td>
          <td style="padding: 0.75rem; white-space: nowrap;">${new Date(assignment.dueDate).toLocaleDateString()}</td>
          <td style="padding: 0.75rem; text-align: center;">${assignment.points}</td>
          <td style="padding: 0.75rem; text-align: center; font-weight: 600;">${isGraded ? `${submission.grade}/${assignment.points}` : '-'}</td>
          <td style="padding: 0.75rem; text-align: center;">
            <span class="status ${statusClass}" style="padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
              ${statusText}
            </span>
          </td>
        </tr>
      `;
    });
    
    gradesHTML += `
          </tbody>
        </table>
      </div>
    `;
    
    // ✅ FIX: Only show average if there are graded assignments
    if (gradedCount > 0 && totalPossible > 0) {
      const classAverage = (totalEarned / totalPossible * 100).toFixed(2);
      gradesHTML = `
        <div class="class-average" style="margin-bottom: 1rem; padding: 1rem; background: #e8f4f8; border-radius: 8px;">
          <h4 style="margin: 0; color: #4a90a4;">Class Average: ${classAverage}%</h4>
          <p style="margin: 0.5rem 0 0 0; color: #666;">${gradedCount} assignment(s) graded out of ${classItem.assignments.length}</p>
        </div>
      ` + gradesHTML;
    }
    
    classCard.innerHTML = gradesHTML;
    gradesContainer.appendChild(classCard);
  });
}

// ADD this event listener in DOMContentLoaded:
document.getElementById('grade-filter')?.addEventListener('change', function() {
  filterGrades(this.value);
});

function loadSavedSettings() {
  const userType = 'student';
  
  const notifSettings = localStorage.getItem(`${userType}_notification_settings`);
  if (notifSettings) {
    try {
      const settings = JSON.parse(notifSettings);
      document.getElementById('notif-assignments').checked = settings.assignments !== false;
      document.getElementById('notif-grades').checked = settings.grades !== false;
      document.getElementById('notif-materials').checked = settings.materials !== false;
      document.getElementById('notif-deadlines').checked = settings.deadlines !== false;
    } catch (e) {
      console.error('Error loading notification settings:', e);
    }
  }
  
  const privacySettings = localStorage.getItem(`${userType}_privacy_settings`);
  if (privacySettings) {
    try {
      const settings = JSON.parse(privacySettings);
      document.getElementById('privacy-profile').checked = settings.profileVisible !== false;
      document.getElementById('privacy-email').checked = settings.emailVisible === true;
    } catch (e) {
      console.error('Error loading privacy settings:', e);
    }
  }
}

async function fetchStudentProfile() {
  try {
    const response = await fetch('/api/profile');
    if (response.ok) {
      const profile = await response.json();
      studentData = {
        id: String(profile.id),
        student_id: profile.student_id,
        name: `${profile.first_name} ${profile.last_name}`
      };
      console.log('✅ Student data loaded:', studentData);
    } else {
      console.error('❌ Failed to load profile:', response.status);
      const sessionData = document.body.dataset.studentData;
      if (sessionData) {
        studentData = JSON.parse(sessionData);
        console.log('✅ Using session student data:', studentData);
      }
    }
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
  }
}

function renderArchivedClassList(archivedClasses) {
  const archivedSection = document.getElementById('archived-classes-section');
  if (!archivedSection) return;
  
  const archivedList = archivedSection.querySelector('.archived-classes-list') || 
                       document.createElement('div');
  archivedList.className = 'archived-classes-list';
  archivedList.innerHTML = '';
  
  if (archivedClasses.length === 0) {
    archivedList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-archive"></i>
        <h3>No Archived Classes</h3>
        <p>Archived classes will appear here when professors archive them</p>
      </div>
    `;
  } else {
    archivedClasses.forEach(classItem => {
      // ✅ FIX: Calculate pending and missed assignments for archived classes
      const now = new Date();
      let pendingAssignments = 0;
      let missedAssignments = 0;

      if (classItem.assignments) {
        classItem.assignments.forEach(a => {
          const submission = a.submissions ? 
            a.submissions.find(s => String(s.studentId) === String(studentData.id)) : null;
          const dueDate = new Date(a.dueDate);
          
          if (!submission) {
            if (dueDate < now) {
              missedAssignments++;
            } else {
              pendingAssignments++;
            }
          }
        });
      }
      
      const classCard = document.createElement('div');
      classCard.className = 'class-card archived';
      classCard.innerHTML = `
        <div class="class-card-header">
          <h3>${classItem.name}</h3>
          <span class="class-code">${classItem.code}</span>
        </div>
        <p class="class-description">${classItem.description || 'No description provided'}</p>
        <div class="class-stats">
          <span><i class="fas fa-user-tie"></i> ${classItem.professor_name || 'Professor'}</span>
          <span><i class="fas fa-file-alt"></i> ${classItem.materials ? classItem.materials.length : 0} Materials</span>
          <span><i class="fas fa-tasks"></i> ${classItem.assignments ? classItem.assignments.length : 0} Assignments</span>
          <span style="color: #6c757d;"><i class="fas fa-archive"></i> Archived</span>
        </div>
        <div class="class-actions">
          <button class="btn-secondary" onclick="openClass('${classItem.id}', true)">
            <i class="fas fa-eye"></i> View (Read-only)
          </button>
        </div>
      `;
      archivedList.appendChild(classCard);
    });
  }
  
  if (!archivedSection.contains(archivedList)) {
    archivedSection.appendChild(archivedList);
  }
}

async function loadEnrolledClasses() {
    try {
        const response = await fetch('/api/professor/classes?archived=false');
        if (response.ok) {
            enrolledClasses = await response.json();
            
            // ✅ FIX: Load materials and assignments for each enrolled class
            for (let classItem of enrolledClasses) {
                // Load materials from database
                try {
                    const materialsResponse = await fetch(`/api/professor/classes/${classItem.id}/materials`);
                    if (materialsResponse.ok) {
                        classItem.materials = await materialsResponse.json();
                    } else {
                        classItem.materials = [];
                    }
                } catch (e) {
                    console.error('Error loading materials:', e);
                    classItem.materials = [];
                }
                
                // Load assignments from database
                try {
                    const assignmentsResponse = await fetch(`/api/professor/classes/${classItem.id}/assignments`);
                    if (assignmentsResponse.ok) {
                        classItem.assignments = await assignmentsResponse.json();
                    } else {
                        classItem.assignments = [];
                    }
                } catch (e) {
                    console.error('Error loading assignments:', e);
                    classItem.assignments = [];
                }
            }
            
            console.log('✅ Loaded enrolled classes:', enrolledClasses.length);
            
            renderClassList();
            updateGradeFilter();
            loadAllAssignments();
            
            // ✅ FIX: Force stats update after loading
            setTimeout(() => {
                calculateDashboardStats();
                updateDashboardStats();
            }, 100);
            
            checkForNewAssignments();
            checkUpcomingDeadlines();
        } else {
            console.error('Failed to load classes:', response.status);
        }
    } catch (error) {
        console.error('Error loading classes:', error);
    }
}

// ✅ ADD: Force reload after critical operations
async function forceReloadClassData() {
  try {
    const response = await fetch('/api/professor/classes');
    if (response.ok) {
      classes = await response.json();
      
      for (let classItem of classes) {
        await loadClassDataFromDatabase(classItem);
      }
      
      console.log('✅ Class data reloaded from database');
      return true;
    }
  } catch (error) {
    console.error('❌ Error reloading class data:', error);
    return false;
  }
}

// ✅ FIX #2: Check for new assignments and notify
function checkForNewAssignments() {
  const lastCheck = localStorage.getItem('student_last_assignment_check');
  const lastCheckTime = lastCheck ? new Date(lastCheck) : new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  const now = new Date();
  
  let newAssignments = 0;
  let newMaterials = 0;
  const notifiedItems = new Set(JSON.parse(localStorage.getItem('student_notified_items') || '[]'));
  
  enrolledClasses.forEach(classItem => {
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const assignmentDate = new Date(assignment.dateCreated || assignment.dueDate);
        const notificationKey = `assignment-${assignment.id}`;
        
        if (assignmentDate > lastCheckTime && !notifiedItems.has(notificationKey)) {
          newAssignments++;
          notifiedItems.add(notificationKey);
          
          addNotification(
            'assignment',
            'New Assignment Posted',
            `"${assignment.title}" in ${classItem.name}`,
            `class:${classItem.id}`
          );
        }
      });
    }
    
    if (classItem.materials) {
      classItem.materials.forEach(material => {
        const materialDate = new Date(material.date);
        const notificationKey = `material-${material.id}`;
        
        if (materialDate > lastCheckTime && !notifiedItems.has(notificationKey)) {
          newMaterials++;
          notifiedItems.add(notificationKey);
          
          addNotification(
            'material',
            'New Material Uploaded',
            `"${material.title}" in ${classItem.name}`,
            `class:${classItem.id}`
          );
        }
      });
    }
  });
  
  localStorage.setItem('student_notified_items', JSON.stringify([...notifiedItems]));
  localStorage.setItem('student_last_assignment_check', now.toISOString());
}

// âœ… FIX #2: Check for upcoming deadlines with accurate countdown
function checkUpcomingDeadlines() {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
  
  const notifiedDeadlines = JSON.parse(localStorage.getItem('student_notified_deadlines') || '[]');
  const newNotifications = [];
  
  enrolledClasses.forEach(classItem => {
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const dueDate = new Date(assignment.dueDate);
        const submission = assignment.submissions ? 
          assignment.submissions.find(s => String(s.studentId) === String(studentData.id)) : null;
        
        if (!submission && dueDate > now && dueDate <= threeDaysFromNow) {
          const notificationKey = `${assignment.id}-${dueDate.toISOString()}`;
          
          // âœ… FIX: Only notify once per assignment-deadline combo
          if (!notifiedDeadlines.includes(notificationKey)) {
            const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            
            console.log(`â° Upcoming deadline: ${assignment.title} in ${daysUntil} days`);
            
            addNotification(
              'deadline',
              'Upcoming Deadline',
              `"${assignment.title}" due in ${daysUntil} day${daysUntil > 1 ? 's' : ''} (${classItem.name})`,
              `class:${classItem.id}`
            );
            
            newNotifications.push(notificationKey);
          }
        }
      });
    }
  });
  
  if (newNotifications.length > 0) {
    const updatedNotifications = [...notifiedDeadlines, ...newNotifications];
    localStorage.setItem('student_notified_deadlines', JSON.stringify(updatedNotifications));
  }
}

// âœ… FIX #2: Check for new grades
function checkForNewGrades() {
  const lastCheck = localStorage.getItem('student_last_grade_check');
  const lastCheckTime = lastCheck ? new Date(lastCheck) : new Date(0);
  
  enrolledClasses.forEach(classItem => {
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const submission = assignment.submissions ? 
          assignment.submissions.find(s => String(s.studentId) === String(studentData.id)) : null;
        
        if (submission && submission.grade !== undefined) {
          const gradedDate = new Date(submission.gradedDate || submission.date);
          
          // âœ… FIX: Only notify if grade was added after last check
          if (gradedDate > lastCheckTime) {
            const percentage = ((submission.grade / assignment.points) * 100).toFixed(1);
            
            console.log(`📊 New grade: ${assignment.title} - ${percentage}%`);
            
            addNotification(
              'grade',
              'Grade Released',
              `"${assignment.title}" - ${submission.grade}/${assignment.points} (${percentage}%)`,
              `class:${classItem.id}`
            );
            
            if (submission.feedback) {
              addNotification(
                'feedback',
                'Feedback Received',
                `Your professor left feedback on "${assignment.title}"`,
                `class:${classItem.id}`
              );
            }
          }
        }
      });
    }
  });
  
  localStorage.setItem('student_last_grade_check', new Date().toISOString());
}

// ✅ FIX #2: Check for upcoming deadlines
function checkUpcomingDeadlines() {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
  
  enrolledClasses.forEach(classItem => {
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const dueDate = new Date(assignment.dueDate);
        const submission = assignment.submissions ? 
          assignment.submissions.find(s => String(s.studentId) === String(studentData.id)) : null;
        
        if (!submission && dueDate > now && dueDate <= threeDaysFromNow) {
          const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
          
          addNotification(
            'deadline',
            'Upcoming Deadline',
            `"${assignment.title}" due in ${daysUntil} day${daysUntil > 1 ? 's' : ''} (${classItem.name})`,
            `class:${classItem.id}`
          );
        }
      });
    }
  });
}

async function loadArchivedClasses() {
  try {
    const response = await fetch('/api/professor/classes?archived=true');
    if (response.ok) {
      const archivedClasses = await response.json();
      
      console.log('✅ Loaded archived classes:', archivedClasses.length);
      renderArchivedClassList(archivedClasses);
    } else {
      console.error('Failed to load archived classes:', response.status);
      renderArchivedClassList([]);
    }
  } catch (error) {
    console.error('Error loading archived classes:', error);
    renderArchivedClassList([]);
  }
}

function renderArchivedClassList(archivedClasses) {
  const archivedSection = document.getElementById('archived-classes-section');
  if (!archivedSection) return;
  
  let archivedList = archivedSection.querySelector('.archived-classes-list');
  if (!archivedList) {
    archivedList = document.createElement('div');
    archivedList.className = 'archived-classes-list';
    archivedSection.appendChild(archivedList);
  }
  
  archivedList.innerHTML = '';
  
  if (archivedClasses.length === 0) {
    archivedList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-archive"></i>
        <h3>No Archived Classes</h3>
        <p>Archived classes will appear here when professors archive them</p>
      </div>
    `;
    return;
  }
  
  archivedClasses.forEach(classItem => {
    const classCard = document.createElement('div');
    classCard.className = 'class-card archived';
    classCard.style.cssText = 'opacity: 0.9; border: 2px solid #ffc107;';
    
    classCard.innerHTML = `
      <div class="class-card-header">
        <h3 style="word-wrap: break-word;">${classItem.name}</h3>
        <span class="class-code">${classItem.code}</span>
      </div>
      <p class="class-description" style="word-wrap: break-word;">${classItem.description || 'No description provided'}</p>
      <div class="class-stats">
        <span><i class="fas fa-user-tie"></i> ${classItem.professor_name || 'Professor'}</span>
        <span><i class="fas fa-file-alt"></i> ${classItem.materials ? classItem.materials.length : 0} Materials</span>
        <span><i class="fas fa-tasks"></i> ${classItem.assignments ? classItem.assignments.length : 0} Assignments</span>
        <span style="color: #ffc107;"><i class="fas fa-archive"></i> Archived</span>
      </div>
      <div class="class-actions">
        <button class="btn-secondary" onclick="openClass('${classItem.id}', true)" style="width: 100%;">
          <i class="fas fa-eye"></i> View (Read-only)
        </button>
      </div>
    `;
    archivedList.appendChild(classCard);
  });
}


function showJoinClassModal() {
  document.getElementById('join-class-modal').style.display = 'flex';
}

function hideJoinClassModal() {
  document.getElementById('join-class-modal').style.display = 'none';
  document.getElementById('class-code-input').value = '';
}

async function joinClass() {
  const classCode = document.getElementById('class-code-input').value.trim().toUpperCase();
  
  if (!classCode) {
    alert('Please enter a class code');
    return;
  }
  
  try {
    const response = await fetch('/api/student/join_class', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: classCode })
    });

    const result = await response.json();

    if (response.ok) {
      alert(`Successfully joined ${result.class.name}!`);
      
      addNotification(
        'enrollment',
        'Successfully Joined Class',
        `You are now enrolled in ${result.class.name}`,
        `class:${result.class.id}`
      );
      
      hideJoinClassModal();
      await loadEnrolledClasses();
    } else {
      alert(result.error || 'Failed to join class');
    }
  } catch (error) {
    console.error('Error joining class:', error);
    alert('Error joining class. Please try again.');
  }
}

function renderClassList() {
  const classList = document.getElementById('class-list');
  classList.innerHTML = '';
  
  if (enrolledClasses.length === 0) {
    classList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-book-open"></i>
        <h3>No Classes Enrolled</h3>
        <p>Join a class using a class code from your professor</p>
      </div>
    `;
    return;
  }
  
  enrolledClasses.forEach(classItem => {
    const now = new Date();
    let pendingAssignments = 0;
    let missedAssignments = 0;

    // ✅ FIX: Calculate stats from FRESH database data
    if (classItem.assignments && Array.isArray(classItem.assignments)) {
      classItem.assignments.forEach(a => {
        // ✅ Ensure assignment has required fields
        if (!a.dueDate) return;
        
        const dueDate = new Date(a.dueDate);
        const submission = a.submissions ? 
          a.submissions.find(s => String(s.studentId) === String(studentData.id)) : null;
        
        if (!submission) {
          if (dueDate < now) {
            missedAssignments++;
          } else {
            pendingAssignments++;
          }
        }
      });
    }
    
    console.log(`📊 Class "${classItem.name}": ${pendingAssignments} pending, ${missedAssignments} missed`);
    
    const classCard = document.createElement('div');
    classCard.className = 'class-card';
    classCard.innerHTML = `
      <div class="class-card-header">
        <h3>${classItem.name}</h3>
        <span class="class-code">${classItem.code}</span>
      </div>
      <p class="class-description">${classItem.description || 'No description provided'}</p>
      <div class="class-stats">
        <span><i class="fas fa-user-tie"></i> ${classItem.professor_name || 'Professor'}</span>
        <span><i class="fas fa-file-alt"></i> ${classItem.materials ? classItem.materials.length : 0} Materials</span>
        <span><i class="fas fa-tasks"></i> ${pendingAssignments} Pending</span>
        ${missedAssignments > 0 ? `<span style="color: #dc3545;"><i class="fas fa-exclamation-triangle"></i> ${missedAssignments} Missed</span>` : ''}
      </div>
      <div class="class-actions">
        <button class="btn-primary" onclick="openClass('${classItem.id}', false)">Open Class</button>
        <button class="btn-secondary" onclick="unenrollClass('${classItem.id}')">
          <i class="fas fa-sign-out-alt"></i> Unenroll
        </button>
      </div>
    `;
    classList.appendChild(classCard);
  });
}

async function unenrollClass(classId) {
  if (!confirm('Are you sure you want to unenroll from this class?')) {
    return;
  }

  try {
    const response = await fetch('/api/student/unenroll_class', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ class_id: classId })
    });

    const result = await response.json();

    if (response.ok) {
      alert('Successfully unenrolled from class!');
      await loadEnrolledClasses();
    } else {
      alert(result.error || 'Failed to unenroll from class');
    }
  } catch (error) {
    console.error('Error unenrolling from class:', error);
    alert('Error unenrolling from class. Please try again.');
  }
}

// REPLACE the openClass function around line 420
async function openClass(classId, isArchived = false) {
  currentClassId = classId;
  
  let classItem = enrolledClasses.find(c => String(c.id) === String(classId));
  
  // ✅ FIX: Load archived class with isolated data
  if (!classItem && isArchived) {
    try {
      const response = await fetch('/api/professor/classes?archived=true');
      if (response.ok) {
        const archivedClasses = await response.json();
        classItem = archivedClasses.find(c => String(c.id) === String(classId));
        
        if (classItem) {
          // ✅ CRITICAL: Load fresh data specific to THIS class
          const materialsResponse = await fetch(`/api/professor/classes/${classId}/materials`);
          if (materialsResponse.ok) {
            classItem.materials = await materialsResponse.json();
          }
          
          const assignmentsResponse = await fetch(`/api/professor/classes/${classId}/assignments`);
          if (assignmentsResponse.ok) {
            classItem.assignments = await assignmentsResponse.json();
          }
          
          // ✅ Display with isolated data
          displayClassView(classItem, true);
          return;
        }
      }
    } catch (error) {
      console.error('Error loading archived class:', error);
      alert('❌ Error loading class');
      return;
    }
  }
  
  if (!classItem) {
    alert('❌ Class not found');
    return;
  }
  
  // ✅ FIX: Always load fresh data for active classes
  await loadClassDataFromDatabase(classItem);
  displayClassView(classItem, isArchived);
}

// ✅ NEW HELPER FUNCTION: Load class data from database (add this after openClass)
async function loadClassDataFromDatabase(classItem) {
  // Load materials from database
  try {
    const materialsResponse = await fetch(`/api/professor/classes/${classItem.id}/materials`);
    if (materialsResponse.ok) {
      classItem.materials = await materialsResponse.json();
      console.log(`✅ Loaded ${classItem.materials.length} materials for ${classItem.name}`);
    }
  } catch (e) {
    console.error('Error loading materials:', e);
    classItem.materials = [];
  }
  
  // Load assignments from database
  try {
    const assignmentsResponse = await fetch(`/api/professor/classes/${classItem.id}/assignments`);
    if (assignmentsResponse.ok) {
      classItem.assignments = await assignmentsResponse.json();
      console.log(`✅ Loaded ${classItem.assignments.length} assignments for ${classItem.name}`);
    }
  } catch (e) {
    console.error('Error loading assignments:', e);
    classItem.assignments = [];
  }
}

function displayClassView(classItem, isArchived = false) {
  document.getElementById('class-title').textContent = classItem.name + (isArchived ? ' (Archived - Read Only)' : '');
  document.getElementById('class-desc').textContent = classItem.description;
  document.getElementById('class-professor').textContent = classItem.professor_name || 'Professor';

  const materialsCount = classItem.materials ? classItem.materials.length : 0;
  const assignmentsCount = classItem.assignments ? classItem.assignments.length : 0;
  
  console.log(`📊 Displaying class: ${classItem.name} - Materials: ${materialsCount}, Assignments: ${assignmentsCount}`);
  
  document.getElementById('class-materials').textContent = materialsCount;
  document.getElementById('class-assignments').textContent = assignmentsCount;

  document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));

  const classView = document.getElementById('class-view');
  classView.classList.remove('hidden');
  classView.classList.add('active');
  
  // ✅ FIX: Add archived indicator
  if (isArchived) {
    classView.dataset.archived = 'true';
    
    // ✅ Remove existing banner
    const existingBanner = classView.querySelector('.archived-banner');
    if (existingBanner) {
      existingBanner.remove();
    }
    
    // ✅ Add archived banner
    const banner = document.createElement('div');
    banner.className = 'archived-banner';
    banner.style.cssText = `
      background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
      color: white;
      padding: 1rem 1.5rem;
      text-align: center;
      font-weight: 600;
      margin-bottom: 1rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(108, 117, 125, 0.3);
    `;
    banner.innerHTML = '<i class="fas fa-archive"></i> This class has been archived by your professor - View Only';
    classView.querySelector('.class-header').after(banner);
    
    // ✅ Disable submit buttons for archived classes
    const submitButtons = classView.querySelectorAll('button[onclick*="openSubmissionModal"]');
    submitButtons.forEach(button => {
      button.disabled = true;
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
      button.textContent = 'Archived - Cannot Submit';
      button.onclick = null;
    });
  } else {
    delete classView.dataset.archived;
    
    const existingBanner = classView.querySelector('.archived-banner');
    if (existingBanner) {
      existingBanner.remove();
    }
  }

  // ✅ Load content after data is ready
  loadClassPosts();
  loadClassAssignments(isArchived);
  loadClassGrades();
  
  console.log(`✅ Displayed class: ${classItem.name} (Archived: ${isArchived})`);
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  document.getElementById(`${tabName}-tab`).classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// Add near the top of the file (after DOMContentLoaded)
// ✅ FIX: User-specific avatar storage
const userType = document.body.classList.contains('professor-dashboard') ? 'professor' : 'student';

// Get user ID from session or profile data
let userId = null;
if (userType === 'professor') {
  // For professor
  const profileId = document.getElementById('profile-professor-id');
  userId = profileId ? profileId.textContent.trim() : null;
} else {
  // For student  
  const profileId = document.getElementById('profile-student-id');
  userId = profileId ? profileId.textContent.trim() : null;
}

// Load avatar with user-specific key
const avatarKey = `avatar_${userType}_${userId}`;
const savedAvatar = localStorage.getItem(avatarKey);
if (savedAvatar && profileAvatar && topbarAvatar) {
  profileAvatar.src = savedAvatar;
  topbarAvatar.src = savedAvatar;
}

if (avatarUpload && profileAvatar && topbarAvatar) {
  const newAvatarUpload = avatarUpload.cloneNode(true);
  avatarUpload.parentNode.replaceChild(newAvatarUpload, avatarUpload);
  
  newAvatarUpload.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, GIF)');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
      const avatarData = e.target.result;
      
      profileAvatar.src = avatarData;
      topbarAvatar.src = avatarData;
      
      try {
        // ✅ FIX: Save with user-specific key
        localStorage.setItem(avatarKey, avatarData);
        
        // Also save to database
        await fetch('/api/profile/update-avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: avatarData })
        });
        
        showSuccessToast('Profile Picture Updated!', 'Your avatar has been saved');
        
      } catch (error) {
        alert('Error saving avatar: ' + error.message);
      }
    };
    
    reader.readAsDataURL(file);
  });
}

function loadClassPosts() {
  const classItem = enrolledClasses.find(c => c.id === currentClassId);
  const postsContainer = document.getElementById('posts-container');
  
  if (!classItem || !postsContainer) return;
  
  postsContainer.innerHTML = '';
  
  if (!classItem.materials || classItem.materials.length === 0) {
    postsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-file-upload"></i>
        <h3>No Materials Posted</h3>
        <p>Check back later for class materials</p>
      </div>
    `;
    return;
  }
  
  const sortedMaterials = [...classItem.materials].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
  
  sortedMaterials.forEach(material => {
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    
    let filesHTML = '';
    
    // ✅ Separate videos, files, and process resource link
    if (material.files && material.files.length > 0) {
      const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
      const videos = [];
      const otherFiles = [];
      
      material.files.forEach(file => {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (videoExtensions.includes(fileExtension)) {
          videos.push(file);
        } else {
          otherFiles.push(file);
        }
      });
      
      // ✅ Display Videos with Player
      if (videos.length > 0) {
        filesHTML += `
          <div class="post-videos" style="margin: 1.5rem 0; padding: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
            <strong style="color: white; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; font-size: 1.1rem;">
              <i class="fas fa-video"></i> Video Resources (${videos.length}):
            </strong>
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${videos.map(file => {
                const fileSource = file.url || file.content || '';
                const escapedName = file.name.replace(/'/g, "\\'");
                const escapedSource = fileSource.replace(/'/g, "\\'");
                const fileSize = file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Video file';
                
                return `
                  <button 
                    onclick="showVideoPlayer('${escapedName}', '${escapedSource}')" 
                    style="display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: rgba(255, 255, 255, 0.95); border: none; border-radius: 8px; cursor: pointer; transition: all 0.3s ease; text-align: left; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'">
                    <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      <i class="fas fa-play" style="color: white; font-size: 1.5rem;"></i>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-weight: 600; color: #2d3748; font-size: 1rem; margin-bottom: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${file.name}
                      </div>
                      <div style="color: #718096; font-size: 0.875rem;">
                        ${fileSize}
                      </div>
                    </div>
                    <i class="fas fa-chevron-right" style="color: #cbd5e0; font-size: 1.2rem;"></i>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }
      
      // ✅ Display Other Files (Downloadable)
      if (otherFiles.length > 0) {
        filesHTML += `
          <div class="post-files" style="margin: 1.5rem 0;">
            <strong style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; color: #333;">
              <i class="fas fa-paperclip"></i> Attached Files (${otherFiles.length}):
            </strong>
            <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
              ${otherFiles.map(file => {
                const fileSource = file.url || file.content || '';
                const escapedName = file.name.replace(/'/g, "\\'");
                const escapedSource = fileSource.replace(/'/g, "\\'");
                const fileSize = file.size ? ` (${(file.size / 1024 / 1024).toFixed(2)}MB)` : '';
                
                return `
                  <a href="#" 
                    onclick="downloadFile('${escapedName}', '${escapedSource}'); return false;" 
                    style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: #e8f4f8; color: #4a90a4; text-decoration: none; border-radius: 6px; font-size: 0.9rem; font-weight: 500; transition: all 0.2s ease;"
                    onmouseover="this.style.background='#d0e8f0'; this.style.transform='translateY(-2px)'"
                    onmouseout="this.style.background='#e8f4f8'; this.style.transform='translateY(0)'">
                    <i class="fas fa-download"></i> ${file.name}${fileSize}
                  </a>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }
    }
    
    // ✅ Display Resource Link (Clickable)
    let resourceLinkHTML = '';
    if (material.resourceLink) {
      resourceLinkHTML = `
        <div class="post-link" style="margin: 1.5rem 0; padding: 1rem; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px;">
          <strong style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; color: #856404;">
            <i class="fas fa-link"></i> Resource Link:
          </strong>
          <a href="${material.resourceLink}" 
             target="_blank" 
             rel="noopener noreferrer"
             style="color: #0066cc; text-decoration: none; word-break: break-all; font-weight: 500;"
             onmouseover="this.style.textDecoration='underline'"
             onmouseout="this.style.textDecoration='none'">
            <i class="fas fa-external-link-alt"></i> ${material.resourceLink}
          </a>
        </div>
      `;
    }
    
    postElement.innerHTML = `
      <div class="post-header">
        <h4>${material.title}</h4>
        <span class="post-date">${new Date(material.date).toLocaleDateString()}</span>
      </div>
      <p class="post-description">${material.description}</p>
      ${material.deadline ? `<p class="post-deadline"><strong>Deadline:</strong> ${new Date(material.deadline).toLocaleDateString()}</p>` : ''}
      ${resourceLinkHTML}
      ${filesHTML}
    `;
    postsContainer.appendChild(postElement);
  });
}

async function loadClassAssignments(isArchived = false) {
  const classItem = enrolledClasses.find(c => c.id === currentClassId);
  const assignmentsContainer = document.getElementById('assignments-container');
  
  if (!classItem || !assignmentsContainer) return;
  
  assignmentsContainer.innerHTML = '<div style="text-align:center;padding:2rem;"><i class="fas fa-spinner fa-spin"></i> Loading assignments...</div>';
  
  try {
    // ✅ FIX: Always load fresh assignments from database
    const response = await fetch(`/api/professor/classes/${currentClassId}/assignments`);
    if (response.ok) {
      const assignments = await response.json();
      classItem.assignments = assignments;
      console.log(`✅ Loaded ${assignments.length} assignments for ${classItem.name}`);
    } else {
      console.error('Failed to load assignments');
      classItem.assignments = [];
    }
  } catch (e) {
    console.error('Error loading assignments:', e);
    classItem.assignments = [];
  }
  
  assignmentsContainer.innerHTML = '';
  
  if (!classItem.assignments || classItem.assignments.length === 0) {
    assignmentsContainer.innerHTML = `
      <div class="empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; text-align: center;">
        <i class="fas fa-tasks" style="font-size: 4rem; color: #ccc; margin-bottom: 1rem;"></i>
        <h3 style="color: #666; margin-bottom: 0.5rem;">No Assignments</h3>
        <p style="color: #999;">No assignments have been posted for this class yet</p>
      </div>
    `;
    return;
  }
  
  const sortedAssignments = [...classItem.assignments].sort((a, b) => {
    const dateA = new Date(a.dateCreated || a.dueDate);
    const dateB = new Date(b.dateCreated || b.dueDate);
    return dateB - dateA;
  });
  
  sortedAssignments.forEach(assignment => {
    const submission = assignment.submissions ? 
      assignment.submissions.find(s => String(s.studentId) === String(studentData.id)) : null;
    
    const isSubmitted = !!submission;
    
    // ✅ FIX: Proper grade checking - must have actual grade value
    const isGraded = isSubmitted && 
                    submission.grade !== undefined && 
                    submission.grade !== null && 
                    submission.grade >= 0;
    
    const now = new Date();
    const isOverdue = new Date(assignment.dueDate) < now && !isSubmitted;
    const isMissed = isOverdue && !isSubmitted;
    
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    const videoFiles = [];
    const otherFiles = [];
    
    if (assignment.files && assignment.files.length > 0) {
      assignment.files.forEach(file => {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (videoExtensions.includes(fileExtension)) {
          videoFiles.push(file);
        } else {
          otherFiles.push(file);
        }
      });
    }
    
    const assignmentElement = document.createElement('div');
    assignmentElement.className = `assignment-card ${isOverdue ? 'overdue' : ''} ${isGraded ? 'graded' : ''}`;
    assignmentElement.innerHTML = `
      <div class="assignment-header">
        <h4>${assignment.title}</h4>
        <span class="due-date ${isOverdue ? 'overdue' : ''}">
          Due: ${new Date(assignment.dueDate).toLocaleDateString()}
          ${isOverdue ? ' (Overdue)' : ''}
        </span>
      </div>
      <p class="assignment-description">${assignment.description}</p>
      <div class="assignment-details">
        <span><i class="fas fa-file-alt"></i> ${assignment.points} Points</span>
        <span class="status ${isGraded ? 'graded' : isSubmitted ? 'submitted' : isMissed ? 'missed' : 'pending'}">
          <i class="fas fa-${isGraded ? 'check-circle' : isSubmitted ? 'clock' : isMissed ? 'times-circle' : 'exclamation-circle'}"></i>
          ${isGraded ? 'Graded' : isSubmitted ? 'Submitted (Pending Grade)' : isMissed ? 'Missed' : 'Not Submitted'}
        </span>
        ${isGraded ? `<span class="grade">Grade: ${submission.grade}/${assignment.points}</span>` : ''}
      </div>
      
      ${videoFiles.length > 0 ? `
        <div class="assignment-videos" style="margin: 1.5rem 0; padding: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
          <strong style="color: white; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; font-size: 1.1rem;">
            <i class="fas fa-video"></i> Video Resources (${videoFiles.length}):
          </strong>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${videoFiles.map(file => {
              const fileSource = file.url || file.content || '';
              const escapedName = file.name.replace(/'/g, "\\'");
              const escapedSource = fileSource.replace(/'/g, "\\'");
              
              return `
                <button 
                  onclick="showVideoPlayer('${escapedName}', '${escapedSource}')" 
                  style="display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: rgba(255, 255, 255, 0.95); border: none; border-radius: 8px; cursor: pointer; transition: all 0.3s ease; text-align: left; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                  onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'">
                  <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas fa-play" style="color: white; font-size: 1.5rem;"></i>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; color: #2d3748; font-size: 1rem; margin-bottom: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${file.name}
                    </div>
                    <div style="color: #718096; font-size: 0.875rem;">
                      ${file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Video file'}
                    </div>
                  </div>
                  <i class="fas fa-chevron-right" style="color: #cbd5e0; font-size: 1.2rem;"></i>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      ${otherFiles.length > 0 ? `
        <div class="assignment-files" style="margin: 1.5rem 0;">
          <strong style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
            <i class="fas fa-paperclip"></i> Other Resources (${otherFiles.length}):
          </strong>
          <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
            ${otherFiles.map(file => {
              const fileSource = file.url || file.content || '';
              const escapedName = file.name.replace(/'/g, "\\'");
              const escapedSource = fileSource.replace(/'/g, "\\'");
              
              return `
                <a href="#" 
                  onclick="downloadFile('${escapedName}', '${escapedSource}'); return false;" 
                  style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: #e8f4f8; color: #4a90a4; text-decoration: none; border-radius: 6px; font-size: 0.9rem; font-weight: 500; transition: all 0.2s ease;"
                  onmouseover="this.style.background='#d0e8f0'; this.style.transform='translateY(-2px)'"
                  onmouseout="this.style.background='#e8f4f8'; this.style.transform='translateY(0)'">
                  <i class="fas fa-download"></i> ${file.name}
                </a>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
      
      ${assignment.instructions ? `
        <div class="assignment-instructions">
          <strong>Instructions:</strong>
          <p>${assignment.instructions}</p>
        </div>
      ` : ''}
      <div class="assignment-actions">
        ${!isSubmitted && !isArchived ? `
          <button class="btn-primary" onclick="openSubmissionModal('${assignment.id}')">
            <i class="fas fa-paper-plane"></i> Submit Assignment
          </button>
        ` : isSubmitted ? `
          <button class="btn-secondary" onclick="viewSubmission('${assignment.id}')">
            <i class="fas fa-eye"></i> View Submission
          </button>
        ` : ''}
        ${isArchived ? `
          <span style="color: #999; font-style: italic;"><i class="fas fa-lock"></i> Class Archived - Read Only</span>
        ` : ''}
        ${isGraded && submission.feedback ? `
          <button class="btn-outline" onclick="viewFeedback('${assignment.id}')">
            <i class="fas fa-comment"></i> View Feedback
          </button>
        ` : ''}
      </div>
    `;
    assignmentsContainer.appendChild(assignmentElement);
  });
}

async function openSubmissionModal(assignmentId) {
  console.log('📝 Opening submission modal for assignment:', assignmentId);
  
  const classItem = enrolledClasses.find(c => c.id === currentClassId);
  if (!classItem) {
    alert('❌ Error: Class not found');
    return;
  }
  
  // ✅ Check if class is archived FIRST
  if (classItem.archived) {
    alert('❌ Cannot submit to archived class');
    return;
  }
  
  // ✅ Load fresh assignment data from DATABASE
  let assignment = null;
  try {
    const assignmentsResponse = await fetch(`/api/professor/classes/${currentClassId}/assignments`);
    if (assignmentsResponse.ok) {
      const assignments = await assignmentsResponse.json();
      assignment = assignments.find(a => String(a.id) === String(assignmentId));
      
      if (assignment) {
        console.log('✅ Found assignment from database:', assignment.title);
        classItem.assignments = assignments;
      }
    }
  } catch (e) {
    console.error('❌ Error loading assignments:', e);
  }
  
  if (!assignment) {
    alert('❌ Error: Assignment not found. The professor may have deleted it.');
    return;
  }
  
  console.log('✅ Assignment found:', assignment.title);
  
  // ✅ Check if assignment is overdue
  const dueDate = new Date(assignment.dueDate);
  const now = new Date();
  
  if (now > dueDate) {
    const confirmLate = confirm(
      `⏰ This assignment is overdue!\n\n` +
      `Deadline was: ${dueDate.toLocaleString()}\n\n` +
      `Do you still want to submit? (Your professor may not accept late submissions)`
    );
    if (!confirmLate) return;
  }
  
  // Check if already submitted
  const existingSubmission = assignment.submissions ? 
    assignment.submissions.find(s => String(s.studentId) === String(studentData.id)) : null;
  
  const modal = document.getElementById('submission-modal');
  if (!modal) {
    alert('❌ Error: Submission modal not found');
    return;
  }
  
  // ✅ CRITICAL: Clear previous modal state FIRST
  modal.dataset.assignmentId = '';
  modal.dataset.classId = '';
  modal.dataset.isResubmit = '';
  modal.dataset.previousSubmitDate = '';
  
  // ✅ NOW set the new data
  modal.dataset.assignmentId = String(assignmentId);
  modal.dataset.classId = String(currentClassId);
  modal.dataset.isResubmit = existingSubmission ? 'true' : 'false';
  if (existingSubmission) {
    modal.dataset.previousSubmitDate = existingSubmission.date;
  }
  
  console.log('✅ Modal dataset set:', {
    assignmentId: modal.dataset.assignmentId,
    classId: modal.dataset.classId,
    isResubmit: modal.dataset.isResubmit
  });
  
  // Clear form
  document.getElementById('submission-text').value = '';
  document.getElementById('submission-files').value = '';
  document.getElementById('submission-files-chosen').textContent = 'No files selected';
  
  // ✅ Reset submit button state
  const submitBtn = document.getElementById('submit-assignment');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Assignment';
  }
  
  modal.style.display = 'flex';
  
  setTimeout(() => {
    document.getElementById('submission-text').focus();
  }, 100);
  
  console.log('✅ Submission modal opened successfully');
}

async function submitAssignment() {
  console.log('📤 SUBMIT ASSIGNMENT - Starting submission process');
  
  const modal = document.getElementById('submission-modal');
  if (!modal) {
    console.error('❌ Modal not found');
    alert('Error: Submission form not found');
    return;
  }

  const assignmentId = modal.dataset.assignmentId;
  const classId = modal.dataset.classId || currentClassId;
  const submissionText = document.getElementById('submission-text').value.trim();
  const filesInput = document.getElementById('submission-files');
  const isResubmit = modal.dataset.isResubmit === 'true';
  const previousSubmitDate = modal.dataset.previousSubmitDate;

  console.log('📋 Submission details:', {
    assignmentId,
    classId,
    textLength: submissionText.length,
    filesCount: filesInput?.files?.length || 0,
    isResubmit
  });

  // ✅ Show resubmit confirmation ONLY when actually submitting
  if (isResubmit && previousSubmitDate) {
    const confirmResubmit = confirm(
      `⚠️ You have already submitted this assignment.\n\n` +
      `Submitted on: ${new Date(previousSubmitDate).toLocaleString()}\n\n` +
      `Do you want to resubmit? This will replace your previous submission.`
    );
    if (!confirmResubmit) {
      console.log('User cancelled resubmission');
      return;
    }
  }

  // ✅ Validation
  if (!assignmentId || !classId) {
    alert('❌ Error: Missing assignment or class information. Please close and reopen the submission form.');
    return;
  }

  if (!submissionText && (!filesInput || !filesInput.files || filesInput.files.length === 0)) {
    alert('⚠️ Please provide either submission text or upload files');
    return;
  }

  // ✅ Get submit button and disable it IMMEDIATELY
  const submitBtn = document.getElementById('submit-assignment');
  if (!submitBtn) {
    alert('❌ Error: Submit button not found');
    return;
  }

  // ✅ Prevent double submission
  if (submitBtn.disabled) {
    console.log('⚠️ Submission already in progress');
    return;
  }

  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

  try {
    // ✅ Verify assignment still exists in database
    const verifyResponse = await fetch(`/api/professor/classes/${classId}/assignments`);
    if (verifyResponse.ok) {
      const assignments = await verifyResponse.json();
      const assignment = assignments.find(a => String(a.id) === String(assignmentId));
      
      if (!assignment) {
        throw new Error('Assignment not found. It may have been deleted by your professor.');
      }
      
      // Check deadline again
      const dueDate = new Date(assignment.dueDate);
      const now = new Date();
      if (now > dueDate) {
        console.log('⚠️ Submitting past deadline');
      }
    }
  } catch (e) {
    console.error('❌ Error verifying assignment:', e);
    alert('❌ ' + e.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
    return;
  }

  // Prepare submission data
  const submissionData = {
    assignment_id: assignmentId,
    class_id: classId,
    content: submissionText,
    files: []
  };

  // Handle file uploads
  if (filesInput && filesInput.files && filesInput.files.length > 0) {
    console.log(`📎 Uploading ${filesInput.files.length} file(s)...`);
    
    try {
      for (let i = 0; i < filesInput.files.length; i++) {
        const file = filesInput.files[i];
        console.log(`⬆️ Uploading file ${i + 1}/${filesInput.files.length}: ${file.name}`);
        
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading ${i + 1}/${filesInput.files.length}...`;
        
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload_file', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to upload ${file.name}`);
        }
        
        const result = await response.json();
        submissionData.files.push({
          name: file.name,
          type: file.type,
          size: file.size,
          url: result.url
        });
        
        console.log(`✅ File uploaded: ${file.name}`);
      }
    } catch (uploadError) {
      console.error('❌ File upload error:', uploadError);
      alert(`❌ Error uploading files: ${uploadError.message}`);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      return;
    }
  }

  // Submit to backend
  try {
    console.log('💾 Saving submission to database...');
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    const response = await fetch('/api/student/submit_assignment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to save submission');
    }

    console.log('✅ Submission saved successfully:', result);

    // Close modal
    modal.style.display = 'none';
    document.getElementById('submission-text').value = '';
    document.getElementById('submission-files').value = '';
    document.getElementById('submission-files-chosen').textContent = 'No files selected';

    // ✅ Clear modal data
    modal.dataset.assignmentId = '';
    modal.dataset.classId = '';
    modal.dataset.isResubmit = '';
    modal.dataset.previousSubmitDate = '';

    // ✅ Re-enable button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;

    // ✅ Force reload from database
    await loadEnrolledClasses();

    // ✅ If viewing this class, refresh it
    if (currentClassId === classId) {
      const currentClass = enrolledClasses.find(c => c.id === currentClassId);
      if (currentClass) {
        await loadClassDataFromDatabase(currentClass);
        loadClassAssignments();
      }
    }

    // ✅ Show success
    showSuccessToast('Assignment Submitted!', 'Your submission has been saved successfully');

    // Add notification
    const classItem = enrolledClasses.find(c => c.id === classId);
    if (classItem) {
      addNotification(
        'submission',
        'Assignment Submitted',
        `Successfully submitted to ${classItem.name}`,
        `class:${classId}`
      );
    }

    // Refresh data
    await refreshStudentData();

  } catch (error) {
    console.error('❌ Submission error:', error);
    alert(`❌ Failed to submit assignment: ${error.message}`);
    
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}


// Add this helper function
async function refreshStudentData() {
  try {
    console.log('🔄 Refreshing student data...');
    
    // Reload enrolled classes
    await loadEnrolledClasses();
    
    // If a class is currently open, refresh its data
    if (currentClassId) {
      const classItem = enrolledClasses.find(c => c.id === currentClassId);
      if (classItem) {
        await loadClassDataFromDatabase(classItem);
        loadClassAssignments();
        loadClassGrades();
      }
    }
    
    // Refresh assignments list
    await loadAllAssignments();
    
    // Update dashboard stats
    updateDashboardStats();
    
    console.log('✅ Student data refreshed successfully');
  } catch (error) {
    console.error('❌ Error refreshing student data:', error);
  }
}

// ✅ ADD: Helper function to properly refresh student data after unsubmit
async function refreshAfterUnsubmit() {
  try {
    console.log('🔄 Refreshing data after unsubmit...');
    
    // Force reload enrolled classes
    await loadEnrolledClasses();
    
    // Refresh current class view if open
    if (currentClassId) {
      const classItem = enrolledClasses.find(c => c.id === currentClassId);
      if (classItem) {
        await loadClassDataFromDatabase(classItem);
        loadClassAssignments();
        loadClassGrades();
      }
    }
    
    // Refresh other sections
    await loadAllAssignments();
    updateDashboardStats();
    
    console.log('✅ Data refreshed after unsubmit');
  } catch (error) {
    console.error('❌ Error refreshing after unsubmit:', error);
  }
}

// Auto-refresh data every 30 seconds
let refreshInterval = null;

function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(async () => {
        if (document.hidden) return; // Don't refresh when tab is hidden
        
        console.log('🔄 Auto-refreshing data...');
        
        try {
            if (document.body.classList.contains('professor-dashboard')) {
                await refreshProfessorData();
            } else {
                await refreshStudentData();
            }
        } catch (error) {
            console.error('Auto-refresh error:', error);
        }
    }, 30000); // 30 seconds
}

// Start auto-refresh when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(startAutoRefresh, 5000);

    
});

// Refresh when page becomes visible
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        console.log('📄 Page visible, refreshing data...');
        if (document.body.classList.contains('professor-dashboard')) {
            refreshProfessorData();
        } else {
            refreshStudentData();
        }
    }
});

function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <i class="fas fa-check-circle" style="font-size: 1.5rem;"></i>
            <div>
                <strong>Success!</strong>
                <div style="font-size: 0.85rem; margin-top: 0.25rem;">${message}</div>
            </div>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
async function saveSubmission(assignment, submission, classItem) {
  console.log('💾 saveSubmission() called');
  
  try {
    // ✅ FIX: Save submission to DATABASE first
    const response = await fetch('/api/student/submit_assignment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assignment_id: assignment.id,
        class_id: classItem.id,
        content: submission.content,
        files: submission.files
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save submission');
    }
    
    const result = await response.json();
    console.log('✅ Submission saved to database:', result);
    
    // ✅ THEN update local state
    if (!assignment.submissions) {
      assignment.submissions = [];
    }
    
    const existingIndex = assignment.submissions.findIndex(s => 
      String(s.studentId) === String(submission.studentId)
    );
    
    if (existingIndex !== -1) {
      assignment.submissions[existingIndex] = submission;
      console.log('✅ Updated existing submission');
    } else {
      assignment.submissions.push(submission);
      console.log('✅ Added new submission');
    }
    
    // ✅ Update professor's localStorage
    const professorClasses = localStorage.getItem('professor_classes');
    if (professorClasses) {
      const profClasses = JSON.parse(professorClasses);
      const profClassIndex = profClasses.findIndex(pc => pc.code === classItem.code);
      
      if (profClassIndex !== -1) {
        if (!profClasses[profClassIndex].assignments) {
          profClasses[profClassIndex].assignments = [];
        }
        
        const profAssignmentIndex = profClasses[profClassIndex].assignments.findIndex(a => a.id === assignment.id);
        
        if (profAssignmentIndex !== -1) {
          profClasses[profClassIndex].assignments[profAssignmentIndex].submissions = assignment.submissions;
          console.log('✅ Updated submissions in professor data');
        } else {
          console.warn('⚠️ Assignment not found in professor data');
        }
        
        try {
          localStorage.setItem('professor_classes', JSON.stringify(profClasses));
          console.log('✅ Saved to localStorage');
        } catch (storageError) {
          if (storageError.name === 'QuotaExceededError') {
            console.error('⚠️ Storage quota exceeded');
            throw new Error('Storage full. Please ask your professor to clear old data, or avoid uploading large files.');
          } else {
            throw storageError;
          }
        }
      } else {
        console.warn('⚠️ Class not found in professor data');
      }
    } else {
      console.warn('⚠️ No professor classes data found');
    }
    
    // ✅ FIX: Reload data and close modal properly
    await loadClassAssignments();
    await loadAllAssignments();
    updateDashboardStats();
    
    const modal = document.getElementById('submission-modal');
    if (modal) {
      modal.style.display = 'none';
      document.getElementById('submission-text').value = '';
      document.getElementById('submission-files').value = '';
      document.getElementById('submission-files-chosen').textContent = 'No files selected';
      
      // ✅ FIX: Reset submit button
      const submitBtn = document.getElementById('submit-assignment');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Assignment';
      }
    }
    
    addNotification(
      'submission',
      'Assignment Submitted',
      `Successfully submitted "${assignment.title}" to ${classItem.name}`,
      `class:${currentClassId}`
    );

    // Show simple confirmation
    const confirmDiv = document.createElement('div');
    confirmDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    confirmDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <i class="fas fa-check-circle" style="font-size: 1.5rem;"></i>
        <div>
          <strong>Assignment Submitted!</strong>
          <div style="font-size: 0.85rem; margin-top: 0.25rem;">Successfully submitted to ${classItem.name}</div>
        </div>
      </div>
    `;
    document.body.appendChild(confirmDiv);

    setTimeout(() => {
      confirmDiv.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => confirmDiv.remove(), 300);
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error in saveSubmission:', error);
    
    // ✅ FIX: Reset submit button on error
    const submitBtn = document.getElementById('submit-assignment');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Assignment';
    }
    
    throw error;
  }
}

function viewSubmission(assignmentId) {
  const classItem = enrolledClasses.find(c => c.id === currentClassId);
  if (!classItem) {
    alert('❌ Class not found');
    return;
  }
  
  // ✅ FIX: Load fresh assignment data from professor's localStorage
  const professorClasses = localStorage.getItem('professor_classes');
  let assignment = null;
  
  if (professorClasses) {
    try {
      const profClasses = JSON.parse(professorClasses);
      const matchingClass = profClasses.find(pc => pc.code === classItem.code);
      if (matchingClass && matchingClass.assignments) {
        assignment = matchingClass.assignments.find(a => String(a.id) === String(assignmentId));
        console.log('✅ Found assignment from professor data:', assignment);
      }
    } catch (e) {
      console.error('Error loading professor data:', e);
    }
  }
  
  // Fallback to class assignments
  if (!assignment && classItem.assignments) {
    assignment = classItem.assignments.find(a => String(a.id) === String(assignmentId));
  }
  
  if (!assignment) {
    alert('❌ Assignment not found');
    return;
  }
  
  const submission = assignment.submissions ? 
    assignment.submissions.find(s => String(s.studentId) === String(studentData.id)) : null;
  
  if (!submission) {
    alert('❌ No submission found');
    return;
  }
  
  const dueDate = new Date(assignment.dueDate);
  const isPastDue = new Date() > dueDate;
  const isGraded = submission.grade !== undefined && submission.grade !== null;
  const isArchived = classItem.archived || false;
  
  // ✅ Remove existing modal first
  const existingModal = document.getElementById('view-submission-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.style.zIndex = '10001';
  modal.id = 'view-submission-modal';
  
  let modalHTML = `
    <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <h3><i class="fas fa-file-alt"></i> Your Submission</h3>
        <button class="close-btn" onclick="closeViewSubmissionModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding: 2rem;">
        <div style="margin-bottom: 1.5rem;">
          <strong style="color: #333; display: block; margin-bottom: 0.5rem;">
            <i class="fas fa-clock"></i> Submitted:
          </strong>
          <p style="padding: 0.75rem; background: #f8f9fa; border-radius: 6px;">
            ${new Date(submission.date).toLocaleString()}
          </p>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <strong style="color: #333; display: block; margin-bottom: 0.5rem;">
            <i class="fas fa-file-alt"></i> Content:
          </strong>
          <div style="padding: 1.25rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #4a90a4; white-space: pre-wrap; line-height: 1.6;">
            ${submission.content || 'No content provided'}
          </div>
        </div>
  `;
  
  if (submission.files && submission.files.length > 0) {
    modalHTML += `
      <div style="margin-bottom: 1.5rem;">
        <strong style="color: #333; display: block; margin-bottom: 0.75rem;">
          <i class="fas fa-paperclip"></i> Attached Files (${submission.files.length}):
        </strong>
        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
          ${submission.files.map(file => {
            const fileSource = file.url || file.content || '';
            const escapedName = file.name.replace(/'/g, "\\'");
            const escapedSource = fileSource.replace(/'/g, "\\'");
            
            return `
              <a href="#" 
                onclick="downloadFile('${escapedName}', '${escapedSource}'); return false;" 
                style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: #e8f4f8; color: #4a90a4; text-decoration: none; border-radius: 6px; font-size: 0.9rem; font-weight: 500; transition: all 0.2s ease;"
                onmouseover="this.style.background='#d0e8f0'; this.style.transform='translateY(-2px)'"
                onmouseout="this.style.background='#e8f4f8'; this.style.transform='translateY(0)'">
                <i class="fas fa-download"></i> ${file.name}
              </a>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  if (isGraded) {
    const percentage = ((submission.grade / assignment.points) * 100).toFixed(1);
    let gradeColor = '#dc3545';
    if (percentage >= 80) gradeColor = '#28a745';
    else if (percentage >= 60) gradeColor = '#fd7e14';
    
    modalHTML += `
      <div style="margin-bottom: 1.5rem;">
        <strong style="color: #333; display: block; margin-bottom: 0.5rem;">
          <i class="fas fa-star"></i> Grade:
        </strong>
        <div style="padding: 1rem; background: ${gradeColor}20; border-radius: 6px; color: ${gradeColor}; font-size: 1.1rem; font-weight: 600; border: 2px solid ${gradeColor};">
          ${submission.grade}/${assignment.points} (${percentage}%)
        </div>
      </div>
    `;
  } else {
    modalHTML += `
      <div style="margin-bottom: 1.5rem;">
        <div style="padding: 1rem; background: #fff3cd; border-radius: 6px; color: #856404; font-weight: 500;">
          <i class="fas fa-hourglass-half"></i> Not graded yet
        </div>
      </div>
    `;
  }
  
  if (submission.feedback) {
    modalHTML += `
      <div style="margin-bottom: 1.5rem;">
        <strong style="color: #333; display: block; margin-bottom: 0.5rem;">
          <i class="fas fa-comment"></i> Feedback:
        </strong>
        <div style="padding: 1.25rem; background: #e8f4f8; border-radius: 8px; border-left: 4px solid #17a2b8; line-height: 1.6;">
          ${submission.feedback}
        </div>
      </div>
    `;
  }
  
  // ✅ FIX: Add unsubmit button with proper conditions
  if (!isGraded && !isPastDue && !isArchived) {
    modalHTML += `
      <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 2px solid #e0e0e0;">
        <button onclick="unsubmitAssignment('${assignmentId}')" 
                class="btn-danger" 
                style="width: 100%;">
          <i class="fas fa-undo"></i> Unsubmit Assignment
        </button>
        <small style="display: block; text-align: center; margin-top: 0.5rem; color: #666;">
          You can unsubmit and resubmit before the deadline
        </small>
      </div>
    `;
  } else if (isGraded) {
    modalHTML += `
      <div style="margin-top: 1rem; text-align: center; color: #666; font-size: 0.9rem;">
        <i class="fas fa-lock"></i> Cannot unsubmit - assignment has been graded
      </div>
    `;
  } else if (isPastDue) {
    modalHTML += `
      <div style="margin-top: 1rem; text-align: center; color: #666; font-size: 0.9rem;">
        <i class="fas fa-lock"></i> Cannot unsubmit - deadline has passed
      </div>
    `;
  } else if (isArchived) {
    modalHTML += `
      <div style="margin-top: 1rem; text-align: center; color: #666; font-size: 0.9rem;">
        <i class="fas fa-archive"></i> Cannot unsubmit - class is archived
      </div>
    `;
  }
  
  modalHTML += `
      </div>
    </div>
  `;
  
  modal.innerHTML = modalHTML;
  document.body.appendChild(modal);
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeViewSubmissionModal();
    }
  });
  
  console.log('✅ Submission modal opened successfully');
}

function closeViewSubmissionModal() {
  const modal = document.getElementById('view-submission-modal');
  if (modal) {
    modal.remove();
  }
}

async function unsubmitAssignment(assignmentId) {
  if (!confirm('⚠️ Are you sure you want to unsubmit this assignment?\n\nThis will remove your submission and you can submit again before the deadline.')) {
    return;
  }
  
  console.log('🔄 Unsubmitting assignment:', assignmentId);
  
  try {
    const response = await fetch('/api/student/unsubmit_assignment', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        assignment_id: String(assignmentId),
        class_id: String(currentClassId)
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to unsubmit');
    }
    
    console.log('✅ Unsubmitted successfully');
    
    // Close view submission modal
    closeViewSubmissionModal();
    
    // ✅ Force reload from database
    await loadEnrolledClasses();
    
    // Refresh class view if open
    if (currentClassId) {
      const currentClass = enrolledClasses.find(c => c.id === currentClassId);
      if (currentClass) {
        await loadClassDataFromDatabase(currentClass);
        loadClassAssignments();
      }
    }
    
    // Refresh all assignments view
    await loadAllAssignments();
    
    // Update stats
    updateDashboardStats();
    
    showSuccessToast('Assignment Unsubmitted!', 'You can now resubmit this assignment');
    
  } catch (error) {
    console.error('❌ Error unsubmitting:', error);
    alert('❌ ' + error.message);
  }
}

// ✅ ADD: Function to update local data after unsubmit
async function updateLocalDataAfterUnsubmit(assignmentId) {
  try {
    console.log('🔄 Updating local data after unsubmit...');
    
    const classItem = enrolledClasses.find(c => c.id === currentClassId);
    if (!classItem) return;

    // Update professor's localStorage data
    const professorClasses = localStorage.getItem('professor_classes');
    if (professorClasses) {
      try {
        const profClasses = JSON.parse(professorClasses);
        const matchingClass = profClasses.find(pc => pc.code === classItem.code);
        
        if (matchingClass && matchingClass.assignments) {
          const assignment = matchingClass.assignments.find(a => String(a.id) === String(assignmentId));
          if (assignment && assignment.submissions) {
            // Remove the submission
            assignment.submissions = assignment.submissions.filter(
              s => String(s.studentId) !== String(studentData.id)
            );
            console.log('✅ Removed submission from professor data');
            
            // Save back to localStorage
            localStorage.setItem('professor_classes', JSON.stringify(profClasses));
          }
        }
      } catch (e) {
        console.error('Error updating professor data:', e);
      }
    }

    // Update enrolled classes data
    if (classItem.assignments) {
      const assignment = classItem.assignments.find(a => String(a.id) === String(assignmentId));
      if (assignment && assignment.submissions) {
        assignment.submissions = assignment.submissions.filter(
          s => String(s.studentId) !== String(studentData.id)
        );
        console.log('✅ Removed submission from enrolled classes data');
      }
    }

    // Refresh the UI
    await refreshStudentData();
    
  } catch (error) {
    console.error('❌ Error updating local data:', error);
  }
}

// FIND loadClassGrades function and UPDATE it:
async function loadClassGrades() {
  const classItem = enrolledClasses.find(c => c.id === currentClassId);
  const gradesContainer = document.getElementById('grades-container');
  
  if (!classItem || !gradesContainer) return;
  
  gradesContainer.innerHTML = '<div style="text-align:center;padding:2rem;"><i class="fas fa-spinner fa-spin"></i> Loading grades...</div>';
  
  try {
    // ✅ FIX: Always fetch fresh assignments from database
    const response = await fetch(`/api/professor/classes/${currentClassId}/assignments`);
    if (response.ok) {
      classItem.assignments = await response.json();
      console.log('✅ Loaded fresh assignments for grades:', classItem.assignments.length);
    }
  } catch (e) {
    console.error('Error loading assignments:', e);
  }
  
  gradesContainer.innerHTML = '';
  
  if (!classItem.assignments || classItem.assignments.length === 0) {
    gradesContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-chart-line"></i>
        <h3>No Grades Available</h3>
        <p>Grades will appear here once assignments are graded</p>
      </div>
    `;
    return;
  }
  
  let gradesHTML = `
    <div class="grades-table">
      <table>
        <thead>
          <tr>
            <th>Assignment</th>
            <th>Due Date</th>
            <th>Points</th>
            <th>Your Grade</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  let totalEarned = 0;
  let totalPossible = 0;
  let gradedCount = 0;
  let hasGradedAssignments = false;
  
  classItem.assignments.forEach(assignment => {
    const submission = assignment.submissions ? 
      assignment.submissions.find(s => String(s.studentId) === String(studentData.id)) : null;
    
    const isSubmitted = !!submission;
    const isGraded = isSubmitted && submission.grade !== undefined && submission.grade !== null;
    
    let gradeDisplay = '-';
    let status = 'Not Submitted';
    
    if (isGraded) {
      gradeDisplay = `${submission.grade}/${assignment.points}`;
      status = 'Graded';
      totalEarned += submission.grade;
      totalPossible += assignment.points;
      gradedCount++;
      hasGradedAssignments = true;
    } else if (isSubmitted) {
      gradeDisplay = `Pending`;
      status = 'Submitted';
    }
    
    gradesHTML += `
      <tr>
        <td>${assignment.title}</td>
        <td>${new Date(assignment.dueDate).toLocaleDateString()}</td>
        <td>${assignment.points}</td>
        <td><strong>${gradeDisplay}</strong></td>
        <td><span class="status ${status.toLowerCase().replace(' ', '-')}">${status}</span></td>
      </tr>
    `;
  });
  
  gradesHTML += `</tbody></table></div>`;
  
  if (hasGradedAssignments && totalPossible > 0) {
    const classAverage = (totalEarned / totalPossible * 100).toFixed(2);
    gradesHTML = `
      <div class="class-average">
        <h4>Class Average: ${classAverage}%</h4>
        <p>${gradedCount} assignment(s) graded out of ${classItem.assignments.length}</p>
      </div>
    ` + gradesHTML;
  }
  
  gradesContainer.innerHTML = gradesHTML;
}

function loadMissedTasks() {
  const missedTasksList = document.getElementById('missed-tasks-list');
  if (!missedTasksList) return;
  
  missedTasksList.innerHTML = '<div style="text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #4a90a4;"></i><p style="margin-top: 1rem; color: #666;">Loading missed tasks...</p></div>';
  
  const now = new Date();
  let missedTasks = [];
  
  const professorClasses = localStorage.getItem('professor_classes');
  let profClasses = [];
  if (professorClasses) {
    try {
      profClasses = JSON.parse(professorClasses);
    } catch (e) {
      console.error('Error loading professor data:', e);
    }
  }
  
  enrolledClasses.forEach(classItem => {
    const matchingClass = profClasses.find(pc => pc.code === classItem.code);
    const assignments = matchingClass && matchingClass.assignments ? 
                       matchingClass.assignments : (classItem.assignments || []);
    
    if (assignments) {
      assignments.forEach(assignment => {
        const dueDate = new Date(assignment.dueDate);
        const submission = assignment.submissions ? 
          assignment.submissions.find(s => String(s.studentId) === String(studentData.id)) : null;
        
        if (!submission && dueDate < now) {
          const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
          
          let severity = 'mild';
          if (daysOverdue > 7) severity = 'severe';
          else if (daysOverdue > 3) severity = 'warning';
          
          missedTasks.push({
            ...assignment,
            className: classItem.name,
            classId: classItem.id,
            daysOverdue: daysOverdue,
            severity: severity,
            dueDate: dueDate
          });
        }
      });
    }
  });
  
  missedTasks.sort((a, b) => b.daysOverdue - a.daysOverdue);
  
  const missedTasksCount = document.getElementById('missed-tasks-count');
  if (missedTasksCount) {
    missedTasksCount.textContent = missedTasks.length;
  }
  
  missedTasksList.innerHTML = '';
  
  if (missedTasks.length === 0) {
    missedTasksList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-check-circle" style="color: #28a745; font-size: 3rem;"></i>
        <h3 style="color: #28a745;">No Missed Tasks!</h3>
        <p>You're all caught up! Keep up the great work.</p>
      </div>
    `;
    return;
  }
  
  missedTasks.forEach(task => {
    const taskElement = document.createElement('div');
    taskElement.className = `missed-task-item ${task.severity}`;
    
    const severityText = {
      'mild': `${task.daysOverdue} day${task.daysOverdue > 1 ? 's' : ''} overdue`,
      'warning': `${task.daysOverdue} days overdue - Action needed`,
      'severe': `${task.daysOverdue} days overdue - Critical!`
    };
    
    const severityIcon = {
      'mild': 'fa-exclamation-circle',
      'warning': 'fa-exclamation-triangle',
      'severe': 'fa-times-circle'
    };
    
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    const videoFiles = [];
    const otherFiles = [];
    
    if (task.files && task.files.length > 0) {
      task.files.forEach(file => {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (videoExtensions.includes(fileExtension)) {
          videoFiles.push(file);
        } else {
          otherFiles.push(file);
        }
      });
    }
    
    taskElement.innerHTML = `
      <div class="missed-task-header">
        <div class="missed-task-info">
          <h4>${task.title}</h4>
          <p class="class-name">${task.className}</p>
        </div>
        <div class="missed-task-status">
          <span class="overdue-badge ${task.severity}">
            <i class="fas ${severityIcon[task.severity]}"></i>
            ${severityText[task.severity]}
          </span>
        </div>
      </div>
      
      <p class="missed-task-description">${task.description}</p>
      
      <div class="missed-task-details">
        <span><i class="fas fa-calendar-times"></i> <strong>Due Date:</strong> ${task.dueDate.toLocaleDateString()}</span>
        <span><i class="fas fa-file-alt"></i> <strong>Points:</strong> ${task.points}</span>
        <span><i class="fas fa-clock"></i> <strong>Overdue by:</strong> ${task.daysOverdue} day${task.daysOverdue > 1 ? 's' : ''}</span>
      </div>
      
      ${task.instructions ? `
        <div class="missed-task-instructions">
          <strong><i class="fas fa-info-circle"></i> Instructions:</strong>
          <p>${task.instructions}</p>
        </div>
      ` : ''}
      
      ${videoFiles.length > 0 ? `
        <div class="assignment-videos" style="margin: 1.5rem 0; padding: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
          <strong style="color: white; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; font-size: 1.1rem;">
            <i class="fas fa-video"></i> Video Resources:
          </strong>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${videoFiles.map(file => {
              const fileSource = file.url || file.content || '';
              const escapedName = file.name.replace(/'/g, "\\'");
              const escapedSource = fileSource.replace(/'/g, "\\'");
              
              return `
                <button 
                  onclick="downloadFile('${escapedName}', '${escapedSource}')" 
                  style="display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: rgba(255, 255, 255, 0.95); border: none; border-radius: 8px; cursor: pointer; transition: all 0.3s ease; text-align: left; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                  onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'">
                  <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas fa-play" style="color: white; font-size: 1.5rem;"></i>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; color: #2d3748; font-size: 1rem; margin-bottom: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${file.name}
                    </div>
                    <div style="color: #718096; font-size: 0.875rem;">
                      ${file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Video file'}
                    </div>
                  </div>
                  <i class="fas fa-chevron-right" style="color: #cbd5e0; font-size: 1.2rem;"></i>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
      
      ${otherFiles.length > 0 ? `
        <div class="assignment-files">
          <strong>Other Resources:</strong>
          <ul>
            ${otherFiles.map(file => {
              const fileSource = file.url || file.content || '';
              const escapedName = file.name.replace(/'/g, "\\'");
              const escapedSource = fileSource.replace(/'/g, "\\'");
              
              return `
                <li>
                  <a href="#" onclick="downloadFile('${escapedName}', '${escapedSource}'); return false;">
                    <i class="fas fa-download"></i> ${file.name}
                  </a>
                </li>
              `;
            }).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div class="missed-task-actions">
        <button class="btn-primary" onclick="openClass('${task.classId}'); setTimeout(() => switchTab('assignments'), 300);" style="background: #28a745;">
          <i class="fas fa-paper-plane"></i> Submit Now
        </button>
        <button class="btn-secondary" onclick="contactProfessor('${task.classId}', '${task.title.replace(/'/g, "\\'")}')">
          <i class="fas fa-envelope"></i> Contact Professor
        </button>
      </div>
    `;
    
    missedTasksList.appendChild(taskElement);
  });
}

function contactProfessor(classId, assignmentTitle) {
  const classItem = enrolledClasses.find(c => c.id === classId);
  if (!classItem) return;
  
  // ✅ FIX: Show modal with professor contact information
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.style.zIndex = '10001';
  modal.id = 'professor-contact-modal';
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header" style="background: #4a90a4; color: white;">
        <h3><i class="fas fa-envelope"></i> Contact Professor</h3>
        <button class="close-btn" onclick="closeProfessorContactModal()" style="color: white;">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding: 2rem;">
        <div style="background: #e8f4f8; padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; border-left: 4px solid #4a90a4;">
          <h4 style="margin: 0 0 1rem 0; color: #333;">
            <i class="fas fa-user-tie"></i> Professor Information
          </h4>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div>
              <strong style="color: #666;">Name:</strong>
              <div style="color: #333; font-size: 1.1rem; font-weight: 600;">${classItem.professor_name || 'Professor'}</div>
            </div>
            <div>
              <strong style="color: #666;">Class:</strong>
              <div style="color: #333;">${classItem.name} (${classItem.code})</div>
            </div>
            <div>
              <strong style="color: #666;">Assignment:</strong>
              <div style="color: #dc3545; font-weight: 600;">${assignmentTitle}</div>
            </div>
          </div>
        </div>
        
        <div style="background: #fff3cd; padding: 1rem; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 1.5rem;">
          <p style="margin: 0; color: #856404; line-height: 1.6;">
            <strong><i class="fas fa-info-circle"></i> How to Contact:</strong><br>
            Please use your school email system or the professor's office hours to discuss this missed assignment. 
            You can also check your class syllabus for the professor's preferred contact method.
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px;">
          <h4 style="margin: 0 0 1rem 0; color: #333;">
            <i class="fas fa-lightbulb"></i> What to Include in Your Message:
          </h4>
          <ul style="margin: 0; padding-left: 1.5rem; line-height: 1.8; color: #666;">
            <li>Your full name and student ID</li>
            <li>Class name and code: <strong>${classItem.name} (${classItem.code})</strong></li>
            <li>Assignment name: <strong>${assignmentTitle}</strong></li>
            <li>Reason for missing the deadline</li>
            <li>Request for deadline extension if needed</li>
          </ul>
        </div>
      </div>
      <div class="modal-footer" style="display: flex; gap: 1rem; justify-content: center;">
        <button onclick="closeProfessorContactModal()" class="btn-primary" style="min-width: 150px;">
          <i class="fas fa-check"></i> Got It
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeProfessorContactModal();
    }
  });
}

function closeProfessorContactModal() {
  const modal = document.getElementById('professor-contact-modal');
  if (modal) {
    modal.remove();
  }
}

// REPLACE the loadAllAssignments function:
function loadAllAssignments() {
  const assignmentsList = document.getElementById('assignments-list');
  if (!assignmentsList) return;
  
  const filter = document.getElementById('assignment-filter') ? 
                 document.getElementById('assignment-filter').value : 'all';
  
  assignmentsList.innerHTML = '';
  
  let allAssignments = [];
  
  const professorClasses = localStorage.getItem('professor_classes');
  let profClasses = [];
  if (professorClasses) {
    try {
      profClasses = JSON.parse(professorClasses);
      console.log('✅ Professor classes loaded:', profClasses.length);
    } catch (e) {
      console.error('Error loading professor assignments:', e);
    }
  }
  
  enrolledClasses.forEach(classItem => {
    const matchingClass = profClasses.find(pc => pc.code === classItem.code);
    const assignments = matchingClass && matchingClass.assignments ? 
                       matchingClass.assignments : (classItem.assignments || []);
    
    console.log(`Class ${classItem.name}: ${assignments.length} assignments`);
    
    if (assignments && assignments.length > 0) {
      assignments.forEach(assignment => {
        const submission = assignment.submissions ? 
          assignment.submissions.find(s => String(s.studentId) === String(studentData.id)) : null;
        
        allAssignments.push({
          ...assignment,
          className: classItem.name,
          classId: classItem.id,
          isSubmitted: !!submission,
          // ✅ FIX: Only true if actually graded with a value >= 0
          isGraded: !!submission && submission.grade !== undefined && submission.grade !== null && submission.grade >= 0,
          isOverdue: new Date(assignment.dueDate) < new Date() && !submission,
          submission: submission
        });
      });
    }
  });
  
  console.log('✅ Total assignments found:', allAssignments.length);
  
  // ✅ FIX: Apply filter correctly
  if (filter === 'pending') {
    allAssignments = allAssignments.filter(a => !a.isSubmitted && !a.isOverdue);
  } else if (filter === 'submitted') {
    allAssignments = allAssignments.filter(a => a.isSubmitted && !a.isGraded);
  } else if (filter === 'graded') {
    allAssignments = allAssignments.filter(a => a.isGraded);
  }
  
  allAssignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  
  if (allAssignments.length === 0) {
    assignmentsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-tasks"></i>
        <h3>No Assignments</h3>
        <p>${filter !== 'all' ? `No ${filter} assignments` : 'No assignments found'}</p>
      </div>
    `;
    return;
  }
  
  allAssignments.forEach(assignment => {
    const assignmentElement = document.createElement('div');
    assignmentElement.className = `assignment-item ${assignment.isOverdue ? 'overdue' : ''} ${assignment.isGraded ? 'graded' : ''}`;
    assignmentElement.innerHTML = `
      <div class="assignment-info">
        <h4>${assignment.title}</h4>
        <p class="class-name">${assignment.className}</p>
        <p class="assignment-description">${assignment.description}</p>
        <div class="assignment-meta">
          <span class="due-date ${assignment.isOverdue ? 'overdue' : ''}">
            <i class="fas fa-clock"></i> Due: ${new Date(assignment.dueDate).toLocaleDateString()}
            ${assignment.isOverdue ? ' (Overdue)' : ''}
          </span>
          <span class="points"><i class="fas fa-file-alt"></i> ${assignment.points} Points</span>
        </div>
      </div>
      <div class="assignment-status">
        <span class="status ${assignment.isGraded ? 'graded' : assignment.isSubmitted ? 'submitted' : 'pending'}">
          ${assignment.isGraded ? 'Graded' : assignment.isSubmitted ? 'Submitted' : 'Not Submitted'}
        </span>
        ${assignment.isGraded ? `
          <span class="grade">${assignment.submission.grade}/${assignment.points}</span>
        ` : ''}
        <div class="assignment-actions">
          ${!assignment.isSubmitted ? `
            <button class="btn-primary" onclick="openClass('${assignment.classId}'); setTimeout(() => switchTab('assignments'), 300);">
              Submit
            </button>
          ` : `
            <button class="btn-secondary" onclick="openClass('${assignment.classId}'); setTimeout(() => switchTab('assignments'), 300);">
              View
            </button>
          `}
        </div>
      </div>
    `;
    assignmentsList.appendChild(assignmentElement);
  });
}

function filterAssignments(filter) {
  loadAllAssignments();
}

function downloadFile(filename, urlOrContent) {
    console.log('📥 Downloading file:', filename);
    
    if (urlOrContent && urlOrContent.startsWith('/uploads/')) {
        const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
        const fileExtension = filename.split('.').pop().toLowerCase();
        const isVideo = videoExtensions.includes(fileExtension);
        
        if (isVideo) {
            showVideoPlayer(filename, urlOrContent);
            return;
        }
        
        const link = document.createElement('a');
        link.href = urlOrContent;
        link.download = filename;
        link.target = '_blank';
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
        }, 100);
        
        return;
    }
    
    if (urlOrContent && urlOrContent.startsWith('data:')) {
        try {
            const link = document.createElement('a');
            link.href = urlOrContent;
            link.download = filename;
            
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
            }, 100);
            
        } catch (e) {
            console.error('❌ Error downloading file:', e);
            alert('Error downloading file: ' + e.message);
        }
        return;
    }
    
    console.error('❌ Invalid file format:', urlOrContent ? urlOrContent.substring(0, 50) : 'empty');
    alert('⚠️ Invalid file format. Please contact your professor.');
}

function updateGradeFilter() {
  const gradeFilter = document.getElementById('grade-filter');
  if (!gradeFilter) return;
  
  gradeFilter.innerHTML = '<option value="all">All Classes</option>';
  
  enrolledClasses.forEach(classItem => {
    const option = document.createElement('option');
    option.value = classItem.id;
    option.textContent = classItem.name;
    gradeFilter.appendChild(option);
  });
}

function initializeCalendar() {
  const monthYear = document.getElementById('month-year');
  const calendarDays = document.getElementById('calendar-days');
  const prevMonth = document.getElementById('prev-month');
  const nextMonth = document.getElementById('next-month');
  
  if (!monthYear || !calendarDays) return;
  
  let currentDate = new Date();
  
  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    monthYear.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;
    
    calendarDays.innerHTML = '';
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Create empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'calendar-day empty';
      calendarDays.appendChild(emptyCell);
    }
    
    // Create cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      dayElement.textContent = day;
      
      // Simple click handler - no assignment deadlines
      dayElement.addEventListener('click', () => {
        showEventsForDate(year, month, day);
      });
      
      calendarDays.appendChild(dayElement);
    }
  }
  
  function showEventsForDate(year, month, day) {
    const selectedDate = document.getElementById('selected-date');
    const eventList = document.getElementById('event-list');
    
    if (!selectedDate || !eventList) return;
    
    const date = new Date(year, month, day);
    selectedDate.textContent = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Simple message - no assignment deadlines
    eventList.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #666;">
        <i class="fas fa-calendar-plus" style="font-size: 3rem; margin-bottom: 1rem;"></i>
        <p>No events scheduled for this day</p>
        <small>Add personal events in your calendar app</small>
      </div>
    `;
  }
  
  // Navigation event listeners
  if (prevMonth) {
    prevMonth.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
    });
  }
  
  if (nextMonth) {
    nextMonth.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
    });
  }
  
  // Initial render
  renderCalendar();
}

async function updateDashboardStats() {
  try {
    const response = await fetch('/api/student/stats');
    if (response.ok) {
      const stats = await response.json();
      
      document.getElementById('enrolled-classes-count').textContent = stats.enrolled_classes;
      
      calculateDashboardStats();
    } else {
      calculateDashboardStats();
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
    calculateDashboardStats();
  }
  
  updateDeadlineList();
  updateRecentActivity();
}

function calculateDashboardStats() {
  const enrolledClassesCount = enrolledClasses.length;
  let pendingAssignments = 0;
  let upcomingDeadlines = 0;
  let completedAssignments = 0;
  let missedTasks = 0;
  let totalEarned = 0;
  let totalPossible = 0;
  let gradedCount = 0;
  
  // ✅ FIX: Load fresh data from professor's localStorage
  const professorClasses = localStorage.getItem('professor_classes');
  let profClasses = [];
  if (professorClasses) {
    try {
      profClasses = JSON.parse(professorClasses);
    } catch (e) {
      console.error('Error loading professor data:', e);
    }
  }
  
  const now = new Date();
  
  enrolledClasses.forEach(classItem => {
    // ✅ FIX: Get assignments from professor data
    const matchingClass = profClasses.find(pc => pc.code === classItem.code);
    const assignments = matchingClass && matchingClass.assignments ? 
                       matchingClass.assignments : (classItem.assignments || []);
    
    console.log(`📊 Stats for ${classItem.name}:`, assignments.length, 'assignments');
    
    if (assignments) {
      assignments.forEach(assignment => {
        const submission = assignment.submissions ? 
          assignment.submissions.find(s => String(s.studentId) === String(studentData.id)) : null;
        
        const dueDate = new Date(assignment.dueDate);
        
        if (submission) {
          completedAssignments++;
          
          // ✅ Calculate grades
          // ✅ FIX: Only count as graded if grade is actually set
          if (submission && submission.grade !== undefined && submission.grade !== null && submission.grade >= 0) {
            totalEarned += submission.grade;
            totalPossible += assignment.points;
            gradedCount++;
            completedAssignments++; // Only increment completed when graded
            console.log(`📊 Grade found: ${submission.grade}/${assignment.points}`);
          
          } else if (submission) {
            // Submitted but not graded yet
            completedAssignments++;
            console.log(`✅ Submitted (not graded): ${assignment.title}`);
          }
          
          console.log(`✅ Completed: ${assignment.title}`);
        } else {
          if (dueDate > now) {
            pendingAssignments++;
            console.log(`⏳ Pending: ${assignment.title}`);
          } else {
            missedTasks++;
            console.log(`❌ Missed: ${assignment.title}`);
          }
        }
        
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue >= 0 && daysUntilDue <= 7 && !submission) {
          upcomingDeadlines++;
        }
      });
    }
  });
  
  // ✅ FIX: Update DOM immediately
  console.log('📊 Final Stats:', {
    enrolled: enrolledClassesCount,
    pending: pendingAssignments,
    upcoming: upcomingDeadlines,
    completed: completedAssignments,
    missed: missedTasks,
    graded: gradedCount,
    averageGrade: totalPossible > 0 ? (totalEarned / totalPossible * 100).toFixed(2) : 0
  });
  
  document.getElementById('enrolled-classes-count').textContent = enrolledClassesCount;
  document.getElementById('pending-assignments').textContent = pendingAssignments;
  // document.getElementById('upcoming-deadlines').textContent = upcomingDeadlines;
  document.getElementById('completed-assignments').textContent = completedAssignments;
  
  const missedTasksCount = document.getElementById('missed-tasks-count');
  if (missedTasksCount) {
    missedTasksCount.textContent = missedTasks;
  }
  
  // ✅ FIX: Update overall grade display
  const overallGrade = document.getElementById('overall-grade');
  if (overallGrade) {
    if (totalPossible > 0) {
      const average = (totalEarned / totalPossible * 100).toFixed(2);
      overallGrade.textContent = average + '%';
    } else {
      overallGrade.textContent = '0.00%';
    }
  }
  
  const completedAssignmentsCount = document.getElementById('completed-assignments-count');
  if (completedAssignmentsCount) {
    completedAssignmentsCount.textContent = gradedCount;
  }
  
  const pendingAssignmentsCount = document.getElementById('pending-assignments-count');
  if (pendingAssignmentsCount) {
    pendingAssignmentsCount.textContent = pendingAssignments;
  }
}

function updateDeadlineList() {
  const deadlineList = document.getElementById('deadline-list');
  if (!deadlineList) return;
  
  deadlineList.innerHTML = '';
  
  let allDeadlines = [];
  
  const professorClasses = localStorage.getItem('professor_classes');
  let profClasses = [];
  if (professorClasses) {
    try {
      profClasses = JSON.parse(professorClasses);
    } catch (e) {
      console.error('Error loading professor data:', e);
    }
  }
  
  enrolledClasses.forEach(classItem => {
    const matchingClass = profClasses.find(pc => pc.code === classItem.code);
    const assignments = matchingClass && matchingClass.assignments ? matchingClass.assignments : (classItem.assignments || []);
    
    if (assignments) {
      assignments.forEach(assignment => {
        const submission = assignment.submissions ? 
          assignment.submissions.find(s => s.studentId === String(studentData.id)) : null;
        
        if (!submission) {
          const dueDate = new Date(assignment.dueDate);
          const today = new Date();
          
          if (dueDate > today) {
            allDeadlines.push({
              title: assignment.title,
              class: classItem.name,
              dueDate: dueDate,
              classId: classItem.id
            });
          }
        }
      });
    }
  });
  
  allDeadlines.sort((a, b) => a.dueDate - b.dueDate);
  allDeadlines = allDeadlines.slice(0, 5);
  
  if (allDeadlines.length === 0) {
    deadlineList.innerHTML = '<li>No upcoming deadlines</li>';
    return;
  }
  
  allDeadlines.forEach(deadline => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="deadline-title">${deadline.title}</span>
      <span class="deadline-class">${deadline.class}</span>
      <span class="deadline-date">${deadline.dueDate.toLocaleDateString()}</span>
      <button class="btn-small" onclick="openClass('${deadline.classId}')">View</button>
    `;
    deadlineList.appendChild(li);
  });
}

function updateRecentActivity() {
  const activityList = document.getElementById('activity-list');
  if (!activityList) return;
  
  activityList.innerHTML = '';
  
  let allActivities = [];
  
  enrolledClasses.forEach(classItem => {
    allActivities.push({
      type: 'enrollment',
      class: classItem.name,
      date: new Date(classItem.enrollmentDate || new Date()),
      classId: classItem.id
    });
    
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const submission = assignment.submissions ? 
          assignment.submissions.find(s => s.studentId === String(studentData.id)) : null;
        
        if (submission) {
          allActivities.push({
            type: 'submission',
            class: classItem.name,
            assignment: assignment.title,
            date: new Date(submission.date),
            classId: classItem.id
          });
        }
        
        allActivities.push({
          type: 'assignment_created',
          class: classItem.name,
          assignment: assignment.title,
          date: new Date(assignment.dateCreated || assignment.dueDate),
          classId: classItem.id
        });
      });
    }
    
    if (classItem.materials) {
      classItem.materials.forEach(material => {
        allActivities.push({
          type: 'material',
          class: classItem.name,
          material: material.title,
          date: new Date(material.date),
          classId: classItem.id
        });
      });
    }
  });
  
  allActivities.sort((a, b) => b.date - a.date);
  allActivities = allActivities.slice(0, 10);
  
  if (allActivities.length === 0) {
    activityList.innerHTML = '<li>No recent activity</li>';
    return;
  }
  
  allActivities.forEach(activity => {
    const li = document.createElement('li');
    
    let activityText = '';
    let icon = '';
    
    switch (activity.type) {
      case 'enrollment':
        activityText = `Enrolled in ${activity.class}`;
        icon = 'fas fa-user-plus';
        break;
      case 'submission':
        activityText = `Submitted "${activity.assignment}" in ${activity.class}`;
        icon = 'fas fa-paper-plane';
        break;
      case 'assignment_created':
        activityText = `New assignment "${activity.assignment}" in ${activity.class}`;
        icon = 'fas fa-tasks';
        break;
      case 'material':
        activityText = `New material "${activity.material}" in ${activity.class}`;
        icon = 'fas fa-file-upload';
        break;
    }
    
    li.innerHTML = `
      <i class="${icon}"></i>
      <div class="activity-content">
        <span class="activity-text">${activityText}</span>
        <span class="activity-date">${activity.date.toLocaleDateString()}</span>
      </div>
      <button class="btn-small" onclick="openClass('${activity.classId}')">View</button>
    `;
    activityList.appendChild(li);
  });
}

function showMessage(message, type) {
  const messageEl = document.getElementById('profile-message');
  if (!messageEl) return;
  
  messageEl.textContent = message;
  messageEl.className = `profile-message ${type}`;
  messageEl.style.display = 'block';
  
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 5000);
}

// ✅ FIX #2: Monitor for new grades and send notifications
function checkForNewGrades() {
  const lastCheck = localStorage.getItem('student_last_grade_check');
  const lastCheckTime = lastCheck ? new Date(lastCheck) : new Date(0);
  
  enrolledClasses.forEach(classItem => {
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const submission = assignment.submissions ? 
          assignment.submissions.find(s => String(s.studentId) === String(studentData.id)) : null;
        
        if (submission && submission.grade !== undefined) {
          const submissionDate = new Date(submission.date);
          
          if (submissionDate > lastCheckTime) {
            const percentage = ((submission.grade / assignment.points) * 100).toFixed(1);
            
            addNotification(
              'grade',
              'Grade Released',
              `"${assignment.title}" - ${submission.grade}/${assignment.points} (${percentage}%)`,
              `class:${classItem.id}`
            );
            
            if (submission.feedback) {
              addNotification(
                'feedback',
                'Feedback Received',
                `Your professor left feedback on "${assignment.title}"`,
                `class:${classItem.id}`
              );
            }
          }
        }
      });
    }
  });
  
  localStorage.setItem('student_last_grade_check', new Date().toISOString());
}

// ✅ FIX #2: Call check functions periodically
setInterval(() => {
  if (studentData && studentData.id) {
    checkForNewAssignments();
    checkUpcomingDeadlines();
    checkForNewGrades();
  }
}, 60000);

// ✅ FIX #2: Request notification permission on page load
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}

function downloadFile(filename, urlOrContent) {
  console.log('📥 Downloading/Playing file:', filename);
  
  // Check if it's a video file
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
  const fileExtension = filename.split('.').pop().toLowerCase();
  const isVideo = videoExtensions.includes(fileExtension);
  
  // ✅ If video, show player instead of downloading
  if (isVideo) {
    showVideoPlayer(filename, urlOrContent);
    return;
  }
  
  // ✅ For regular files, trigger download
  if (urlOrContent && urlOrContent.startsWith('/uploads/')) {
    // Server-hosted file
    const link = document.createElement('a');
    link.href = urlOrContent;
    link.download = filename;
    link.target = '_blank';
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
    
    return;
  }
  
  if (urlOrContent && urlOrContent.startsWith('data:')) {
    // Base64 encoded file
    try {
      const link = document.createElement('a');
      link.href = urlOrContent;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
    } catch (e) {
      console.error('❌ Error downloading file:', e);
      alert('Error downloading file: ' + e.message);
    }
    return;
  }
  
  console.error('❌ Invalid file format:', urlOrContent ? urlOrContent.substring(0, 50) : 'empty');
  alert('⚠️ Invalid file format. Please contact your professor.');
}

// ✅ Enhanced Video Player with better controls
function showVideoPlayer(filename, videoUrl) {
  console.log('🎬 Opening video player:', filename);
  
  const existingModal = document.getElementById('video-player-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.style.zIndex = '10001';
  modal.id = 'video-player-modal';
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 900px; max-height: 95vh; overflow: hidden;">
      <div class="modal-header">
        <h3><i class="fas fa-play-circle"></i> ${filename}</h3>
        <button class="close-btn" onclick="closeVideoPlayer()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding: 0; background: #000;">
        <video 
          id="assignment-video-player" 
          controls 
          style="width: 100%; max-height: 70vh; display: block;"
          autoplay>
          <source src="${videoUrl}" type="video/${filename.split('.').pop()}">
          Your browser does not support the video tag.
        </video>
      </div>
      <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem;">
        <div style="display: flex; gap: 1rem; align-items: center;">
          <button onclick="togglePlayPause()" class="btn-secondary" style="min-width: 100px;">
            <i class="fas fa-pause" id="play-pause-icon"></i> <span id="play-pause-text">Pause</span>
          </button>
          <button onclick="toggleFullscreen()" class="btn-secondary">
            <i class="fas fa-expand"></i> Fullscreen
          </button>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button onclick="changePlaybackSpeed(-0.25)" class="btn-outline" title="Slower">
            <i class="fas fa-backward"></i>
          </button>
          <span id="playback-speed" style="padding: 0.5rem 1rem; background: #f8f9fa; border-radius: 6px; font-weight: 600;">1.0x</span>
          <button onclick="changePlaybackSpeed(0.25)" class="btn-outline" title="Faster">
            <i class="fas fa-forward"></i>
          </button>
        </div>
        <a href="${videoUrl}" download="${filename}" class="btn-primary" style="text-decoration: none;">
          <i class="fas fa-download"></i> Download
        </a>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeVideoPlayer();
    }
  });
  
  document.addEventListener('keydown', videoKeyboardHandler);
}

function closeVideoPlayer() {
  const modal = document.getElementById('video-player-modal');
  if (modal) {
    const video = document.getElementById('assignment-video-player');
    if (video) {
      video.pause();
    }
    modal.remove();
    document.removeEventListener('keydown', videoKeyboardHandler);
  }
}

function togglePlayPause() {
  const video = document.getElementById('assignment-video-player');
  const icon = document.getElementById('play-pause-icon');
  const text = document.getElementById('play-pause-text');
  
  if (video.paused) {
    video.play();
    icon.className = 'fas fa-pause';
    text.textContent = 'Pause';
  } else {
    video.pause();
    icon.className = 'fas fa-play';
    text.textContent = 'Play';
  }
}

function toggleFullscreen() {
  const video = document.getElementById('assignment-video-player');
  
  if (!document.fullscreenElement) {
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
      video.msRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

function changePlaybackSpeed(delta) {
  const video = document.getElementById('assignment-video-player');
  const speedDisplay = document.getElementById('playback-speed');
  
  let newSpeed = video.playbackRate + delta;
  newSpeed = Math.max(0.25, Math.min(2.0, newSpeed));
  
  video.playbackRate = newSpeed;
  speedDisplay.textContent = newSpeed.toFixed(2) + 'x';
}

function videoKeyboardHandler(e) {
  const video = document.getElementById('assignment-video-player');
  if (!video) return;
  
  switch(e.key) {
    case ' ':
    case 'k':
      e.preventDefault();
      togglePlayPause();
      break;
    case 'f':
      e.preventDefault();
      toggleFullscreen();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      video.currentTime -= 5;
      break;
    case 'ArrowRight':
      e.preventDefault();
      video.currentTime += 5;
      break;
    case 'ArrowUp':
      e.preventDefault();
      video.volume = Math.min(1, video.volume + 0.1);
      break;
    case 'ArrowDown':
      e.preventDefault();
      video.volume = Math.max(0, video.volume - 0.1);
      break;
    case 'm':
      e.preventDefault();
      video.muted = !video.muted;
      break;
    case 'Escape':
      closeVideoPlayer();
      break;
  }
}

// Add to both professor-script.js and student-script.js
function showSuccessToast(title, message, type = 'success') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 
        'linear-gradient(135deg, #28a745 0%, #20c997 100%)' : 
        'linear-gradient(135deg, #17a2b8 0%, #138496 100%)';
    
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1.25rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        display: flex;
        align-items: center;
        gap: 1rem;
        min-width: 320px;
        max-width: 400px;
    `;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
    
    toast.innerHTML = `
        <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i class="fas ${icon}" style="font-size: 1.75rem;"></i>
        </div>
        <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 0.25rem;">${title}</div>
            <div style="font-size: 0.9rem; opacity: 0.95; line-height: 1.4;">${message}</div>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Add CSS animations
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px) scale(0.9);
        }
        to {
            opacity: 1;
            transform: translateX(0) scale(1);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0) scale(1);
        }
        to {
            opacity: 0;
            transform: translateX(100px) scale(0.9);
        }
    }
`;
document.head.appendChild(toastStyle);

// ✅ ADD THIS CSS TO THE END OF BOTH FILES (if not already present)
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
  
  @keyframes slideOutRight {
    from {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateX(100px) scale(0.9);
    }
  }
  
  /* Text overflow prevention */
  .class-card, .assignment-card, .post-card, .student-item, .missed-task-item {
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
  }
  
  .class-card h3, .assignment-card h4, .post-card h4 {
    word-break: break-word;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
`;
document.head.appendChild(style);


// localStorage.clear();
// window.location.reload();