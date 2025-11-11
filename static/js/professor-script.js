// Professor Dashboard JavaScript

// Global variables
let currentClassId = null;
let classes = [];
let assignments = [];
let submissions = [];
let calendarEvents = {};
let notifications = [];

// DOM Elements
const sidebar = document.getElementById('sidebar');
const contentSections = document.querySelectorAll('.content-section');
const navLinks = document.querySelectorAll('.sidebar nav a');
const profileDropdown = document.getElementById('profile-dropdown');
const dropdownMenu = document.getElementById('dropdown-menu');
// Added for Assignment/Material saving functions
const assignmentModal = document.getElementById('assignment-modal');
const gradingModal = document.getElementById('grading-modal');

if (!assignmentModal) {
    console.error('Assignment modal not found');
}
if (!gradingModal) {
    console.error('Grading modal not found');
}

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

// Load notifications from localStorage
function loadNotifications() {
  const userType = document.body.classList.contains('professor-dashboard') ? 'professor' : 'student';
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

// Add this near the top of both files (after DOMContentLoaded or in global scope)
function showSuccessToast(title, message, type = 'success') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 
        'linear-gradient(135deg, #28a745 0%, #20c997 100%)' : 
        type === 'info' ? 
        'linear-gradient(135deg, #17a2b8 0%, #138496 100%)' :
        type === 'warning' ?
        'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)' :
        'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
    
    const iconClass = type === 'success' ? 'fa-check-circle' : 
                     type === 'info' ? 'fa-info-circle' :
                     type === 'warning' ? 'fa-exclamation-triangle' :
                     'fa-times-circle';
    
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
    
    toast.innerHTML = `
        <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i class="fas ${iconClass}" style="font-size: 1.75rem;"></i>
        </div>
        <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 0.25rem;">${title}</div>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Error toast variant
function showErrorToast(title, message) {
    showSuccessToast(title, message, 'error');
}

// Info toast variant
function showInfoToast(title, message) {
    showSuccessToast(title, message, 'info');
}

// Warning toast variant
function showWarningToast(title, message) {
    showSuccessToast(title, message, 'warning');
}

// ✅ GLOBAL SEARCH FUNCTIONALITY
let searchTimeout = null;
const globalSearchInput = document.getElementById('global-search');
const searchResultsDropdown = document.getElementById('search-results');

if (globalSearchInput && searchResultsDropdown) {
  // Real-time search as user types
  globalSearchInput.addEventListener('input', function(e) {
    const searchTerm = e.target.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Hide dropdown if search is empty
    if (searchTerm.length === 0) {
      searchResultsDropdown.classList.remove('show');
      return;
    }
    
    // Debounce search (wait 300ms after user stops typing)
    searchTimeout = setTimeout(() => {
      performGlobalSearch(searchTerm);
    }, 300);
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!globalSearchInput.contains(e.target) && !searchResultsDropdown.contains(e.target)) {
      searchResultsDropdown.classList.remove('show');
    }
  });
  
  // Keep dropdown open when clicking inside search input
  globalSearchInput.addEventListener('click', function(e) {
    e.stopPropagation();
    if (globalSearchInput.value.trim().length > 0) {
      searchResultsDropdown.classList.add('show');
    }
  });
}

function performGlobalSearch(searchTerm) {
  const results = {
    classes: [],
    assignments: [],
    materials: [],
    students: []
  };
  
  const searchLower = searchTerm.toLowerCase();
  
  // Search through all classes
  classes.forEach(classItem => {
    // Search class name and code
    if (classItem.name.toLowerCase().includes(searchLower) || 
        classItem.code.toLowerCase().includes(searchLower) ||
        (classItem.description && classItem.description.toLowerCase().includes(searchLower))) {
      results.classes.push({
        id: classItem.id,
        name: classItem.name,
        code: classItem.code,
        description: classItem.description,
        type: 'class'
      });
    }
    
    // Search assignments within class
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        if (assignment.title.toLowerCase().includes(searchLower) ||
            (assignment.description && assignment.description.toLowerCase().includes(searchLower))) {
          results.assignments.push({
            id: assignment.id,
            classId: classItem.id,
            className: classItem.name,
            title: assignment.title,
            description: assignment.description,
            dueDate: assignment.dueDate,
            points: assignment.points,
            type: 'assignment'
          });
        }
      });
    }
    
    // Search materials within class
    if (classItem.materials) {
      classItem.materials.forEach(material => {
        if (material.title.toLowerCase().includes(searchLower) ||
            (material.description && material.description.toLowerCase().includes(searchLower))) {
          results.materials.push({
            id: material.id,
            classId: classItem.id,
            className: classItem.name,
            title: material.title,
            description: material.description,
            date: material.date,
            type: 'material'
          });
        }
      });
    }
    
    // Search students within class
    if (classItem.students) {
      classItem.students.forEach(student => {
        const studentName = (student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim()).toLowerCase();
        const studentEmail = (student.email || student.username || '').toLowerCase();
        const studentId = (student.student_id || student.id || '').toString().toLowerCase();
        
        if (studentName.includes(searchLower) || 
            studentEmail.includes(searchLower) || 
            studentId.includes(searchLower)) {
          // Avoid duplicates (students enrolled in multiple classes)
          if (!results.students.some(s => s.id === student.id)) {
            results.students.push({
              id: student.id,
              name: student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim(),
              email: student.email || student.username,
              studentId: student.student_id || student.id,
              classId: classItem.id,
              className: classItem.name,
              type: 'student'
            });
          }
        }
      });
    }
  });
  
  displaySearchResults(results, searchTerm);
}

function displaySearchResults(results, searchTerm) {
  const totalResults = results.classes.length + results.assignments.length + 
                       results.materials.length + results.students.length;
  
  if (totalResults === 0) {
    searchResultsDropdown.innerHTML = `
      <div class="search-no-results">
        <i class="fas fa-search"></i>
        <h4>No results found</h4>
        <p>Try searching for something else</p>
      </div>
    `;
    searchResultsDropdown.classList.add('show');
    return;
  }
  
  let html = '';
  
  // Display Classes
  if (results.classes.length > 0) {
    html += `<div class="search-category"><i class="fas fa-book"></i> Classes (${results.classes.length})</div>`;
    results.classes.forEach(item => {
      const highlightedName = highlightText(item.name, searchTerm);
      const highlightedCode = highlightText(item.code, searchTerm);
      
      html += `
        <div class="search-result-item" onclick="navigateToSearchResult('${item.type}', '${item.id}')">
          <div class="search-result-icon class">
            <i class="fas fa-book"></i>
          </div>
          <div class="search-result-content">
            <div class="search-result-title">${highlightedName}</div>
            <div class="search-result-subtitle">Code: ${highlightedCode}</div>
          </div>
        </div>
      `;
    });
  }
  
  // Display Assignments
  if (results.assignments.length > 0) {
    html += `<div class="search-category"><i class="fas fa-tasks"></i> Assignments (${results.assignments.length})</div>`;
    results.assignments.slice(0, 5).forEach(item => {
      const highlightedTitle = highlightText(item.title, searchTerm);
      const dueDate = new Date(item.dueDate).toLocaleDateString();
      
      html += `
        <div class="search-result-item" onclick="navigateToSearchResult('${item.type}', '${item.id}', '${item.classId}')">
          <div class="search-result-icon assignment">
            <i class="fas fa-tasks"></i>
          </div>
          <div class="search-result-content">
            <div class="search-result-title">${highlightedTitle}</div>
            <div class="search-result-subtitle">${item.className}</div>
            <div class="search-result-meta">Due: ${dueDate} • ${item.points} points</div>
          </div>
        </div>
      `;
    });
    if (results.assignments.length > 5) {
      html += `<div style="padding: 0.75rem 1.25rem; text-align: center; color: #666; font-size: 0.85rem;">+${results.assignments.length - 5} more assignments</div>`;
    }
  }
  
  // Display Materials
  if (results.materials.length > 0) {
    html += `<div class="search-category"><i class="fas fa-file-alt"></i> Materials (${results.materials.length})</div>`;
    results.materials.slice(0, 5).forEach(item => {
      const highlightedTitle = highlightText(item.title, searchTerm);
      const date = new Date(item.date).toLocaleDateString();
      
      html += `
        <div class="search-result-item" onclick="navigateToSearchResult('${item.type}', '${item.id}', '${item.classId}')">
          <div class="search-result-icon material">
            <i class="fas fa-file-alt"></i>
          </div>
          <div class="search-result-content">
            <div class="search-result-title">${highlightedTitle}</div>
            <div class="search-result-subtitle">${item.className}</div>
            <div class="search-result-meta">Posted: ${date}</div>
          </div>
        </div>
      `;
    });
    if (results.materials.length > 5) {
      html += `<div style="padding: 0.75rem 1.25rem; text-align: center; color: #666; font-size: 0.85rem;">+${results.materials.length - 5} more materials</div>`;
    }
  }
  
  // Display Students
  if (results.students.length > 0) {
    html += `<div class="search-category"><i class="fas fa-users"></i> Students (${results.students.length})</div>`;
    results.students.slice(0, 5).forEach(item => {
      const highlightedName = highlightText(item.name, searchTerm);
      const highlightedEmail = highlightText(item.email, searchTerm);
      
      html += `
        <div class="search-result-item" onclick="navigateToSearchResult('${item.type}', '${item.id}', '${item.classId}')">
          <div class="search-result-icon student">
            <i class="fas fa-user"></i>
          </div>
          <div class="search-result-content">
            <div class="search-result-title">${highlightedName}</div>
            <div class="search-result-subtitle">${highlightedEmail}</div>
            <div class="search-result-meta">${item.className}</div>
          </div>
        </div>
      `;
    });
    if (results.students.length > 5) {
      html += `<div style="padding: 0.75rem 1.25rem; text-align: center; color: #666; font-size: 0.85rem;">+${results.students.length - 5} more students</div>`;
    }
  }
  
  searchResultsDropdown.innerHTML = html;
  searchResultsDropdown.classList.add('show');
}

// Handle file selection with preview and remove
const assignmentFilesInput = document.getElementById('assignment-files');
if (assignmentFilesInput) {
  let selectedFiles = [];
  
  assignmentFilesInput.addEventListener('change', function(e) {
    const newFiles = Array.from(e.target.files);
    selectedFiles = [...selectedFiles, ...newFiles];
    updateFilesList();
  });
  
  function updateFilesList() {
    const filesList = document.getElementById('selected-files-list');
    const fileChosen = document.getElementById('assignment-files-chosen');
    
    if (selectedFiles.length === 0) {
      fileChosen.textContent = 'No files selected';
      filesList.innerHTML = '';
      return;
    }
    
    fileChosen.textContent = `${selectedFiles.length} file(s) selected`;
    
    filesList.innerHTML = selectedFiles.map((file, index) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; margin-bottom: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0;">
          <i class="fas fa-${getFileIcon(file.name)}" style="color: #4a90a4; font-size: 1.2rem;"></i>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 500; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</div>
            <div style="font-size: 0.85rem; color: #666;">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
          </div>
        </div>
        <button type="button" onclick="removeFile(${index})" class="btn-danger btn-small" style="margin-left: 1rem;">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
  }
  
  window.removeFile = function(index) {
    selectedFiles.splice(index, 1);
    updateFilesList();
    
    // Update the actual file input
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    assignmentFilesInput.files = dt.files;
  };
  
  function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
      'pdf': 'file-pdf',
      'doc': 'file-word', 'docx': 'file-word',
      'txt': 'file-alt',
      'png': 'file-image', 'jpg': 'file-image', 'jpeg': 'file-image', 'gif': 'file-image',
      'zip': 'file-archive',
      'mp4': 'file-video', 'avi': 'file-video', 'mov': 'file-video', 'wmv': 'file-video',
      'flv': 'file-video', 'webm': 'file-video', 'mkv': 'file-video'
    };
    return icons[ext] || 'file';
  }
}

function highlightText(text, searchTerm) {
  if (!text) return '';
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<span class="search-highlight">$1</span>');
}

function navigateToSearchResult(type, id, classId = null) {
  // Close search dropdown
  searchResultsDropdown.classList.remove('show');
  globalSearchInput.value = '';
  
  switch(type) {
    case 'class':
      openClass(id);
      break;
      
    case 'assignment':
      openClass(classId);
      setTimeout(() => {
        switchTab('assignments');
        // Scroll to assignment
        setTimeout(() => {
          const assignmentCards = document.querySelectorAll('.assignment-card');
          assignmentCards.forEach(card => {
            if (card.querySelector('h4') && card.querySelector('h4').textContent.includes(id)) {
              card.scrollIntoView({ behavior: 'smooth', block: 'center' });
              card.style.animation = 'highlight 1s ease';
            }
          });
        }, 300);
      }, 300);
      break;
      
    case 'material':
      openClass(classId);
      setTimeout(() => {
        switchTab('posts');
        // Scroll to material
        setTimeout(() => {
          const postCards = document.querySelectorAll('.post-card');
          postCards.forEach(card => {
            if (card.querySelector('h4') && card.querySelector('h4').textContent.includes(id)) {
              card.scrollIntoView({ behavior: 'smooth', block: 'center' });
              card.style.animation = 'highlight 1s ease';
            }
          });
        }, 300);
      }, 300);
      break;
      
    case 'student':
      openClass(classId);
      setTimeout(() => {
        switchTab('students');
        // Scroll to student
        setTimeout(() => {
          const studentItems = document.querySelectorAll('.student-item');
          studentItems.forEach(item => {
            const studentName = item.querySelector('h4');
            if (studentName && studentName.textContent.includes(id)) {
              item.scrollIntoView({ behavior: 'smooth', block: 'center' });
              item.style.animation = 'highlight 1s ease';
            }
          });
        }, 300);
      }, 300);
      break;
  }
}

// Save notifications to localStorage
function saveNotifications() {
  const userType = document.body.classList.contains('professor-dashboard') ? 'professor' : 'student';
  localStorage.setItem(`${userType}_notifications`, JSON.stringify(notifications));
  updateNotificationBadge();
}

// Add a new notification
function addNotification(type, title, message, link = null) {
  const notification = {
    id: Date.now().toString(),
    type: type, // 'assignment', 'grade', 'material', 'enrollment', 'submission'
    title: title,
    message: message,
    link: link,
    timestamp: new Date().toISOString(),
    read: false
  };
  
  notifications.unshift(notification); // Add to beginning
  
  // Keep only last 50 notifications
  if (notifications.length > 50) {
    notifications = notifications.slice(0, 50);
  }
  
  saveNotifications();
}

// Update notification badge
function updateNotificationBadge() {
  const badge = document.querySelector('.notification-badge');
  if (badge) {
    const unreadCount = notifications.filter(n => !n.read).length;
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'block' : 'none';
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
  if (confirm('Are you sure you want to clear all notifications?')) {
    notifications = [];
    saveNotifications();
    closeNotificationPanel();
  }
}

// Enhanced notification system with upcoming deadlines and recent activity
function generateUpcomingDeadlinesNotifications() {
  const notifications = [];
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  // Check all classes for upcoming deadlines
  classes.forEach(classItem => {
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const dueDate = new Date(assignment.dueDate);
        if (dueDate > now && dueDate <= nextWeek) {
          const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
          notifications.push({
            id: `deadline-${assignment.id}`,
            type: 'deadline',
            title: `Upcoming Deadline`,
            message: `${assignment.title} in ${classItem.name} due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`,
            timestamp: assignment.dueDate,
            priority: daysUntilDue <= 2 ? 'high' : 'medium'
          });
        }
      });
    }
  });
  
  return notifications.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function generateRecentActivityNotifications() {
  const notifications = [];
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Check for recent submissions
  classes.forEach(classItem => {
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        if (assignment.submissions) {
          assignment.submissions.forEach(submission => {
            const submissionDate = new Date(submission.date);
            if (submissionDate >= last24Hours) {
              notifications.push({
                id: `submission-${submission.id}`,
                type: 'submission',
                title: `New Submission`,
                message: `${submission.studentName} submitted "${assignment.title}"`,
                timestamp: submission.date,
                priority: 'medium'
              });
            }
          });
        }
      });
    }
  });
  
  return notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Show notification panel
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
        'submission': 'fa-paper-plane'
      };
      
      const colorMap = {
        'assignment': '#4a90a4',
        'grade': '#28a745',
        'material': '#17a2b8',
        'enrollment': '#6c757d',
        'submission': '#ffc107'
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
  
  // Close on outside click
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
    // Handle internal navigation
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

// ADD: Hook up notification icon click
document.addEventListener('DOMContentLoaded', function() {
  loadNotifications();
  
  const notificationIcon = document.querySelector('.notification-icon');
  if (notificationIcon) {
    notificationIcon.addEventListener('click', function(e) {
      e.stopPropagation();
      showNotificationPanel();
    });
  }
  
  
});

    document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      
      document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
      
      this.classList.add('active');
      document.getElementById(`${tabName}-settings`).classList.add('active');
    });
  });
  
  //Password update in settings
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
        alert('Password updated successfully!');
        document.getElementById('settings-current-password').value = '';
        document.getElementById('settings-new-password').value = '';
        document.getElementById('settings-confirm-password').value = '';
      } else {
        alert('âŒ ' + (result.error || 'Failed to update password'));
      }
    } catch (error) {
      alert('âŒ Error updating password: ' + error.message);
    } finally {
      this.disabled = false;
      this.innerHTML = 'Update Password';
    }
  });
  
  // Notification settings
  document.getElementById('save-notification-settings')?.addEventListener('click', function() {
    const settings = {
      assignments: document.getElementById('notif-assignments').checked,
      grades: document.getElementById('notif-grades').checked,
      materials: document.getElementById('notif-materials').checked,
      deadlines: document.getElementById('notif-deadlines').checked
    };
    
    const userType = document.body.classList.contains('professor-dashboard') ? 'professor' : 'student';
    localStorage.setItem(`${userType}_notification_settings`, JSON.stringify(settings));
    
    alert('Notification settings saved!');
  });
  
  // Privacy settings
document.getElementById('save-privacy-settings')?.addEventListener('click', function() {
  const settings = {
    profileVisible: document.getElementById('privacy-profile').checked,
    emailVisible: document.getElementById('privacy-email').checked
  };
  
  const userType = document.body.classList.contains('professor-dashboard') ? 'professor' : 'student';
  localStorage.setItem(`${userType}_privacy_settings`, JSON.stringify(settings));
  
  //SHOW SUCCESS MESSAGE
  alert('Privacy settings saved successfully!');
});

// Ã¢Å“â€¦ ADD: Clear all data function (around line 220)
document.getElementById('clear-all-data')?.addEventListener('click', function() {
  if (confirm('Ã¢Å¡ Ã¯Â¸ Are you sure? This will clear ALL your data from LearnSync.\n\nThis includes:\nÃ¢â‚¬Â¢ All classes and their content\nÃ¢â‚¬Â¢ All assignments and submissions\nÃ¢â‚¬Â¢ All materials and files\nÃ¢â‚¬Â¢ Your profile picture\nÃ¢â‚¬Â¢ All notifications\n\nThis action CANNOT be undone!')) {
    if (confirm('Ã¢Å¡ Ã¯Â¸ FINAL WARNING: Press OK to permanently delete all data.')) {
      const userType = document.body.classList.contains('professor-dashboard') ? 'professor' : 'student';
      
      // Clear all localStorage data
      const keysToRemove = [
        `${userType}_classes`,
        `${userType}_notifications`,
        `${userType}_avatar`,
        `${userType}_notification_settings`,
        `${userType}_privacy_settings`,
        'professor_classes',
        'calendar_events'
      ];
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      alert('Ã¢Å“â€¦ All data cleared successfully!\n\nThe page will now reload.');
      window.location.reload();
    }
  }
});

// Ã¢Å“â€¦ LOAD saved privacy settings on page load
function loadSavedSettings() {
  const userType = document.body.classList.contains('professor-dashboard') ? 'professor' : 'student';
  
  // Load notification settings
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
  
  // Ã¢Å“â€¦ LOAD privacy settings
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


// Show section function
function showSection(sectionId, element = null) {
  // Hide all sections INCLUDING class-view
  contentSections.forEach(section => {
    section.classList.remove('active');
  });
  
  // IMPORTANT: Also hide class-view explicitly
  const classView = document.getElementById('class-view');
  if (classView) {
    classView.classList.add('hidden');
    classView.classList.remove('active');
  }

  // Remove active class from all nav links
  if (element) {
    navLinks.forEach(link => {
      link.classList.remove('active');
    });
    element.classList.add('active');
  }

  // Show selected section (but not if it's class-view)
  if (sectionId !== 'class-view') {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
      
      // CRITICAL FIX: Load data based on section
      if (sectionId === 'students-section') {
        setTimeout(loadAllStudents, 50);
      } else if (sectionId === 'assignments-section') {
        // For student dashboard
        if (typeof loadAllAssignments === 'function') {
          setTimeout(loadAllAssignments, 50);
        }
      }
    }
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

document.addEventListener('DOMContentLoaded', function() {
  // Date picker OK button functionality
  const dateInput = document.getElementById('assignment-due-date');
  const confirmBtn = document.getElementById('confirm-date-btn');
  
  if (dateInput && confirmBtn) {
    // Show OK button when date input is focused or has value
    dateInput.addEventListener('focus', function() {
      confirmBtn.style.display = 'flex';
    });
    
    dateInput.addEventListener('input', function() {
      if (this.value) {
        confirmBtn.style.display = 'flex';
      }
    });
    
    // Hide OK button when date input loses focus and has no value
    dateInput.addEventListener('blur', function() {
      if (!this.value) {
        setTimeout(() => {
          if (document.activeElement !== confirmBtn) {
            confirmBtn.style.display = 'none';
          }
        }, 200);
      }
    });
    
    // OK button click handler
    confirmBtn.addEventListener('click', function() {
      if (dateInput.value) {
        // Close the date picker by blurring the input
        dateInput.blur();
        // Hide the OK button
        this.style.display = 'none';
        
        // Optional: Add visual feedback
        this.style.background = '#28a745';
        setTimeout(() => {
          this.style.background = '';
        }, 300);
      }
    });
    
    // Keep OK button visible when it's focused
    confirmBtn.addEventListener('focus', function() {
      this.style.display = 'flex';
    });
    
    confirmBtn.addEventListener('blur', function() {
      if (!dateInput.value) {
        this.style.display = 'none';
      }
    });
  }

  // Initialize dashboard stats
  updateDashboardStats();
  
  // Load classes from API
  loadClasses();
  
  // Initialize calendar
  initializeCalendar();
  
  // Event listeners for class management
  document.getElementById('create-class-btn').addEventListener('click', showCreateClassModal);
  document.getElementById('cancel-class').addEventListener('click', hideCreateClassModal);
  document.getElementById('save-class').addEventListener('click', createClass);
  
  // Auto-generate class code
  document.getElementById('class-name').addEventListener('input', function() {
    if (!document.getElementById('class-code').value) {
      document.getElementById('class-code').value = generateClassCode();
    }
  
  });

    // ADD THIS - Assignment modal controls (MUST be inside DOMContentLoaded)
  const createAssignmentBtns = document.querySelectorAll('[onclick*="createAssignment"]');
  createAssignmentBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      if (assignmentModal) {
        assignmentModal.style.display = 'flex';
        // Reset form
        resetAssignmentForm();
      }
    });
  });
  
  // Existing assignment modal controls
  if (assignmentModal) {
    document.getElementById('close-assignment-modal').addEventListener('click', function() {
      assignmentModal.style.display = 'none';
      resetAssignmentForm();
    });
  }
  

  
  // Back to classes button
  document.getElementById('back-to-classes').addEventListener('click', function() {
    document.getElementById('class-view').classList.add('hidden');
    // Ensure the main "Enrolled Classes" section is made active and visible
    document.getElementById('class-view').classList.remove('active');
    document.getElementById('enrolled-section').classList.add('active');
    currentClassId = null; // Clear current class context
  });
  
  // Upload form controls
  document.getElementById('show-upload-form').addEventListener('click', function() {
    document.getElementById('upload-form').classList.remove('hidden');
  });
  
  document.getElementById('cancel-upload').addEventListener('click', function() {
    document.getElementById('upload-form').classList.add('hidden');
    resetUploadForm();
  });
  
  document.getElementById('post-upload').addEventListener('click', uploadMaterial);
  
  // File upload display
  document.getElementById('lesson-file').addEventListener('change', function() {
    const fileChosen = document.getElementById('file-chosen');
    if (this.files.length > 0) {
      fileChosen.textContent = `${this.files.length} file(s) selected`;
    } else {
      fileChosen.textContent = 'No files selected';
    }
  });
  
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      switchTab(tabName);
      
      // Load content when tabs are clicked
      if (currentClassId) {
        if (tabName === 'posts') loadClassPosts();
        if (tabName === 'students') loadClassStudents();
        if (tabName === 'assignments') loadClassAssignments();
        if (tabName === 'grades') loadClassGrades();
      }
    });
  });
  
  // Assignment modal controls
  if (assignmentModal) {
    document.getElementById('close-assignment-modal').addEventListener('click', function() {
      assignmentModal.style.display = 'none';
      resetAssignmentForm(); // Bug fix: Reset form when closing
    });
  }
  
  
  document.getElementById('save-assignment').addEventListener('click', saveAssignment);
  
  // Assignment files display
  document.getElementById('assignment-files').addEventListener('change', function() {
    const fileChosen = document.getElementById('assignment-files-chosen');
    if (this.files.length > 0) {
      fileChosen.textContent = `${this.files.length} file(s) selected`;
    } else {
      fileChosen.textContent = 'No files selected';
    }
  });
  
  // Grading modal controls
  if (gradingModal) {
    document.getElementById('close-grading-modal').addEventListener('click', function() {
      gradingModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    gradingModal.addEventListener('click', function(e) {
      if (e.target === gradingModal) {
        gradingModal.style.display = 'none';
      }
    });
  }
  
  // FIX: Save grade button - MUST be here, not at top
  const saveGradeBtn = document.getElementById('save-grade');
  if (saveGradeBtn) {
    // Remove any old listeners
    const newBtn = saveGradeBtn.cloneNode(true);
    saveGradeBtn.parentNode.replaceChild(newBtn, saveGradeBtn);
    
    // Add fresh listener
    newBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('ðŸ–±ï¸ Save Grade button clicked');
      saveGrade(); // Call the function defined later
    });
    
    console.log('Save grade button listener attached');
  }
});

// Load classes from API
async function loadClasses() {
  try {
    const response = await fetch('/api/professor/classes');
    if (response.ok) {
      classes = await response.json();
      
      // ✅ FIX: Load materials, assignments, AND submissions for each class
      for (let classItem of classes) {
        if (!classItem.students) {
          classItem.students = [];
        }
        
        // Load materials from database
        try {
          const materialsResponse = await fetch(`/api/professor/classes/${classItem.id}/materials`);
          if (materialsResponse.ok) {
            classItem.materials = await materialsResponse.json();
          } else {
            classItem.materials = [];
          }
        } catch (e) {
          console.error('Error loading materials for class:', classItem.id, e);
          classItem.materials = [];
        }
        
        // ✅ FIX: Load assignments WITH submissions from database
        try {
          const assignmentsResponse = await fetch(`/api/professor/classes/${classItem.id}/assignments`);
          if (assignmentsResponse.ok) {
            classItem.assignments = await assignmentsResponse.json();
            console.log(`✅ Loaded ${classItem.assignments.length} assignments with submissions for ${classItem.name}`);
          } else {
            classItem.assignments = [];
          }
        } catch (e) {
          console.error('Error loading assignments for class:', classItem.id, e);
          classItem.assignments = [];
        }
      }
      
      renderClassList();
      updateDashboardStats();
      loadAllStudents();
    }
  } catch (error) {
    console.error('Error loading classes:', error);
  }
}

// Generate random class code
function generateClassCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Show create class modal
function showCreateClassModal() {
  document.getElementById('class-modal').style.display = 'flex';
  document.getElementById('class-code').value = generateClassCode();
}

// Hide create class modal
function hideCreateClassModal() {
  document.getElementById('class-modal').style.display = 'none';
  resetCreateClassForm();
}

// Reset create class form
function resetCreateClassForm() {
  document.getElementById('class-name').value = '';
  document.getElementById('class-description').value = '';
  document.getElementById('class-code').value = '';
}

// Create new class
async function createClass() {
  const className = document.getElementById('class-name').value.trim();
  const classDescription = document.getElementById('class-description').value.trim();
  const classCode = document.getElementById('class-code').value.trim();
  
  if (!className) {
    alert('Please enter a class name');
    return;
  }
  
  try {
    const response = await fetch('/api/professor/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: className,
        description: classDescription,
        code: classCode
      })
    });

    const result = await response.json();

    if (response.ok) {
      // ✅ FIX: Create completely fresh class object
      const newClass = {
        id: result.id,
        name: result.name,
        description: result.description,
        code: result.code,
        archived: false,
        students: [], // ✅ Empty array
        materials: [], // ✅ Empty array
        assignments: [] // ✅ Empty array
      };
      
      classes.push(newClass);
      
      // ✅ FIX: Update localStorage without cross-contamination
      const savedClasses = localStorage.getItem('professor_classes');
      let localClasses = savedClasses ? JSON.parse(savedClasses) : [];
      localClasses.push(newClass);
      localStorage.setItem('professor_classes', JSON.stringify(localClasses));
      
      renderClassList();
      hideCreateClassModal();
      showSuccessToast(`Class "${className}" created successfully! Class Code: ${classCode}`);
      updateDashboardStats();
    } else {
      showErrorToast(result.error || 'Failed to create class');
    }
  } catch (error) {
    console.error('Error creating class:', error);
    showErrorToast('Error creating class. Please try again.');
  }
}

// Render class list
function renderClassList() {
  const classList = document.getElementById('class-list');
  classList.innerHTML = '';
  
  if (classes.length === 0) {
    classList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-book-open"></i>
        <h3>No Classes Created</h3>
        <p>Create your first class to get started</p>
      </div>
    `;
    return;
  }
  
  const sortedClasses = [...classes].sort((a, b) => 
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
  
  sortedClasses.forEach(classItem => {
    // ✅ FIX: Force fresh data load from database
    const studentCount = classItem.students ? classItem.students.length : 0;
    
    // ✅ FIX: Get materials count from database
    let materialsCount = 0;
    if (classItem.materials && Array.isArray(classItem.materials)) {
      materialsCount = classItem.materials.length;
    }
    
    // ✅ FIX: Get assignments count from database
    let assignmentsCount = 0;
    if (classItem.assignments && Array.isArray(classItem.assignments)) {
      assignmentsCount = classItem.assignments.length;
    }
    
    console.log(`📊 Class "${classItem.name}": ${studentCount} students, ${materialsCount} materials, ${assignmentsCount} assignments`);

    const classCard = document.createElement('div');
    classCard.className = 'class-card';
    classCard.innerHTML = `
      <div class="class-card-header">
        <h3>${classItem.name}</h3>
        <span class="class-code">${classItem.code}</span>
      </div>
      <p class="class-description">${classItem.description || 'No description provided'}</p>
      <div class="class-stats">
        <span><i class="fas fa-users"></i> ${studentCount} Students</span>
        <span><i class="fas fa-file-alt"></i> ${materialsCount} Materials</span>
        <span><i class="fas fa-tasks"></i> ${assignmentsCount} Assignments</span>
      </div>
      <div class="class-actions">
        <button class="btn-primary" onclick="openClass('${classItem.id}')">Open Class</button>
        <button class="btn-secondary" onclick="copyClassCode('${classItem.code}')">
          <i class="fas fa-copy"></i> Copy Code
        </button>
        <!--
        <button class="btn-warning" onclick="archiveClass('${classItem.id}')">
          <i class="fas fa-archive"></i> Archive
        </button> 
        -->
        <button class="btn-danger" onclick="deleteClass('${classItem.id}')">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    `;
    classList.appendChild(classCard);
  });
}

// ADD archive function:
// In professor-script.js - UPDATE the archiveClass function
async function archiveClass(classId) {
  if (!confirm('Are you sure you want to archive this class?')) {
    return;
  }

  try {
    const response = await fetch(`/api/professor/classes/${classId}/archive`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'}
    });

    const result = await response.json();

    if (response.ok) {
      // Remove from current view and reload both sections
      classes = classes.filter(c => c.id !== classId);
      renderClassList();
      
      // Reload archived classes if we're in that section
      const archivedSection = document.getElementById('archived-section');
      if (archivedSection && archivedSection.classList.contains('active')) {
        loadArchivedClasses();
      }
      
      alert('Class archived successfully!');
      updateDashboardStats();
    } else {
      alert(result.error || 'Failed to archive class');
    }
  } catch (error) {
    console.error('Error archiving class:', error);
    alert('Error archiving class. Please try again.');
  }
}

// ADD this function to automatically refresh both sections
function refreshClassSections() {
  loadClasses(); // Reload main classes
  loadArchivedClasses(); // Reload archived classes
}

// UPDATE loadClasses to load archived separately:
async function loadArchivedClasses() {
  try {
    const response = await fetch('/api/professor/classes?archived=true');
    if (response.ok) {
      const archivedClasses = await response.json();
      renderArchivedClassList(archivedClasses);
    }
  } catch (error) {
    console.error('Error loading archived classes:', error);
  }
}

// REPLACE renderArchivedClassList function
function renderArchivedClassList(archivedClasses) {
  const archivedContent = document.querySelector('.archived-content');
  if (!archivedContent) return;
  
  archivedContent.innerHTML = '';
  
  if (archivedClasses.length === 0) {
    archivedContent.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-archive"></i>
        <h3>No Archived Classes</h3>
        <p>Classes you archive will appear here.</p>
      </div>
    `;
    return;
  }
  
  const sortedArchivedClasses = [...archivedClasses].sort((a, b) => 
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
  
  sortedArchivedClasses.forEach(classItem => {
    const classCard = document.createElement('div');
    classCard.className = 'class-card archived';
    
    // ✅ FIX: Calculate stats even for archived classes
    const studentCount = classItem.students ? classItem.students.length : 0;
    const materialsCount = classItem.materials ? classItem.materials.length : 0;
    const assignmentsCount = classItem.assignments ? classItem.assignments.length : 0;
    
    classCard.innerHTML = `
      <div class="class-card-header">
        <h3>${classItem.name}</h3>
        <span class="class-code">${classItem.code}</span>
      </div>
      <p class="class-description">${classItem.description || 'No description provided'}</p>
      <div class="class-stats">
        <span><i class="fas fa-users"></i> ${studentCount} Students</span>
        <span><i class="fas fa-file-alt"></i> ${materialsCount} Materials</span>
        <span><i class="fas fa-tasks"></i> ${assignmentsCount} Assignments</span>
        <span style="color: #6c757d;"><i class="fas fa-archive"></i> Archived</span>
      </div>
      <div class="class-actions">
        <button class="btn-secondary" onclick="openClass('${classItem.id}', true)">
          <i class="fas fa-eye"></i> View (Read-only)
        </button>
        <button class="btn-primary" onclick="unarchiveClass('${classItem.id}')">
          <i class="fas fa-undo"></i> Restore
        </button>
        <button class="btn-danger" onclick="deleteClass('${classItem.id}')">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    `;
    archivedContent.appendChild(classCard);
  });
}

// UPDATE the unarchiveClass function to use refresh
async function unarchiveClass(classId) {
  await archiveClass(classId); // This toggles the status
  refreshClassSections(); // Refresh both sections
}

function loadMissedTasks() {
  const missedTasksContainer = document.getElementById('missed-tasks-container');
  if (!missedTasksContainer) return;
  
  missedTasksContainer.innerHTML = '';
  
  const now = new Date();
  let allMissedSubmissions = [];
  
  // Collect all missed submissions across all classes
  classes.forEach(classItem => {
    if (classItem.assignments && classItem.assignments.length > 0) {
      classItem.assignments.forEach(assignment => {
        const dueDate = new Date(assignment.dueDate);
        
        // Only check assignments that are past due
        if (dueDate < now) {
          // Check each student in the class
          if (classItem.students && classItem.students.length > 0) {
            classItem.students.forEach(student => {
              const submission = assignment.submissions ? 
                assignment.submissions.find(s => String(s.studentId) === String(student.id)) : null;
              
              // If student didn't submit, it's a missed task
              if (!submission) {
                const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
                
                allMissedSubmissions.push({
                  studentId: student.id,
                  studentName: student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim(),
                  studentEmail: student.email || student.username,
                  className: classItem.name,
                  classId: classItem.id,
                  assignmentTitle: assignment.title,
                  assignmentId: assignment.id,
                  assignmentPoints: assignment.points,
                  dueDate: dueDate,
                  daysOverdue: daysOverdue
                });
              }
            });
          }
        }
      });
    }
  });
  
  // Sort by most overdue first
  allMissedSubmissions.sort((a, b) => b.daysOverdue - a.daysOverdue);
  
  if (allMissedSubmissions.length === 0) {
    missedTasksContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-check-circle" style="color: #28a745; font-size: 4rem;"></i>
        <h3>All Students Up to Date!</h3>
        <p>No students have missed any assignment deadlines. Excellent work!</p>
      </div>
    `;

    return;
  }
  
  // Show summary statistics
  const uniqueStudents = new Set(allMissedSubmissions.map(m => m.studentId));
  const uniqueAssignments = new Set(allMissedSubmissions.map(m => m.assignmentId));
  
  const summaryCard = document.createElement('div');
  summaryCard.style.cssText = `
    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
    padding: 2rem;
    border-radius: 12px;
    color: white;
    margin-bottom: 2rem;
    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
  `;
  
  summaryCard.innerHTML = `
    <h2 style="margin: 0 0 1.5rem 0; font-size: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
      <i class="fas fa-exclamation-triangle"></i>
      Missed Tasks Overview
    </h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
      <div style="background: rgba(255,255,255,0.15); padding: 1.5rem; border-radius: 8px; backdrop-filter: blur(10px);">
        <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem;">${allMissedSubmissions.length}</div>
        <div style="font-size: 0.95rem; opacity: 0.95;">Total Missed Submissions</div>
      </div>
      <div style="background: rgba(255,255,255,0.15); padding: 1.5rem; border-radius: 8px; backdrop-filter: blur(10px);">
        <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem;">${uniqueStudents.size}</div>
        <div style="font-size: 0.95rem; opacity: 0.95;">Students with Missed Tasks</div>
      </div>
      <div style="background: rgba(255,255,255,0.15); padding: 1.5rem; border-radius: 8px; backdrop-filter: blur(10px);">
        <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem;">${uniqueAssignments.size}</div>
        <div style="font-size: 0.95rem; opacity: 0.95;">Assignments with Missing Work</div>
      </div>
    </div>
  `;
  
  missedTasksContainer.appendChild(summaryCard);
  
  // Add filter options
  const filterBar = document.createElement('div');
  filterBar.style.cssText = `
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    align-items: center;
  `;
  
  filterBar.innerHTML = `
    <div style="flex: 1; min-width: 250px;">
      <input type="text" id="missed-search" placeholder="Search by student name or assignment..." 
             style="width: 100%; padding: 0.75rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 0.95rem;">
    </div>
    <select id="missed-class-filter" style="padding: 0.75rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 0.95rem; min-width: 200px;">
      <option value="all">All Classes</option>
      ${classes.map(cls => `<option value="${cls.id}">${cls.name}</option>`).join('')}
    </select>
    <select id="missed-severity-filter" style="padding: 0.75rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 0.95rem; min-width: 200px;">
      <option value="all">All Severities</option>
      <option value="critical">Critical (7+ days)</option>
      <option value="warning">Warning (3-7 days)</option>
      <option value="recent">Recent (0-3 days)</option>
    </select>
  `;
  
  missedTasksContainer.appendChild(filterBar);
  
  // Create container for missed items
  const missedItemsContainer = document.createElement('div');
  missedItemsContainer.id = 'missed-items-list';
  missedTasksContainer.appendChild(missedItemsContainer);
  
  // Function to render filtered items
  function renderMissedItems(filteredItems) {
    missedItemsContainer.innerHTML = '';
    
    if (filteredItems.length === 0) {
      missedItemsContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #666;">
          <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
          <p>No missed tasks match your filters</p>
        </div>
      `;
      return;
    }
    
    filteredItems.forEach(missed => {
      // Determine severity
      let severityColor, severityBg, severityText, severityIcon;
      
      if (missed.daysOverdue >= 7) {
        severityColor = '#dc3545';
        severityBg = '#f8d7da';
        severityText = 'Critical';
        severityIcon = 'fa-exclamation-circle';
      } else if (missed.daysOverdue >= 3) {
        severityColor = '#fd7e14';
        severityBg = '#ffe5d0';
        severityText = 'Warning';
        severityIcon = 'fa-exclamation-triangle';
      } else {
        severityColor = '#ffc107';
        severityBg = '#fff3cd';
        severityText = 'Recent';
        severityIcon = 'fa-clock';
      }
      
      const missedCard = document.createElement('div');
      missedCard.style.cssText = `
        background: white;
        border: 2px solid ${severityColor};
        border-left: 6px solid ${severityColor};
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
      `;
      
      missedCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
          <div style="flex: 1; min-width: 250px;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
              <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(missed.studentName)}&background=4a90a4&color=fff" 
                   alt="${missed.studentName}" 
                   style="width: 50px; height: 50px; border-radius: 50%; border: 3px solid ${severityColor};">
              <div>
                <h3 style="margin: 0; font-size: 1.2rem; color: #333;">${missed.studentName}</h3>
                <p style="margin: 0.25rem 0 0 0; color: #666; font-size: 0.9rem;">
                  <i class="fas fa-envelope"></i> ${missed.studentEmail}
                </p>
              </div>
            </div>
            
            <div style="background: ${severityBg}; padding: 1rem; border-radius: 8px; border-left: 4px solid ${severityColor};">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <span style="background: ${severityColor}; color: white; padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
                  <i class="fas ${severityIcon}"></i> ${severityText}
                </span>
                <span style="color: ${severityColor}; font-weight: 600; font-size: 0.9rem;">
                  ${missed.daysOverdue} day${missed.daysOverdue > 1 ? 's' : ''} overdue
                </span>
              </div>
              <div style="color: #333; margin-top: 0.75rem;">
                <strong style="font-size: 1.05rem;">${missed.assignmentTitle}</strong>
                <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">
                  <i class="fas fa-book" style="color: #4a90a4;"></i> ${missed.className}
                  <i class="fas fa-star"></i> ${missed.assignmentPoints} points
                </div>
              </div>
            </div>
          </div>
          
          <div style="text-align: right;">
            <div style="background: #f8f9fa; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 0.75rem;">
              <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.25rem;">Was Due</div>
              <div style="font-weight: 600; color: #dc3545;">
                <i class="fas fa-calendar-times"></i> ${missed.dueDate.toLocaleDateString()}
              </div>
              <div style="font-size: 0.85rem; color: #999; margin-top: 0.25rem;">
                ${missed.dueDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
              </div>
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; padding-top: 1rem; border-top: 2px solid #f0f0f0;">
          <button onclick="viewStudentInClass('${missed.classId}', '${missed.studentId}')" 
                  class="btn-secondary" 
                  style="flex: 1; min-width: 150px;">
            <i class="fas fa-user"></i> View Student
          </button>
          <button onclick="viewAssignmentDetailsFromMissed('${missed.classId}', '${missed.assignmentId}')"
                  class="btn-secondary" 
                  style="flex: 1; min-width: 150px;">
            <i class="fas fa-tasks"></i> View Assignment
          </button>
          <button onclick="sendReminderToStudent('${missed.studentName}', '${missed.studentEmail}', '${missed.assignmentTitle}', '${missed.className}')" 
                  class="btn-primary" 
                  style="flex: 1; min-width: 150px;">
            <i class="fas fa-paper-plane"></i> Send Reminder
          </button>
        </div>
      `;
      
      missedItemsContainer.appendChild(missedCard);
    });
  }
  
  // Initial render
  renderMissedItems(allMissedSubmissions);
  
  // Add filter event listeners
  document.getElementById('missed-search').addEventListener('input', function() {
    applyMissedFilters(allMissedSubmissions);
  });
  
  document.getElementById('missed-class-filter').addEventListener('change', function() {
    applyMissedFilters(allMissedSubmissions);
  });
  
  document.getElementById('missed-severity-filter').addEventListener('change', function() {
    applyMissedFilters(allMissedSubmissions);
  });
  
  function applyMissedFilters(items) {
    const searchTerm = document.getElementById('missed-search').value.toLowerCase();
    const classFilter = document.getElementById('missed-class-filter').value;
    const severityFilter = document.getElementById('missed-severity-filter').value;
    
    let filtered = items;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.studentName.toLowerCase().includes(searchTerm) ||
        item.assignmentTitle.toLowerCase().includes(searchTerm) ||
        item.className.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply class filter
    if (classFilter !== 'all') {
      filtered = filtered.filter(item => String(item.classId) === classFilter);
    }
    
    // Apply severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(item => {
        if (severityFilter === 'critical') return item.daysOverdue >= 7;
        if (severityFilter === 'warning') return item.daysOverdue >= 3 && item.daysOverdue < 7;
        if (severityFilter === 'recent') return item.daysOverdue < 3;
        return true;
      });
    }
    
    renderMissedItems(filtered);
  }
}

// New function specifically for missed tasks student view
async function viewStudentInClass(classId, studentId) {
  const classItem = classes.find(c => String(c.id) === String(classId));
  if (!classItem) {
    alert('❌ Class not found');
    return;
  }
  
  // ✅ FIX: Load fresh class data first
  try {
    await loadClassDataFromDatabase(classItem);
  } catch (e) {
    console.error('Error loading class data:', e);
  }
  
  const student = classItem.students ? 
    classItem.students.find(s => String(s.id) === String(studentId)) : null;
  
  if (!student) {
    alert('❌ Student not found');
    return;
  }
  
  const studentName = student.name || 
    `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student';
  const studentEmail = student.email || student.username || 'N/A';
  
  // Remove existing modal if any
  const existingModal = document.getElementById('missed-student-details-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create new modal
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.style.zIndex = '10001';
  modal.id = 'missed-student-details-modal';
  
  // Calculate student's missed assignments across ALL classes
  let missedAssignmentsHTML = '';
  let totalMissed = 0;
  
  classes.forEach(cls => {
    if (cls.assignments) {
      cls.assignments.forEach(assignment => {
        const dueDate = new Date(assignment.dueDate);
        const now = new Date();
        
        // Check if assignment is overdue
        if (dueDate < now) {
          const submission = assignment.submissions ? 
            assignment.submissions.find(s => String(s.studentId) === String(studentId)) : null;
          
          if (!submission) {
            totalMissed++;
            const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
            
            missedAssignmentsHTML += `
              <div style="padding: 1rem; border: 2px solid #dc3545; border-radius: 8px; margin-bottom: 1rem; background: #fff5f5;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                  <div>
                    <h4 style="margin: 0 0 0.5rem 0; color: #dc3545;">
                      <i class="fas fa-exclamation-circle"></i> ${assignment.title}
                    </h4>
                    <p style="margin: 0; color: #666; font-size: 0.9rem;">
                      <i class="fas fa-book"></i> ${cls.name}
                    </p>
                  </div>
                  <span style="background: #dc3545; color: white; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; font-size: 0.85rem;">
                    ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue
                  </span>
                </div>
                <div style="display: flex; gap: 1rem; font-size: 0.9rem; color: #666;">
                  <span><i class="fas fa-calendar-times"></i> Due: ${dueDate.toLocaleDateString()}</span>
                  <span><i class="fas fa-star"></i> ${assignment.points} points</span>
                </div>
              </div>
            `;
          }
        }
      });
    }
  });
  
  if (!missedAssignmentsHTML) {
    missedAssignmentsHTML = `
      <div style="text-align: center; padding: 2rem; background: #d4edda; border-radius: 8px;">
        <i class="fas fa-check-circle" style="font-size: 3rem; color: #28a745; margin-bottom: 1rem;"></i>
        <h4 style="color: #155724; margin: 0;">All Caught Up!</h4>
        <p style="color: #155724; margin: 0.5rem 0 0 0;">This student has no missed assignments.</p>
      </div>
    `;
  }
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <h3><i class="fas fa-user"></i> Student Details - Missed Assignments</h3>
        <button class="close-btn" onclick="closeMissedStudentModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding: 2rem;">
        <!-- Student Info Header -->
        <div style="display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; padding: 1.5rem; background: #f8f9fa; border-radius: 8px;">
          <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=4a90a4&color=fff&size=80" 
               alt="${studentName}" 
               style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #4a90a4;">
          <div style="flex: 1;">
            <h3 style="margin: 0 0 0.5rem 0; color: #333;">${studentName}</h3>
            <p style="margin: 0; color: #666;">
              <i class="fas fa-id-card"></i> ${student.student_id || student.id}
            </p>
            <p style="margin: 0.25rem 0; color: #666;">
              <i class="fas fa-envelope"></i> ${studentEmail}
            </p>
          </div>
          <div style="text-align: center; padding: 1rem; background: ${totalMissed > 0 ? '#f8d7da' : '#d4edda'}; border-radius: 8px; min-width: 100px;">
            <div style="font-size: 2rem; font-weight: 700; color: ${totalMissed > 0 ? '#dc3545' : '#28a745'};">
              ${totalMissed}
            </div>
            <div style="font-size: 0.85rem; color: #666;">Missed</div>
          </div>
        </div>
        
        <!-- Missed Assignments List -->
        <h4 style="margin-bottom: 1rem; color: #333;">
          <i class="fas fa-clipboard-list"></i> Missed Assignments
        </h4>
        ${missedAssignmentsHTML}
      </div>
      <div class="modal-footer" style="display: flex; gap: 1rem; justify-content: flex-end;">
        <button onclick="sendReminderToStudent('${studentName.replace(/'/g, "\\'")}', '${studentEmail.replace(/'/g, "\\'")}', 'Multiple Assignments', '${classItem.name.replace(/'/g, "\\'")}')" 
                class="btn-primary">
          <i class="fas fa-paper-plane"></i> Send Reminder
        </button>
        <button onclick="closeMissedStudentModal()" class="btn-secondary">
          <i class="fas fa-times"></i> Close
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Prevent modal from closing when clicking inside
  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
  
  // Close on outside click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeMissedStudentModal();
    }
  });
}

// Close missed student modal
function closeMissedStudentModal() {
  const modal = document.getElementById('missed-student-details-modal');
  if (modal) {
    modal.remove();
  }
}

function viewAssignmentDetails(classId, assignmentId) {
  const classItem = classes.find(c => c.id === classId);
  if (!classItem) {
    alert('âŒ Class not found');
    return;
  }
  
  const assignment = classItem.assignments ? 
    classItem.assignments.find(a => a.id === assignmentId) : null;
  
  if (!assignment) {
    alert('âŒ Assignment not found');
    return;
  }
  
  // Create detailed assignment view modal
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.style.zIndex = '10001';
  modal.id = 'assignment-details-modal';
  
  const dueDate = new Date(assignment.dueDate);
  const now = new Date();
  const isOverdue = dueDate < now;
  const daysOverdue = isOverdue ? Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)) : 0;
  
  // Calculate submission statistics
  const totalStudents = classItem.students ? classItem.students.length : 0;
  const submissionCount = assignment.submissions ? assignment.submissions.length : 0;
  const missedCount = totalStudents - submissionCount;
  const submissionRate = totalStudents > 0 ? ((submissionCount / totalStudents) * 100).toFixed(1) : 0;
  const gradedCount = assignment.submissions ? 
    assignment.submissions.filter(s => s.grade !== undefined).length : 0;
  
  // Get list of students who missed this assignment
  let missedStudentsList = '';
  if (classItem.students && missedCount > 0) {
    const missedStudents = classItem.students.filter(student => {
      const submission = assignment.submissions ? 
        assignment.submissions.find(s => String(s.studentId) === String(student.id)) : null;
      return !submission;
    });
    
    missedStudentsList = missedStudents.map(student => {
      const studentName = student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim();
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; margin-bottom: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=dc3545&color=fff" 
                 alt="${studentName}" 
                 style="width: 35px; height: 35px; border-radius: 50%; border: 2px solid #dc3545;">
            <div>
              <strong style="color: #333;">${studentName}</strong>
              <div style="font-size: 0.85rem; color: #666;">${student.email || student.username || 'N/A'}</div>
            </div>
          </div>
          <button onclick="sendReminderToStudent('${studentName}', '${student.email || student.username}', '${assignment.title}', '${classItem.name}'); closeAssignmentDetailsModal();" 
                  class="btn-primary btn-small" 
                  style="padding: 0.5rem 1rem; font-size: 0.85rem;">
            <i class="fas fa-paper-plane"></i> Remind
          </button>
        </div>
      `;
    }).join('');
  }
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <h3><i class="fas fa-tasks"></i> Assignment Details</h3>
        <button class="close-btn" onclick="closeAssignmentDetailsModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding: 2rem;">
        
        <!-- Assignment Header -->
        <div style="background: linear-gradient(135deg, #4a90a4 0%, #357a8f 100%); padding: 2rem; border-radius: 12px; color: white; margin-bottom: 2rem;">
          <h2 style="margin: 0 0 1rem 0; font-size: 1.8rem;">${assignment.title}</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
            <div>
              <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 0.25rem;">Due Date</div>
              <div style="font-size: 1.1rem; font-weight: 600;">
                <i class="fas fa-calendar"></i> ${dueDate.toLocaleDateString()}
              </div>
              <div style="font-size: 0.85rem; opacity: 0.85; margin-top: 0.25rem;">
                ${dueDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
              </div>
            </div>
            <div>
              <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 0.25rem;">Status</div>
              <div style="font-size: 1.1rem; font-weight: 600;">
                ${isOverdue ? 
                  `<span style="color: #ffcccc;"><i class="fas fa-exclamation-circle"></i> Overdue (${daysOverdue}d)</span>` : 
                  `<span><i class="fas fa-clock"></i> Active</span>`
                }
              </div>
            </div>
            <div>
              <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 0.25rem;">Points</div>
              <div style="font-size: 1.1rem; font-weight: 600;">
                <i class="fas fa-star"></i> ${assignment.points}
              </div>
            </div>
            <div>
              <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 0.25rem;">Class</div>
              <div style="font-size: 1.1rem; font-weight: 600;">
                <i class="fas fa-book"></i> ${classItem.name}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Statistics Panel -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          <div style="background: #e8f4f8; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #4a90a4;">
            <div style="font-size: 2rem; font-weight: 700; color: #4a90a4; margin-bottom: 0.5rem;">
              ${submissionCount}/${totalStudents}
            </div>
            <div style="font-size: 0.9rem; color: #666;">Submitted (${submissionRate}%)</div>
          </div>
          <div style="background: ${missedCount > 0 ? '#f8d7da' : '#d4edda'}; padding: 1.5rem; border-radius: 8px; border-left: 4px solid ${missedCount > 0 ? '#dc3545' : '#28a745'};">
            <div style="font-size: 2rem; font-weight: 700; color: ${missedCount > 0 ? '#dc3545' : '#28a745'}; margin-bottom: 0.5rem;">
              ${missedCount}
            </div>
            <div style="font-size: 0.9rem; color: #666;">Missed Submissions</div>
          </div>
          <div style="background: #d4edda; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #28a745;">
            <div style="font-size: 2rem; font-weight: 700; color: #28a745; margin-bottom: 0.5rem;">
              ${gradedCount}
            </div>
            <div style="font-size: 0.9rem; color: #666;">Graded</div>
          </div>
        </div>
        
        <!-- Description -->
        <div style="margin-bottom: 2rem;">
          <h4 style="margin-bottom: 0.75rem; color: #333;">
            <i class="fas fa-align-left"></i> Description
          </h4>
          <div style="padding: 1.25rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #4a90a4; line-height: 1.6;">
            ${assignment.description}
          </div>
        </div>
        
        ${assignment.instructions ? `
          <div style="margin-bottom: 2rem;">
            <h4 style="margin-bottom: 0.75rem; color: #333;">
              <i class="fas fa-list-ul"></i> Instructions
            </h4>
            <div style="padding: 1.25rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #17a2b8; line-height: 1.6; white-space: pre-wrap;">
              ${assignment.instructions}
            </div>
          </div>
        ` : ''}
        
        ${assignment.files && assignment.files.length > 0 ? `
          <div style="margin-bottom: 2rem;">
            <h4 style="margin-bottom: 0.75rem; color: #333;">
              <i class="fas fa-paperclip"></i> Attached Resources
            </h4>
            <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
              ${assignment.files.map(file => {
                const fileSource = file.url || file.content || '';
                const escapedName = file.name.replace(/'/g, "\\'");
                const escapedSource = fileSource.replace(/'/g, "\\'");
                
                return `
                  <a href="#" 
                    onclick="downloadFile('${escapedName}', '${escapedSource}'); return false;" 
                    style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: #e8f4f8; color: #4a90a4; text-decoration: none; border-radius: 6px; font-size: 0.9rem; font-weight: 500; transition: all 0.2s ease;"
                    onmouseover="this.style.background='#d0e8f0'"
                    onmouseout="this.style.background='#e8f4f8'">
                    <i class="fas fa-download"></i> ${file.name}
                  </a>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
        
        ${missedCount > 0 ? `
          <div style="margin-bottom: 2rem;">
            <h4 style="margin-bottom: 0.75rem; color: #dc3545; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-user-times"></i> 
              Students Who Missed This Assignment (${missedCount})
            </h4>
            <div style="max-height: 400px; overflow-y: auto; border: 2px solid #dc3545; border-radius: 8px; padding: 1rem; background: white;">
              ${missedStudentsList}
            </div>
          </div>
        ` : `
          <div style="text-align: center; padding: 2rem; background: #d4edda; border-radius: 8px; border: 2px solid #28a745;">
            <i class="fas fa-check-circle" style="font-size: 3rem; color: #28a745; margin-bottom: 1rem;"></i>
            <h4 style="color: #155724; margin: 0;">All Students Submitted!</h4>
            <p style="color: #155724; margin: 0.5rem 0 0 0;">No missing submissions for this assignment.</p>
          </div>
        `}
        
      </div>
      <div class="modal-footer" style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <button onclick="navigateToClassAndShowAssignments('${classId}')"
                class="btn-secondary" style="flex: 1; min-width: 150px;">
          <i class="fas fa-book-open"></i> Open in Class
        </button>
        <button onclick="rescheduleAssignment('${classId}', '${assignmentId}')" 
                class="btn-primary" style="flex: 1; min-width: 150px; background: #fd7e14;">
          <i class="fas fa-calendar-plus"></i> Reschedule Deadline
        </button>
        ${missedCount > 0 ? `
          <button onclick="sendBulkReminders('${classId}', '${assignmentId}'); closeMissedAssignmentModal();" 
                  class="btn-primary" style="flex: 1; min-width: 150px;">
            <i class="fas fa-paper-plane"></i> Remind All (${missedCount})
          </button>
        ` : ''}
        <button onclick="closeMissedAssignmentModal()" 
                class="btn-secondary">
          <i class="fas fa-times"></i> Close
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeAssignmentDetailsModal();
    }
  });
}

// New function specifically for missed tasks assignment view
function viewAssignmentDetailsFromMissed(classId, assignmentId) {
  const classItem = classes.find(c => String(c.id) === String(classId));
  if (!classItem) {
    alert('âŒ Class not found');
    return;
  }
  
  const assignment = classItem.assignments ? 
    classItem.assignments.find(a => String(a.id) === String(assignmentId)) : null;
  
  if (!assignment) {
    alert('âŒ Assignment not found');
    return;
  }
  
  // Remove existing modal if any
  const existingModal = document.getElementById('missed-assignment-details-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create detailed assignment view modal
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.style.zIndex = '10001';
  modal.id = 'missed-assignment-details-modal';
  
  const dueDate = new Date(assignment.dueDate);
  const now = new Date();
  const isOverdue = dueDate < now;
  const daysOverdue = isOverdue ? Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)) : 0;
  
  // Calculate submission statistics
  const totalStudents = classItem.students ? classItem.students.length : 0;
  const submissionCount = assignment.submissions ? assignment.submissions.length : 0;
  const missedCount = totalStudents - submissionCount;
  const submissionRate = totalStudents > 0 ? ((submissionCount / totalStudents) * 100).toFixed(1) : 0;
  const gradedCount = assignment.submissions ? 
    assignment.submissions.filter(s => s.grade !== undefined).length : 0;
  
  // Get list of students who missed this assignment
  let missedStudentsList = '';
  if (classItem.students && missedCount > 0) {
    const missedStudents = classItem.students.filter(student => {
      const submission = assignment.submissions ? 
        assignment.submissions.find(s => String(s.studentId) === String(student.id)) : null;
      return !submission;
    });
    
    missedStudentsList = missedStudents.map(student => {
      const studentName = student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim();
      const studentEmail = student.email || student.username || 'N/A';
      const escapedName = studentName.replace(/'/g, "\\'");
      const escapedEmail = studentEmail.replace(/'/g, "\\'");
      const escapedTitle = assignment.title.replace(/'/g, "\\'");
      const escapedClassName = classItem.name.replace(/'/g, "\\'");
      
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; margin-bottom: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=dc3545&color=fff" 
                 alt="${studentName}" 
                 style="width: 35px; height: 35px; border-radius: 50%; border: 2px solid #dc3545;">
            <div>
              <strong style="color: #333;">${studentName}</strong>
              <div style="font-size: 0.85rem; color: #666;">${studentEmail}</div>
            </div>
          </div>
          <button onclick="sendReminderToStudent('${escapedName}', '${escapedEmail}', '${escapedTitle}', '${escapedClassName}'); closeMissedAssignmentModal();" 
                  class="btn-primary btn-small" 
                  style="padding: 0.5rem 1rem; font-size: 0.85rem;">
            <i class="fas fa-paper-plane"></i> Remind
          </button>
        </div>
      `;
    }).join('');
  }
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <h3><i class="fas fa-tasks"></i> Assignment Details</h3>
        <button class="close-btn" onclick="closeMissedAssignmentModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding: 2rem;">
        
        <!-- Assignment Header -->
        <div style="background: linear-gradient(135deg, #4a90a4 0%, #357a8f 100%); padding: 2rem; border-radius: 12px; color: white; margin-bottom: 2rem;">
          <h2 style="margin: 0 0 1rem 0; font-size: 1.8rem;">${assignment.title}</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
            <div>
              <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 0.25rem;">Due Date</div>
              <div style="font-size: 1.1rem; font-weight: 600;">
                <i class="fas fa-calendar"></i> ${dueDate.toLocaleDateString()}
              </div>
              <div style="font-size: 0.85rem; opacity: 0.85; margin-top: 0.25rem;">
                ${dueDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
              </div>
            </div>
            <div>
              <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 0.25rem;">Status</div>
              <div style="font-size: 1.1rem; font-weight: 600;">
                ${isOverdue ? 
                  `<span style="color: #ffcccc;"><i class="fas fa-exclamation-circle"></i> Overdue (${daysOverdue}d)</span>` : 
                  `<span><i class="fas fa-clock"></i> Active</span>`
                }
              </div>
            </div>
            <div>
              <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 0.25rem;">Points</div>
              <div style="font-size: 1.1rem; font-weight: 600;">
                <i class="fas fa-star"></i> ${assignment.points}
              </div>
            </div>
            <div>
              <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 0.25rem;">Class</div>
              <div style="font-size: 1.1rem; font-weight: 600;">
                <i class="fas fa-book"></i> ${classItem.name}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Statistics Panel -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          <div style="background: #e8f4f8; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #4a90a4;">
            <div style="font-size: 2rem; font-weight: 700; color: #4a90a4; margin-bottom: 0.5rem;">
              ${submissionCount}/${totalStudents}
            </div>
            <div style="font-size: 0.9rem; color: #666;">Submitted (${submissionRate}%)</div>
          </div>
          <div style="background: ${missedCount > 0 ? '#f8d7da' : '#d4edda'}; padding: 1.5rem; border-radius: 8px; border-left: 4px solid ${missedCount > 0 ? '#dc3545' : '#28a745'};">
            <div style="font-size: 2rem; font-weight: 700; color: ${missedCount > 0 ? '#dc3545' : '#28a745'}; margin-bottom: 0.5rem;">
              ${missedCount}
            </div>
            <div style="font-size: 0.9rem; color: #666;">Missed Submissions</div>
          </div>
          <div style="background: #d4edda; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #28a745;">
            <div style="font-size: 2rem; font-weight: 700; color: #28a745; margin-bottom: 0.5rem;">
              ${gradedCount}
            </div>
            <div style="font-size: 0.9rem; color: #666;">Graded</div>
          </div>
        </div>
        
        <!-- Description -->
        <div style="margin-bottom: 2rem;">
          <h4 style="margin-bottom: 0.75rem; color: #333;">
            <i class="fas fa-align-left"></i> Description
          </h4>
          <div style="padding: 1.25rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #4a90a4; line-height: 1.6;">
            ${assignment.description}
          </div>
        </div>
        
        ${assignment.instructions ? `
          <div style="margin-bottom: 2rem;">
            <h4 style="margin-bottom: 0.75rem; color: #333;">
              <i class="fas fa-list-ul"></i> Instructions
            </h4>
            <div style="padding: 1.25rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #17a2b8; line-height: 1.6; white-space: pre-wrap;">
              ${assignment.instructions}
            </div>
          </div>
        ` : ''}
        
        ${assignment.files && assignment.files.length > 0 ? `
          <div style="margin-bottom: 2rem;">
            <h4 style="margin-bottom: 0.75rem; color: #333;">
              <i class="fas fa-paperclip"></i> Attached Resources
            </h4>
            <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
              ${assignment.files.map(file => {
                const fileSource = file.url || file.content || '';
                const escapedName = file.name.replace(/'/g, "\\'");
                const escapedSource = fileSource.replace(/'/g, "\\'");
                
                return `
                  <a href="#" 
                    onclick="downloadFile('${escapedName}', '${escapedSource}'); return false;" 
                    style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: #e8f4f8; color: #4a90a4; text-decoration: none; border-radius: 6px; font-size: 0.9rem; font-weight: 500; transition: all 0.2s ease;"
                    onmouseover="this.style.background='#d0e8f0'"
                    onmouseout="this.style.background='#e8f4f8'">
                    <i class="fas fa-download"></i> ${file.name}
                  </a>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
        
        ${missedCount > 0 ? `
          <div style="margin-bottom: 2rem;">
            <h4 style="margin-bottom: 0.75rem; color: #dc3545; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-user-times"></i> 
              Students Who Missed This Assignment (${missedCount})
            </h4>
            <div style="max-height: 400px; overflow-y: auto; border: 2px solid #dc3545; border-radius: 8px; padding: 1rem; background: white;">
              ${missedStudentsList}
            </div>
          </div>
        ` : `
          <div style="text-align: center; padding: 2rem; background: #d4edda; border-radius: 8px; border: 2px solid #28a745;">
            <i class="fas fa-check-circle" style="font-size: 3rem; color: #28a745; margin-bottom: 1rem;"></i>
            <h4 style="color: #155724; margin: 0;">All Students Submitted!</h4>
            <p style="color: #155724; margin: 0.5rem 0 0 0;">No missing submissions for this assignment.</p>
          </div>
        `}
        
      </div>
      <div class="modal-footer" style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <button onclick="navigateToClassAndShowAssignments('${classId}')"
                class="btn-secondary" style="flex: 1; min-width: 150px;">
          <i class="fas fa-book-open"></i> Open in Class
        </button>
        ${missedCount > 0 ? `
          <button onclick="sendBulkReminders('${classId}', '${assignmentId}'); closeMissedAssignmentModal();" 
                  class="btn-primary" style="flex: 1; min-width: 150px;">
            <i class="fas fa-paper-plane"></i> Remind All (${missedCount})
          </button>
        ` : ''}
        <button onclick="closeMissedAssignmentModal()" 
                class="btn-secondary">
          <i class="fas fa-times"></i> Close
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Prevent modal from closing when clicking inside
  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
  
  // Close on outside click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeMissedAssignmentModal();
    }
  });
}

// Close missed assignment modal
function closeMissedAssignmentModal() {
  const modal = document.getElementById('missed-assignment-details-modal');
  if (modal) {
    modal.remove();
  }
}

function sendBulkReminders(classId, assignmentId) {
  const classItem = classes.find(c => c.id === classId);
  if (!classItem) return;
  
  const assignment = classItem.assignments ? 
    classItem.assignments.find(a => a.id === assignmentId) : null;
  if (!assignment) return;
  
  // Get all students who missed this assignment
  const missedStudents = classItem.students ? classItem.students.filter(student => {
    const submission = assignment.submissions ? 
      assignment.submissions.find(s => String(s.studentId) === String(student.id)) : null;
    return !submission;
  }) : [];
  
  if (missedStudents.length === 0) {
    alert('No students to remind - all have submitted!');
    return;
  }
  
  // Create bulk reminder modal
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.style.zIndex = '10002';
  modal.id = 'bulk-reminder-modal';
  
  const studentEmails = missedStudents.map(s => s.email || s.username).join('; ');
  const studentNames = missedStudents.map(s => 
    s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim()
  ).join(', ');
  
  const message = `Dear Students,

This is a friendly reminder that you have not yet submitted your assignment "${assignment.title}" for ${classItem.name}.

The deadline has passed. If you have any concerns or need an extension, please contact me as soon as possible.

Students who haven't submitted: ${studentNames}

Thank you.`;
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 800px;">
      <div class="modal-header">
        <h3><i class="fas fa-paper-plane"></i> Send Bulk Reminder (${missedStudents.length} Students)</h3>
        <button class="close-btn" onclick="closeBulkReminderModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding: 2rem;">
        <div style="background: #e8f4f8; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #4a90a4;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i class="fas fa-users" style="color: #4a90a4;"></i>
            <strong style="color: #4a90a4;">Recipients (${missedStudents.length}):</strong>
          </div>
          <div style="color: #333; font-size: 0.95rem; max-height: 100px; overflow-y: auto;">
            ${missedStudents.map(s => {
              const name = s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim();
              return `â€¢ ${name} (${s.email || s.username})`;
            }).join('<br>')}
          </div>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #333;">
            <i class="fas fa-envelope"></i> Email Addresses:
          </label>
          <textarea id="bulk-email-addresses" readonly style="width: 100%; padding: 0.75rem; border: 2px solid #e0e0e0; border-radius: 8px; font-family: monospace; font-size: 0.9rem; min-height: 60px; resize: vertical; background: #f8f9fa;">${studentEmails}</textarea>
          <small style="color: #666;">Use this in the BCC field of your email</small>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #333;">
            <i class="fas fa-comment"></i> Message:
          </label>
          <textarea id="bulk-reminder-message" style="width: 100%; min-height: 250px; padding: 1rem; border: 2px solid #e0e0e0; border-radius: 8px; font-family: inherit; resize: vertical; line-height: 1.6;">${message}</textarea>
        </div>
        
        <div style="background: #fff3cd; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #ffc107;">
          <div style="display: flex; align-items: start; gap: 0.75rem;">
            <i class="fas fa-lightbulb" style="color: #856404; margin-top: 0.25rem;"></i>
            <div style="color: #856404; font-size: 0.9rem; line-height: 1.5;">
              <strong>Tip:</strong> Copy the email addresses to BCC (not CC) to protect student privacy. Each student won't see who else received the reminder.
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <button onclick="copyBulkReminderData()" class="btn-primary" style="flex: 1; min-width: 150px;">
            <i class="fas fa-copy"></i> Copy All Data
          </button>
          <button onclick="openBulkEmailClient('${studentEmails.replace(/'/g, "\\'")}')" class="btn-secondary" style="flex: 1; min-width: 150px;">
            <i class="fas fa-external-link-alt"></i> Open Email Client
          </button>
          <button onclick="closeBulkReminderModal()" class="btn-secondary">
            <i class="fas fa-times"></i> Close
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeBulkReminderModal();
    }
  });
}

// Helper function to send reminder to student
function sendReminderToStudent(studentName, studentEmail, assignmentTitle, className) {
  const message = `Dear ${studentName},

This is a friendly reminder that you have not yet submitted your assignment "${assignmentTitle}" for ${className}.

The deadline has passed, but if you have any concerns or need an extension, please contact me as soon as possible.

Thank you.`;
  
  // Show modal with reminder template
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.id = 'reminder-modal';
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h3><i class="fas fa-paper-plane"></i> Send Reminder to ${studentName}</h3>
        <button class="close-btn" onclick="closeReminderModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding: 2rem;">
        <div style="background: #e8f4f8; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #4a90a4;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i class="fas fa-info-circle" style="color: #4a90a4;"></i>
            <strong style="color: #4a90a4;">Student Email:</strong>
          </div>
          <div style="color: #333; font-size: 1.05rem;">${studentEmail}</div>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #333;">
            <i class="fas fa-envelope"></i> Reminder Message:
          </label>
          <textarea id="reminder-message-text" style="width: 100%; min-height: 200px; padding: 1rem; border: 2px solid #e0e0e0; border-radius: 8px; font-family: inherit; resize: vertical; line-height: 1.6;">${message}</textarea>
        </div>
        
        <div style="background: #fff3cd; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #ffc107;">
          <div style="display: flex; align-items: start; gap: 0.75rem;">
            <i class="fas fa-exclamation-triangle" style="color: #856404; margin-top: 0.25rem;"></i>
            <div style="color: #856404; font-size: 0.9rem; line-height: 1.5;">
              <strong>Note:</strong> You'll need to send this message through your email client. Click "Copy Message" to copy the text, then paste it into your email.
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 1rem;">
          <button onclick="copyReminderMessage()" class="btn-primary" style="flex: 1;">
            <i class="fas fa-copy"></i> Copy Message
          </button>
          <button onclick="openEmailClient('${studentEmail}')" class="btn-secondary" style="flex: 1;">
            <i class="fas fa-external-link-alt"></i> Open Email Client
          </button>
          <button onclick="closeReminderModal()" class="btn-secondary">
            <i class="fas fa-times"></i> Close
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeReminderModal();
    }
  });
}

function copyReminderMessage() {
  const textarea = document.getElementById('reminder-message-text');
  textarea.select();
  document.execCommand('copy');
  
  alert('Message copied to clipboard!');
}

function copyBulkReminderData() {
  const emails = document.getElementById('bulk-email-addresses').value;
  const message = document.getElementById('bulk-reminder-message').value;
  
  const combined = `BCC Addresses:\n${emails}\n\n---\n\nMessage:\n${message}`;
  
  // Copy to clipboard
  const textarea = document.createElement('textarea');
  textarea.value = combined;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  
  alert('Email addresses and message copied to clipboard!');
}

function openBulkEmailClient(emails) {
  const message = document.getElementById('bulk-reminder-message').value;
  const subject = encodeURIComponent('Reminder: Missed Assignment Submission');
  const body = encodeURIComponent(message);
  
  // Note: Most email clients don't support BCC via mailto, so this opens with TO field
  // User will need to move addresses to BCC manually
  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  
  alert('Note: Please move the email addresses to the BCC field to protect student privacy!');
}

function closeBulkReminderModal() {
  const modal = document.getElementById('bulk-reminder-modal');
  if (modal) {
    modal.remove();
  }
}

// Helper function to send reminder to student
function sendReminderToStudent(studentName, studentEmail, assignmentTitle, className) {
  const message = `Dear ${studentName},

This is a friendly reminder that you have not yet submitted your assignment "${assignmentTitle}" for ${className}.

The deadline has passed, but if you have any concerns or need an extension, please contact me as soon as possible.

Thank you.`;
  
  // Show modal with reminder template
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.id = 'reminder-modal';
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h3><i class="fas fa-paper-plane"></i> Send Reminder to ${studentName}</h3>
        <button class="close-btn" onclick="closeReminderModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding: 2rem;">
        <div style="background: #e8f4f8; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #4a90a4;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i class="fas fa-info-circle" style="color: #4a90a4;"></i>
            <strong style="color: #4a90a4;">Student Email:</strong>
          </div>
          <div style="color: #333; font-size: 1.05rem;">${studentEmail}</div>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #333;">
            <i class="fas fa-envelope"></i> Reminder Message:
          </label>
          <textarea id="reminder-message-text" style="width: 100%; min-height: 200px; padding: 1rem; border: 2px solid #e0e0e0; border-radius: 8px; font-family: inherit; resize: vertical; line-height: 1.6;">${message}</textarea>
        </div>
        
        <div style="background: #fff3cd; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #ffc107;">
          <div style="display: flex; align-items: start; gap: 0.75rem;">
            <i class="fas fa-exclamation-triangle" style="color: #856404; margin-top: 0.25rem;"></i>
            <div style="color: #856404; font-size: 0.9rem; line-height: 1.5;">
              <strong>Note:</strong> You'll need to send this message through your email client. Click "Copy Message" to copy the text, then paste it into your email.
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 1rem;">
          <button onclick="copyReminderMessage()" class="btn-primary" style="flex: 1;">
            <i class="fas fa-copy"></i> Copy Message
          </button>
          <button onclick="openEmailClient('${studentEmail}')" class="btn-secondary" style="flex: 1;">
            <i class="fas fa-external-link-alt"></i> Open Email Client
          </button>
          <button onclick="closeReminderModal()" class="btn-secondary">
            <i class="fas fa-times"></i> Close
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeReminderModal();
    }
  });
}

function openEmailClient(email) {
  const message = document.getElementById('reminder-message-text').value;
  const subject = encodeURIComponent('Reminder: Missed Assignment Submission');
  const body = encodeURIComponent(message);
  
  window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
}

function closeReminderModal() {
  const modal = document.getElementById('reminder-modal');
  if (modal) {
    modal.remove();
  }
}

// UPDATE: Add missed tasks notification check
function checkMissedTasksForNotifications() {
  const lastCheck = localStorage.getItem('professor_last_missed_check');
  const lastCheckTime = lastCheck ? new Date(lastCheck) : new Date(0);
  const now = new Date();
  
  let newMissedCount = 0;
  const missedDetails = [];
  
  classes.forEach(classItem => {
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const dueDate = new Date(assignment.dueDate);
        
        // âœ… FIX: Check if assignment became overdue since last check
        if (dueDate < now && dueDate > lastCheckTime) {
          if (classItem.students) {
            classItem.students.forEach(student => {
              const submission = assignment.submissions ? 
                assignment.submissions.find(s => String(s.studentId) === String(student.id)) : null;
              
              if (!submission) {
                newMissedCount++;
                const studentName = student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim();
                missedDetails.push(`${studentName} - ${assignment.title}`);
              }
            });
          }
        }
      });
    }
  });
  
  if (newMissedCount > 0) {
    console.log(`📢 New missed tasks: ${newMissedCount}`, missedDetails);
    addNotification(
      'deadline',
      'New Missed Submissions',
      `${newMissedCount} student${newMissedCount > 1 ? 's have' : ' has'} missed assignment deadlines`,
      'section:missed-tasks-section'
    );
  }
  
  localStorage.setItem('professor_last_missed_check', now.toISOString());
}


// UPDATE showSection to load archived when viewing that section:
function showSection(sectionId, element = null) {
  contentSections.forEach(section => {
    section.classList.remove('active');
  });
  
  const classView = document.getElementById('class-view');
  if (classView) {
    classView.classList.add('hidden');
    classView.classList.remove('active');
  }

  if (sectionId === 'missed-tasks-section') {
    loadMissedTasks();
  }

  if (element) {
    navLinks.forEach(link => {
      link.classList.remove('active');
    });
    element.classList.add('active');
  }

  if (sectionId !== 'class-view') {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
      
      if (sectionId === 'students-section') {
        setTimeout(loadAllStudents, 50);
      } else if (sectionId === 'archived-section') {
        setTimeout(loadArchivedClasses, 50);
      }
    }
  }
}

// Delete class
async function deleteClass(classId) {
  if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`/api/professor/classes`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ class_id: classId })
    });

    const result = await response.json();

    if (response.ok) {
      // Remove the class from the local array
      classes = classes.filter(c => c.id !== classId);
      renderClassList();
      alert('Class deleted successfully!');
      updateDashboardStats(); // Update dashboard after class deletion
    } else {
      alert(result.error || 'Failed to delete class');
    }
  } catch (error) {
    console.error('Error deleting class:', error);
    alert('Error deleting class. Please try again.');
  }
}

// Copy class code to clipboard
function copyClassCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    alert('Class code copied to clipboard!');
  });
}

// Open class view
async function openClass(classId, isArchived = false) {
  currentClassId = classId;
  
  let classItem = classes.find(c => String(c.id) === String(classId));
  
  if (!classItem) {
      // Try loading from archived classes
      try {
        const response = await fetch('/api/professor/classes?archived=true');
        if (response.ok) {
          const archivedClasses = await response.json();
          classItem = archivedClasses.find(c => String(c.id) === String(classId));
          
          if (classItem) {
            await loadClassDataFromDatabase(classItem);
            displayArchivedClassView(classItem);
            return;
          }
        }
      } catch (error) {
        console.error('Error loading archived class:', error);
      }
      
      alert('❌ Class not found');
      return;
    }
  
  // ✅ Load fresh data from database for active classes
  await loadClassDataFromDatabase(classItem);
  
  // Hide all sections
  contentSections.forEach(section => {
    section.classList.remove('active');
  });
  
  navLinks.forEach(link => {
    link.classList.remove('active');
  });
  
  const studentsCount = classItem.students ? classItem.students.length : 0;
  const materialsCount = classItem.materials ? classItem.materials.length : 0;
  const assignmentsCount = classItem.assignments ? classItem.assignments.length : 0;

  document.getElementById('class-title').textContent = classItem.name;
  document.getElementById('class-desc').textContent = classItem.description || 'No description provided';
  
  document.getElementById('class-students').textContent = studentsCount;
  document.getElementById('class-materials').textContent = materialsCount;
  document.getElementById('class-assignments').textContent = assignmentsCount;
  
  const enrolledSection = document.getElementById('enrolled-section');
  if (enrolledSection) {
    enrolledSection.classList.remove('active');
  }
  
  const classView = document.getElementById('class-view');
  if (classView) {
    classView.classList.remove('hidden');
    classView.classList.add('active');
    
    // ✅ Remove archived flag for active classes
    delete classView.dataset.archived;
    
    // ✅ Remove archived banner if it exists
    const existingBanner = classView.querySelector('.archived-banner');
    if (existingBanner) {
      existingBanner.remove();
    }
  }
  
  loadClassPosts();
  loadClassStudents();
  loadClassAssignments();
  loadClassGrades();
  
  console.log('✅ Class opened successfully');
}

function displayArchivedClassView(classItem) {
  contentSections.forEach(section => {
    section.classList.remove('active');
  });
  
  navLinks.forEach(link => {
    link.classList.remove('active');
  });
  
  const studentsCount = classItem.students ? classItem.students.length : 0;
  const materialsCount = classItem.materials ? classItem.materials.length : 0;
  const assignmentsCount = classItem.assignments ? classItem.assignments.length : 0;

  document.getElementById('class-title').textContent = classItem.name + ' (Archived - Read Only)';
  document.getElementById('class-desc').textContent = classItem.description || 'No description provided';
  
  document.getElementById('class-students').textContent = studentsCount;
  document.getElementById('class-materials').textContent = materialsCount;
  document.getElementById('class-assignments').textContent = assignmentsCount;
  
  const classView = document.getElementById('class-view');
  if (classView) {
    classView.classList.remove('hidden');
    classView.classList.add('active');
    
    // ✅ Add archived flag
    classView.dataset.archived = 'true';
    
    // ✅ Remove existing banner first
    const existingBanner = classView.querySelector('.archived-banner');
    if (existingBanner) {
      existingBanner.remove();
    }
    
    // ✅ Add archived banner
    const banner = document.createElement('div');
    banner.className = 'archived-banner';
    banner.style.cssText = `
      background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
      color: #333;
      padding: 1rem 1.5rem;
      text-align: center;
      font-weight: 600;
      margin-bottom: 1rem;
      border-radius: 8px;
      border: 2px solid #e0a800;
      box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
    `;
    banner.innerHTML = '<i class="fas fa-archive"></i> This class is archived - View Only Mode (Editing is disabled)';
    classView.querySelector('.class-header').after(banner);
    
    // ✅ Disable all interactive elements
    const buttons = classView.querySelectorAll('button:not(.tab-btn):not(.close-btn):not(#back-to-classes)');
    buttons.forEach(button => {
      button.disabled = true;
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
      button.title = 'Disabled - Class is archived';
    });
    
    // ✅ Disable file inputs and text areas
    const inputs = classView.querySelectorAll('input[type="file"], textarea, input[type="text"], input[type="number"]');
    inputs.forEach(input => {
      input.disabled = true;
      input.style.opacity = '0.6';
      input.style.cursor = 'not-allowed';
    });
  }
  
  // ✅ Load content in read-only mode
  loadClassPosts();
  loadClassStudents();
  loadClassAssignments(true); // ← Pass true for archived
  loadClassGrades();
  
  console.log('✅ Archived class view displayed successfully');
}


// ✅ NEW: Reschedule assignment deadline
function rescheduleAssignment(classId, assignmentId) {
  const classItem = classes.find(c => String(c.id) === String(classId));
  if (!classItem) {
    alert('❌ Class not found');
    return;
  }
  
  const assignment = classItem.assignments ? 
    classItem.assignments.find(a => String(a.id) === String(assignmentId)) : null;
  
  if (!assignment) {
    alert('❌ Assignment not found');
    return;
  }
  
  const currentDueDate = new Date(assignment.dueDate);
  const formattedDate = currentDueDate.toISOString().slice(0, 16);
  
  // Create reschedule modal
  const existingModal = document.getElementById('reschedule-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.style.zIndex = '10002';
  modal.id = 'reschedule-modal';
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h3><i class="fas fa-calendar-plus"></i> Reschedule Assignment</h3>
        <button class="close-btn" onclick="closeRescheduleModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding: 2rem;">
        <div style="background: #fff3cd; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404; line-height: 1.5;">
            <strong><i class="fas fa-info-circle"></i> Note:</strong> 
            Rescheduling will update the deadline for all students, including those who already missed it.
          </p>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <h4 style="margin-bottom: 0.5rem;">Assignment Details</h4>
          <p style="margin: 0.25rem 0; color: #666;"><strong>Title:</strong> ${assignment.title}</p>
          <p style="margin: 0.25rem 0; color: #666;"><strong>Class:</strong> ${classItem.name}</p>
          <p style="margin: 0.25rem 0; color: #dc3545;"><strong>Current Deadline:</strong> ${currentDueDate.toLocaleString()}</p>
        </div>
        
        <div class="form-group">
          <label for="new-due-date" style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
            <i class="fas fa-calendar-alt"></i> New Deadline *
          </label>
          <input type="datetime-local" 
                 id="new-due-date" 
                 value="${formattedDate}"
                 min="${new Date().toISOString().slice(0, 16)}"
                 style="width: 100%; padding: 0.75rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;">
        </div>
        
        <div class="form-group" style="margin-top: 1.5rem;">
          <label>
            <input type="checkbox" id="notify-students" checked style="margin-right: 0.5rem;">
            <strong>Notify all students about the new deadline</strong>
          </label>
        </div>
      </div>
      <div class="modal-footer" style="display: flex; gap: 1rem;">
        <button onclick="closeRescheduleModal()" class="btn-secondary" style="flex: 1;">
          <i class="fas fa-times"></i> Cancel
        </button>
        <button onclick="saveRescheduledDate('${classId}', '${assignmentId}')" class="btn-primary" style="flex: 1;">
          <i class="fas fa-save"></i> Save New Deadline
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeRescheduleModal();
    }
  });
}

function closeRescheduleModal() {
  const modal = document.getElementById('reschedule-modal');
  if (modal) {
    modal.remove();
  }
}

// In professor-script.js - UPDATE the saveRescheduledDate function
async function saveRescheduledDate(classId, assignmentId) {
  const newDueDate = document.getElementById('new-due-date').value;
  const notifyStudents = document.getElementById('notify-students').checked;
  
  if (!newDueDate) {
    alert('⚠️ Please select a new deadline');
    return;
  }
  
  const newDate = new Date(newDueDate);
  const now = new Date();
  
  if (newDate <= now) {
    alert('⚠️ New deadline must be in the future');
    return;
  }
  
  const classItem = classes.find(c => String(c.id) === String(classId));
  if (!classItem) {
    alert('❌ Class not found');
    return;
  }
  
  const assignment = classItem.assignments ? 
    classItem.assignments.find(a => String(a.id) === String(assignmentId)) : null;
  
  if (!assignment) {
    alert('❌ Assignment not found');
    return;
  }
  
  const oldDate = new Date(assignment.dueDate);
  
  if (!confirm(`📅 Confirm Reschedule\n\nOld deadline: ${oldDate.toLocaleString()}\nNew deadline: ${newDate.toLocaleString()}\n\nThis will update the deadline for all students. Continue?`)) {
    return;
  }
  
  try {
    // ✅ FIX: Update in database first
    const response = await fetch(`/api/professor/assignments/${assignmentId}/update-deadline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        due_date: newDate.toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update deadline in database');
    }
    
    // ✅ Update in local state
    assignment.dueDate = newDate.toISOString();
    
    // ✅ CRITICAL FIX: Update calendar events
    updateCalendarAfterDeadlineChange(classId, assignmentId, oldDate, newDate);
    
    // ✅ Update in classes array
    const classIndex = classes.findIndex(c => String(c.id) === String(classId));
    if (classIndex !== -1 && classes[classIndex].assignments) {
      const assignmentIndex = classes[classIndex].assignments.findIndex(a => String(a.id) === String(assignmentId));
      if (assignmentIndex !== -1) {
        classes[classIndex].assignments[assignmentIndex].dueDate = newDate.toISOString();
      }
    }
    
    // ✅ Update in localStorage
    const savedClasses = localStorage.getItem('professor_classes');
    if (savedClasses) {
      const localClasses = JSON.parse(savedClasses);
      const localClass = localClasses.find(c => String(c.id) === String(classId));
      if (localClass && localClass.assignments) {
        const localAssignment = localClass.assignments.find(a => String(a.id) === String(assignmentId));
        if (localAssignment) {
          localAssignment.dueDate = newDate.toISOString();
          localStorage.setItem('professor_classes', JSON.stringify(localClasses));
        }
      }
    }
    
    closeRescheduleModal();
    closeMissedAssignmentModal();
    
    // ✅ FIX: Force reload class data
    await loadClassDataFromDatabase(classItem);
    
    // ✅ Refresh ALL views
    if (currentClassId === classId) {
      loadClassAssignments();
    }
    loadMissedTasks();
    
    if (typeof initializeCalendar === 'function') {
      initializeCalendar();
    }
    
    if (notifyStudents) {
      addNotification(
        'assignment',
        'Assignment Deadline Extended',
        `"${assignment.title}" deadline has been extended to ${newDate.toLocaleDateString()}`,
        `class:${classId}`
      );
    }
    
    alert(`✅ Assignment rescheduled successfully!\n\nNew deadline: ${newDate.toLocaleString()}\n${notifyStudents ? 'Students will be notified.' : ''}`);
    
  } catch (error) {
    console.error('❌ Error rescheduling assignment:', error);
    alert('❌ Failed to reschedule assignment: ' + error.message);
  }
}

// ✅ ADD NEW FUNCTION: Update calendar after deadline change
function updateCalendarAfterDeadlineChange(classId, assignmentId, oldDate, newDate) {
  // Remove old calendar event
  const oldDateKey = `${oldDate.getFullYear()}-${oldDate.getMonth() + 1}-${oldDate.getDate()}`;
  
  // Load current calendar events
  const savedEvents = localStorage.getItem('calendar_events');
  let calendarEvents = savedEvents ? JSON.parse(savedEvents) : {};
  
  // Remove assignment from old date
  if (calendarEvents[oldDateKey]) {
    calendarEvents[oldDateKey] = calendarEvents[oldDateKey].filter(event => 
      !event.includes(`Assignment Due:`) || !event.includes(assignmentId)
    );
    
    // Remove date key if no events left
    if (calendarEvents[oldDateKey].length === 0) {
      delete calendarEvents[oldDateKey];
    }
  }
  
  // Add to new date
  const newDateKey = `${newDate.getFullYear()}-${newDate.getMonth() + 1}-${newDate.getDate()}`;
  const classItem = classes.find(c => String(c.id) === String(classId));
  const assignment = classItem.assignments.find(a => String(a.id) === String(assignmentId));
  
  if (!calendarEvents[newDateKey]) {
    calendarEvents[newDateKey] = [];
  }
  
  // Add new event with assignment ID for better tracking
  const newEvent = `Assignment Due: ${assignment.title} (${classItem.name}) - ID:${assignmentId}`;
  if (!calendarEvents[newDateKey].includes(newEvent)) {
    calendarEvents[newDateKey].push(newEvent);
  }
  
  // Save updated calendar events
  localStorage.setItem('calendar_events', JSON.stringify(calendarEvents));
  
  console.log('✅ Calendar events updated for rescheduled assignment');
}


// ✅ NEW HELPER FUNCTION: Load class data from database
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

// Helper function to properly navigate to class from any section
function navigateToClass(classId) {
  // Close any open modals first
  closeMissedAssignmentModal();
  closeMissedStudentModal();
  closeSubmissionsModal();
  closeAssignmentDetailsModal();
  
  // Small delay to ensure modals are closed
  setTimeout(() => {
    openClass(classId);
  }, 100);
}

// Navigate to class and show assignments tab
function navigateToClassAndShowAssignments(classId) {
  // Close the modal first
  closeMissedAssignmentModal();
  
  // Hide all sections
  contentSections.forEach(section => {
    section.classList.remove('active');
  });
  
  // Remove active from nav links
  navLinks.forEach(link => {
    link.classList.remove('active');
  });
  
  // Small delay to ensure smooth transition
  setTimeout(() => {
    // Open the class
    openClass(classId);
    
    // Wait for class to open, then switch to assignments tab
    setTimeout(() => {
      switchTab('assignments');
    }, 200);
  }, 150);
}

// Switch tabs in class view
function switchTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab content and activate button
  document.getElementById(`${tabName}-tab`).classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// DELETE ASSIGNMENT FUNCTION
async function deleteAssignment(assignmentId) {
  if (!confirm('Are you sure you want to delete this assignment? This will also delete all student submissions.')) {
    return;
  }
  
  try {
    // ✅ DELETE FROM DATABASE FIRST
    const response = await fetch(`/api/professor/assignments/${assignmentId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete assignment');
    }
    
    console.log('✅ Assignment deleted from database');
    
    // ✅ CLEAR FRONTEND CACHE COMPLETELY
    const classItem = classes.find(c => c.id === currentClassId);
    if (classItem && classItem.assignments) {
      classItem.assignments = classItem.assignments.filter(a => a.id !== assignmentId);
      
      // Update classes array
      const classIndex = classes.findIndex(c => c.id === currentClassId);
      if (classIndex !== -1) {
        classes[classIndex] = classItem;
      }
    }
    
    // ✅ CLEAR LOCALSTORAGE CACHE
    try {
      localStorage.removeItem('professor_classes'); // Force fresh load next time
    } catch (e) {
      console.warn('Could not clear localStorage:', e);
    }
    
    // ✅ RELOAD FROM DATABASE
    await loadClasses();
    
    // ✅ REFRESH CURRENT CLASS VIEW
    if (currentClassId) {
      const currentClass = classes.find(c => c.id === currentClassId);
      if (currentClass) {
        await loadClassDataFromDatabase(currentClass);
        loadClassAssignments();
        document.getElementById('class-assignments').textContent = 
          currentClass.assignments ? currentClass.assignments.length : 0;
      }
    }
    
    updateDashboardStats();
    
    alert('✅ Assignment deleted successfully!');
    
  } catch (error) {
    console.error('❌ Error deleting assignment:', error);
    alert('❌ Error deleting assignment: ' + error.message);
  }
}

// DELETE MATERIAL/POST FUNCTION
async function deleteMaterial(materialId) {
  if (!confirm('Are you sure you want to delete this material?')) {
    return;
  }
  
  try {
    // ✅ DELETE FROM DATABASE FIRST
    const response = await fetch(`/api/professor/materials/${materialId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete material');
    }
    
    console.log('✅ Material deleted from database');
    
    // ✅ THEN update local state
    const classItem = classes.find(c => c.id === currentClassId);
    if (classItem && classItem.materials) {
      classItem.materials = classItem.materials.filter(m => m.id !== materialId);
      
      const classIndex = classes.findIndex(c => c.id === currentClassId);
      if (classIndex !== -1) {
        classes[classIndex] = classItem;
      }
    }
    
    // Update localStorage cache (optional)
    try {
      const savedClasses = localStorage.getItem('professor_classes');
      if (savedClasses) {
        let localClasses = JSON.parse(savedClasses);
        const localClassIndex = localClasses.findIndex(c => c.id === currentClassId);
        
        if (localClassIndex !== -1 && localClasses[localClassIndex].materials) {
          localClasses[localClassIndex].materials = 
            localClasses[localClassIndex].materials.filter(m => m.id !== materialId);
          localStorage.setItem('professor_classes', JSON.stringify(localClasses));
        }
      }
    } catch (storageError) {
      console.warn('⚠️ Could not update localStorage cache:', storageError);
    }
    
    // Reload from database
    await loadClasses();
    
    if (currentClassId) {
      const currentClass = classes.find(c => c.id === currentClassId);
      if (currentClass) {
        await loadClassDataFromDatabase(currentClass);
        loadClassPosts();
        document.getElementById('class-materials').textContent = 
          currentClass.materials ? currentClass.materials.length : 0;
      }
    }
    
    updateDashboardStats();
    
    alert('✅ Material deleted successfully!');
    
  } catch (error) {
    console.error('❌ Error deleting material:', error);
    alert('❌ Error deleting material: ' + error.message);
  }
}

// Add near the top of the file (after DOMContentLoaded)
function clearLocalStorageCache() {
  if (confirm('⚠️ Your local storage is full. Clear cache?\n\n✅ This will NOT delete your data from the database.\n❌ You may need to reload classes.')) {
    try {
      // Keep only essential data
      const userType = document.body.classList.contains('professor-dashboard') ? 'professor' : 'student';
      const avatar = localStorage.getItem(`${userType}_avatar`);
      const notifications = localStorage.getItem(`${userType}_notifications`);
      
      // Clear everything
      localStorage.clear();
      
      // Restore essential data
      if (avatar) localStorage.setItem(`${userType}_avatar`, avatar);
      if (notifications) localStorage.setItem(`${userType}_notifications`, notifications);
      
      alert('✅ Cache cleared! Reloading page...');
      window.location.reload();
    } catch (e) {
      console.error('Error clearing cache:', e);
      alert('❌ Failed to clear cache. Please try manually clearing browser data.');
    }
  }
}

// Load class posts/materials
function loadClassPosts() {
  const classItem = classes.find(c => c.id === currentClassId);
  const postsContainer = document.getElementById('posts-container');
  
  if (!classItem || !postsContainer) return;
  
  postsContainer.innerHTML = '';
  
  if (!classItem.materials || classItem.materials.length === 0) {
    postsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-file-upload"></i>
        <h3>No Materials Posted</h3>
        <p>Upload your first material to get started</p>
      </div>
    `;
    return;
  }
  
  const sortedMaterials = classItem.materials.sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedMaterials.forEach(material => {
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    postElement.innerHTML = `
      <div class="post-header">
        <h4>${material.title}</h4>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <span class="post-date">${new Date(material.date).toLocaleDateString()}</span>
          <button class="btn-danger btn-small" onclick="deleteMaterial('${material.id}')" title="Delete material">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <p class="post-description">${material.description}</p>
      ${material.deadline ? `<p class="post-deadline"><strong>Deadline:</strong> ${new Date(material.deadline).toLocaleDateString()}</p>` : ''}
      ${material.resourceLink ? `<p class="post-link"><a href="${material.resourceLink}" target="_blank">${material.resourceLink}</a></p>` : ''}
      ${material.files && material.files.length > 0 ? `
        <div class="post-files">
          <strong>Attached Files:</strong>
          <ul>
            ${material.files.map(file => `
              <li>
                <a href="#" onclick="downloadFile('${file.name.replace(/'/g, "\\'")}', '${file.url || file.content}'); return false;">
                  <i class="fas fa-download"></i> ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    `;
    postsContainer.appendChild(postElement);
  });
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

// Load class assignments
// REPLACE loadClassAssignments function to remove per-student extend buttons
function loadClassAssignments(isArchived = false) {
  const classItem = classes.find(c => c.id === currentClassId);
  const assignmentsContainer = document.getElementById('assignments-container');
  
  if (!classItem || !assignmentsContainer) return;
  
  assignmentsContainer.innerHTML = '';
  
  if (!isArchived) {
    const professorClasses = localStorage.getItem('professor_classes');
    if (professorClasses) {
      try {
        const profClasses = JSON.parse(professorClasses);
        const matchingClass = profClasses.find(pc => pc.code === classItem.code);
        if (matchingClass && matchingClass.assignments) {
          classItem.assignments = matchingClass.assignments;
          console.log('✅ Loaded assignments from professor data:', classItem.assignments.length);
        }
      } catch (e) {
        console.error('Error loading professor assignments:', e);
      }
    }
  }
  
  if (!classItem.assignments || classItem.assignments.length === 0) {
    assignmentsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-tasks"></i>
        <h3>No Assignments</h3>
        <p>No assignments have been posted for this class yet</p>
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
    // ✅ FIX: Count submissions correctly from database
  const submissionCount = assignment.submissions && Array.isArray(assignment.submissions) ? 
      assignment.submissions.length : 0;
    
    const gradedCount = assignment.submissions && Array.isArray(assignment.submissions) ? 
      assignment.submissions.filter(s => s.grade !== undefined && s.grade !== null).length : 0;
    
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    const isOverdue = dueDate < now;
    
    console.log(`📊 Assignment "${assignment.title}": ${submissionCount} submissions, ${gradedCount} graded`);
    
    const assignmentElement = document.createElement('div');
    assignmentElement.className = 'assignment-card';
    assignmentElement.innerHTML = `
      <div class="assignment-header">
        <h4>${assignment.title}</h4>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <span class="due-date ${isOverdue ? 'overdue' : ''}">
            Due: ${dueDate.toLocaleDateString()}
            ${isOverdue ? ' (Overdue)' : ''}
          </span>
          <!-- ✅ FIX: Single extend button per assignment -->
          <button class="btn-warning btn-small" 
                  onclick="rescheduleAssignment('${currentClassId}', '${assignment.id}')" 
                  title="Extend deadline for all students">
            <i class="fas fa-calendar-plus"></i> Extend Deadline
          </button>
          <button class="btn-danger btn-small" onclick="deleteAssignment('${assignment.id}')" title="Delete assignment">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <p class="assignment-description">${assignment.description}</p>
      <div class="assignment-details">
        <span><i class="fas fa-file-alt"></i> ${assignment.points} Points</span>
        <span><i class="fas fa-users"></i> ${submissionCount} Submissions</span>
        <span><i class="fas fa-check-circle"></i> ${gradedCount} Graded</span>
      </div>
      ${assignment.files && assignment.files.length > 0 ? `
        <div class="assignment-files">
          <strong>Resources:</strong>
          <ul>
            ${assignment.files.map(file => {
              const fileSource = file.url || file.content || '';
              const escapedName = file.name.replace(/'/g, "\\'");
              const escapedSource = fileSource.replace(/'/g, "\\'");
              
              return `
                <li>
                  <a href="#" onclick="downloadFile('${escapedName}', '${escapedSource}'); return false;">
                    <i class="fas ${file.type && file.type.startsWith('video/') ? 'fa-play-circle' : 'fa-download'}"></i> ${file.name}
                  </a>
                </li>
              `;
            }).join('')}
          </ul>
        </div>
      ` : ''}
      <div class="assignment-actions">
              ${isArchived ? `
                <button class="btn-secondary" disabled style="opacity: 0.6; cursor: not-allowed;">
                  <i class="fas fa-lock"></i> Archived - Read Only
                </button>
              ` : `
                <button class="btn-primary" onclick="viewSubmissions('${assignment.id}')">
                    <i class="fas fa-eye"></i> View Submissions (${submissionCount})
                </button>
              `}
            </div>
    `;
    assignmentsContainer.appendChild(assignmentElement);
  });
}

// professor-script.js - Replace uploadMaterial function
async function uploadMaterial() {
  const title = document.getElementById('upload-title').value.trim();
  const description = document.getElementById('upload-description').value.trim();
  const deadline = document.getElementById('upload-deadline').value;
  const resourceLink = document.getElementById('resource-link').value.trim();
  const filesInput = document.getElementById('lesson-file');
  
  if (!title) {
    alert('Please enter a title');
    return;
  }
  
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem) {
    alert('Error: Class not found.');
    return;
  }
  
  const material = {
    id: Date.now().toString(),
    title,
    description,
    date: new Date().toISOString(),
    deadline: deadline || null,
    resourceLink: resourceLink || null,
    files: []
  };
  
  // NEW: Upload files to server instead of localStorage
  if (filesInput.files.length > 0) {
    try {
      const postBtn = document.getElementById('post-upload');
      const originalText = postBtn.innerHTML;
      postBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
      postBtn.disabled = true;
      
      // Upload each file to server
      for (const file of filesInput.files) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload_file', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
        
        const result = await response.json();
        
        // Store file reference (not the actual data)
        material.files.push({
          name: file.name,
          type: file.type,
          size: file.size,
          url: result.url,
          file_id: result.file_id
        });
      }
      
      postBtn.innerHTML = originalText;
      postBtn.disabled = false;
      
      await saveMaterial(material);
      
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files: ' + error.message);
      const postBtn = document.getElementById('post-upload');
      postBtn.innerHTML = 'Post Material';
      postBtn.disabled = false;
    }
  } else {
    await saveMaterial(material);
  }
}

//ADD THIS HELPER IF NOT EXISTS (same as student)
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

// FIXED: Save material to ensure student access
// In saveMaterial() function (around line 1100)
async function saveMaterial(material) {
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem) return;
  
  try {
    // ✅ SAVE TO DATABASE
    const response = await fetch('/api/professor/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: currentClassId,
        material: material
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save material');
    }
    
    const result = await response.json();
    material.id = result.material_id;
    
    // ✅ Update local state
    if (!classItem.materials) {
      classItem.materials = [];
    }
    classItem.materials.push(material);
    
    // ❌ REMOVE THIS BLOCK - Don't save to localStorage anymore
    // const savedClasses = localStorage.getItem('professor_classes');
    // ... (delete the entire localStorage.setItem block)
    
    loadClassPosts();
    document.getElementById('class-materials').textContent = classItem.materials.length;
    updateDashboardStats();
    document.getElementById('upload-form').classList.add('hidden');
    resetUploadForm();
    
    alert('✅ Material posted successfully!');
    
  } catch (error) {
    console.error('❌ Error saving material:', error);
    alert('❌ Error saving material: ' + error.message);
  }
}

// Reset upload form
function resetUploadForm() {
  document.getElementById('upload-title').value = '';
  document.getElementById('upload-description').value = '';
  document.getElementById('upload-deadline').value = '';
  document.getElementById('resource-link').value = '';
  document.getElementById('lesson-file').value = '';
  document.getElementById('file-chosen').textContent = 'No files selected';
}

// Load class students
async function loadClassStudents() {
  const classItem = classes.find(c => c.id === currentClassId);
  const studentsList = document.getElementById('students-list');
  
  if (!classItem || !studentsList) return;
  
  studentsList.innerHTML = '';
  
  if (!classItem.students || classItem.students.length === 0) {
    studentsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <h3>No Students Enrolled</h3>
        <p>Students can join using the class code: <strong>${classItem.code}</strong></p>
      </div>
    `;
    return;
  }
  
  // SORT STUDENTS ALPHABETICALLY BY NAME
  const sortedStudents = [...classItem.students].sort((a, b) => {
    const nameA = (a.name || `${a.first_name || ''} ${a.last_name || ''}`.trim()).toLowerCase();
    const nameB = (b.name || `${b.first_name || ''} ${b.last_name || ''}`.trim()).toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  // ✅ Load avatars for all students
  for (const student of sortedStudents) {
    const studentDatabaseId = String(student.id);
    const studentDisplayId = student.student_id || student.id;
    
    // Calculate assignment stats for this student
    let completedAssignments = 0;
    let totalGrade = 0;
    let gradedAssignments = 0;
    
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        if (assignment.submissions) {
          const submission = assignment.submissions.find(s => 
            String(s.studentId) === studentDatabaseId
          );
          if (submission) {
            completedAssignments++;
            if (submission.grade !== undefined && submission.grade !== null) {
              totalGrade += (submission.grade / assignment.points) * 100;
              gradedAssignments++;
            }
          }
        }
      });
    }
    
    const averageGrade = gradedAssignments > 0 ? 
      (totalGrade / gradedAssignments).toFixed(2) : 'N/A';
    const studentName = student.name || 
      `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student';
    const studentEmail = student.email || student.username || 'N/A';
    
    // ✅ Load avatar from DATABASE
    let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=4a90a4&color=fff`;
    
    try {
      const response = await fetch(`/api/profile/avatar/student/${studentDatabaseId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.avatar) {
          avatarUrl = data.avatar;
          console.log(`✅ Loaded avatar for ${studentName}`);
        }
      }
    } catch (e) {
      console.error('Error loading student avatar:', e);
    }
    
    const studentElement = document.createElement('div');
    studentElement.className = 'student-item';
    studentElement.innerHTML = `
      <div class="student-info">
        <img src="${avatarUrl}" 
             alt="${studentName}" 
             class="avatar"
             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=4a90a4&color=fff'">
        <div>
          <h4>${studentName}</h4>
          <p>${studentDisplayId} • ${studentEmail}</p>
        </div>
      </div>
      <div class="student-stats">
        <span>Assignments: ${completedAssignments}/${classItem.assignments ? classItem.assignments.length : 0}</span>
        <span>Average: ${averageGrade}${averageGrade !== 'N/A' ? '%' : ''}</span>
      </div>
      <div class="student-actions" style="display: flex; gap: 0.5rem;">
        <button class="btn-secondary btn-small" 
                onclick="viewStudentDetails('${studentDatabaseId}')"
                title="View student details">
          <i class="fas fa-eye"></i> View
        </button>
        <button class="btn-danger btn-small" 
                onclick="removeStudentFromClass('${studentDatabaseId}', '${studentName}')"
                title="Remove student from class">
          <i class="fas fa-user-minus"></i> Remove
        </button>
      </div>
    `;
    studentsList.appendChild(studentElement);
  }
}


// FIX #4: NEW FUNCTION - Remove student from class
async function removeStudentFromClass(studentId, studentName) {
  if (!confirm(`Are you sure you want to remove ${studentName} from this class?\n\nThis will:\nâ€¢ Remove the student from the class roster\nâ€¢ Keep their submissions (for records)\nâ€¢ Prevent them from accessing class materials`)) {
    return;
  }
  
  try {
    const classItem = classes.find(c => c.id === currentClassId);
    if (!classItem) {
      alert('Error: Class not found');
      return;
    }
    
    // Call backend API to remove student
    const response = await fetch('/api/professor/remove_student', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        class_id: currentClassId,
        student_id: studentId
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // Remove from local array
      classItem.students = classItem.students.filter(s => 
        String(s.id) !== String(studentId)
      );
      
      // Update classes array
      const classIndex = classes.findIndex(c => c.id === currentClassId);
      if (classIndex !== -1) {
        classes[classIndex].students = classItem.students;
      }
      
      // Update localStorage
      const savedClasses = localStorage.getItem('professor_classes');
      let localClasses = savedClasses ? JSON.parse(savedClasses) : [];
      const localClassIndex = localClasses.findIndex(c => 
        c.id === currentClassId || c.code === classItem.code
      );
      
      if (localClassIndex !== -1) {
        localClasses[localClassIndex].students = classItem.students;
        localStorage.setItem('professor_classes', JSON.stringify(localClasses));
      }
      
      // Refresh UI
      loadClassStudents();
      document.getElementById('class-students').textContent = classItem.students.length;
      updateDashboardStats();
      loadAllStudents(); // Refresh the Students section
      
      // Create notification
      addNotification(
        'enrollment',
        'Student Removed',
        `${studentName} has been removed from ${classItem.name}`,
        `class:${currentClassId}`
      );
      
      alert(` ${studentName} has been successfully removed from the class.`);
      
    } else {
      alert(result.error || 'Failed to remove student');
    }
  } catch (error) {
    console.error('Error removing student:', error);
    alert('Error removing student. Please try again.');
  }
}

// FIX #4: NEW FUNCTION - View student details
function viewStudentDetails(studentId) {
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem) return;
  
  const student = classItem.students.find(s => String(s.id) === String(studentId));
  if (!student) {
    alert('Student not found');
    return;
  }
  
  const studentName = student.name || 
    `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student';
  
  // Create modal for student details
  const existingModal = document.getElementById('student-details-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.id = 'student-details-modal';
  
  // Collect student's submissions
  let submissionsHTML = '';
  if (classItem.assignments) {
    classItem.assignments.forEach(assignment => {
      const submission = assignment.submissions ? 
        assignment.submissions.find(s => String(s.studentId) === String(studentId)) : null;
      
      if (submission) {
        const isGraded = submission.grade !== undefined;
        submissionsHTML += `
          <div style="padding: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 1rem;">
            <h4 style="margin: 0 0 0.5rem 0;">${assignment.title}</h4>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>
                <i class="fas fa-calendar"></i> 
                Submitted: ${new Date(submission.date).toLocaleDateString()}
              </span>
              ${isGraded ? `
                <span style="background: #28a745; color: white; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600;">
                  Grade: ${submission.grade}/${assignment.points}
                </span>
              ` : `
                <span style="background: #ffc107; color: #333; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600;">
                  Not Graded
                </span>
              `}
            </div>
          </div>
        `;
      }
    });
  }
  
  if (!submissionsHTML) {
    submissionsHTML = '<p style="color: #666; text-align: center; padding: 2rem;">No submissions yet</p>';
  }
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h3><i class="fas fa-user"></i> Student Details</h3>
        <button class="close-btn" onclick="closeStudentDetailsModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding: 2rem;">
        <div style="display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 2px solid #e0e0e0;">
          <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=4a90a4&color=fff&size=80" 
               alt="${studentName}" 
               style="width: 80px; height: 80px; border-radius: 50%;">
          <div>
            <h3 style="margin: 0 0 0.5rem 0;">${studentName}</h3>
            <p style="margin: 0; color: #666;">
              <i class="fas fa-id-card"></i> ${student.student_id || student.id}
            </p>
            <p style="margin: 0.25rem 0; color: #666;">
              <i class="fas fa-envelope"></i> ${student.email || student.username || 'N/A'}
            </p>
          </div>
        </div>
        
        <h4 style="margin-bottom: 1rem;">
          <i class="fas fa-clipboard-list"></i> Submissions
        </h4>
        ${submissionsHTML}
      </div>
      <div class="modal-footer">
        <button class="btn-danger" onclick="removeStudentFromClass('${studentId}', '${studentName}'); closeStudentDetailsModal();">
          <i class="fas fa-user-minus"></i> Remove Student
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeStudentDetailsModal();
    }
  });
}

function closeStudentDetailsModal() {
  const modal = document.getElementById('student-details-modal');
  if (modal) {
    modal.remove();
  }
}

// Save assignment
async function saveAssignment() {
  const title = document.getElementById('assignment-title').value.trim();
  const description = document.getElementById('assignment-description').value.trim();
  const dueDate = document.getElementById('assignment-due-date').value;
  const points = document.getElementById('assignment-points').value;
  const instructions = document.getElementById('assignment-instructions').value.trim();
  const filesInput = document.getElementById('assignment-files');
  
  if (!title || !description || !dueDate) {
    alert('Please fill in all required fields');
    return;
  }
  
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem) {
    alert('Error: Class not found.');
    return;
  }
  
  const assignment = {
    id: Date.now().toString(),
    title,
    description,
    dueDate,
    points: parseInt(points) || 100,
    instructions: instructions || '',
    dateCreated: new Date().toISOString(),
    submissions: [],
    files: []
  };
  
  // Ã¢Å“â€¦ FIX: Upload ALL files before saving
  if (filesInput && filesInput.files && filesInput.files.length > 0) {
    try {
      const saveBtn = document.getElementById('save-assignment');
      const originalText = saveBtn.innerHTML;
      saveBtn.disabled = true;
      
      // Ã¢Å“â€¦ UPLOAD ALL FILES IN PARALLEL (faster)
      const uploadPromises = Array.from(filesInput.files).map(async (file, index) => {
        console.log(`Uploading file ${index + 1}/${filesInput.files.length}: ${file.name}`);
        
        saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading ${index + 1}/${filesInput.files.length}...`;
        
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
        
        return {
          name: file.name,
          type: file.type,
          size: file.size,
          url: result.url
        };
      });
      
      // Ã¢Å“â€¦ WAIT FOR ALL UPLOADS TO COMPLETE
      assignment.files = await Promise.all(uploadPromises);
      
      saveBtn.innerHTML = originalText;
      saveBtn.disabled = false;
      
      console.log(`Ã¢Å“â€¦ All ${assignment.files.length} files uploaded successfully`);
      
      await saveAssignmentToClass(assignment);
      
    } catch (uploadError) {
      console.error('Ã¢Å’ Error during file upload:', uploadError);
      alert('Ã¢Å’ Error uploading files: ' + uploadError.message);
      const saveBtn = document.getElementById('save-assignment');
      saveBtn.innerHTML = 'Create Assignment';
      saveBtn.disabled = false;
      return;
    }
  } else {
    await saveAssignmentToClass(assignment);
  }
}

// Save assignment to class
async function saveAssignmentToClass(assignment) {
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem) return;
  
  const dueDate = new Date(assignment.dueDate);
  
  const confirmModal = document.createElement('div');
  confirmModal.className = 'modal';
  confirmModal.style.display = 'flex';
  confirmModal.style.zIndex = '10001';
  confirmModal.id = 'calendar-confirm-modal';
  
  confirmModal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h3><i class="fas fa-calendar-check"></i> Confirm Assignment</h3>
      </div>
      <div class="modal-body">
        <div style="text-align: center; padding: 1rem;">
          <i class="fas fa-calendar-check" style="font-size: 3rem; color: #4a90a4; margin-bottom: 1rem;"></i>
          <h3 style="margin-bottom: 1rem;">Confirm Assignment Schedule</h3>
          <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: left;">
            <p style="margin-bottom: 0.5rem;"><strong>Assignment:</strong> ${assignment.title}</p>
            <p style="margin-bottom: 0.5rem;"><strong>Class:</strong> ${classItem.name}</p>
            <p style="margin-bottom: 0.5rem;"><strong>Due Date:</strong> ${dueDate.toLocaleString()}</p>
            <p style="margin-bottom: 0;"><strong>Points:</strong> ${assignment.points}</p>
          </div>
          <p style="color: #666; font-size: 0.9rem;">This assignment will be visible to all students.</p>
        </div>
      </div>
      <div class="modal-footer" style="display: flex; gap: 1rem; justify-content: center;">
        <button id="cancel-calendar-confirm" class="btn-secondary" style="min-width: 120px;">
          <i class="fas fa-times"></i> Cancel
        </button>
        <button id="confirm-calendar-ok" class="btn-primary" style="min-width: 120px;">
          <i class="fas fa-check"></i> OK, Create Assignment
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(confirmModal);
  
  return new Promise((resolve, reject) => {
    document.getElementById('confirm-calendar-ok').addEventListener('click', async function() {
      confirmModal.remove();
      
      try {
        // ✅ SAVE TO DATABASE FIRST
        const response = await fetch('/api/professor/assignments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            class_id: currentClassId,
            assignment: assignment
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save assignment');
        }
        
        const result = await response.json();
        assignment.id = result.assignment_id; // Update with DB ID
        
        // ✅ THEN update local state
        if (!classItem.assignments) {
          classItem.assignments = [];
        }
        classItem.assignments.push(assignment);
        
        // Update localStorage as cache
        localStorage.setItem('professor_classes', JSON.stringify(classes));
        
        // Update calendar
        // const dateKey = `${dueDate.getFullYear()}-${dueDate.getMonth() + 1}-${dueDate.getDate()}`;
        // if (!calendarEvents[dateKey]) {
          // calendarEvents[dateKey] = [];
        // }
        // calendarEvents[dateKey].push(`Assignment Due: ${assignment.title} (${classItem.name})`);
        // localStorage.setItem('calendar_events', JSON.stringify(calendarEvents));
        
        loadClassAssignments();
        document.getElementById('class-assignments').textContent = classItem.assignments.length;
        updateDashboardStats();
        
        if (typeof initializeCalendar === 'function') {
          initializeCalendar();
        }
        
        assignmentModal.style.display = 'none';
        resetAssignmentForm();
        
        alert('✅ Assignment created successfully and added to calendar!');
        
        addNotification(
          'assignment',
          'New Assignment Created',
          `"${assignment.title}" has been posted to ${classItem.name}`,
          `class:${currentClassId}`
        );
        
        resolve();
      } catch (error) {
        console.error('❌ Error saving assignment:', error);
        alert('❌ Error saving assignment: ' + error.message);
        reject(error);
      }
    });
    
    document.getElementById('cancel-calendar-confirm').addEventListener('click', function() {
      confirmModal.remove();
      reject(new Error('Assignment creation cancelled'));
    });
    
    confirmModal.addEventListener('click', function(e) {
      if (e.target === confirmModal) {
        confirmModal.remove();
        reject(new Error('Assignment creation cancelled'));
      }
    });
  });
}

// REPLACE the resetAssignmentForm function (around line 681)
function resetAssignmentForm() {
  document.getElementById('assignment-title').value = '';
  document.getElementById('assignment-description').value = '';
  document.getElementById('assignment-due-date').value = '';
  document.getElementById('assignment-points').value = '100';
  document.getElementById('assignment-instructions').value = '';
  document.getElementById('assignment-files').value = '';
  document.getElementById('assignment-files-chosen').textContent = 'No files selected';
  
  // FIX: Clear the modal dataset to prevent conflicts
  const modal = document.getElementById('assignment-modal');
  if (modal) {
    delete modal.dataset.assignmentId;
    delete modal.dataset.classId;
  }
}



// View assignment submissions with grading functionality
async function viewSubmissions(assignmentId) {
  console.log('👀 Opening submissions for assignment:', assignmentId);
    
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem) {
    alert('❌ Class not found');
    return;
  }
  
  // ✅ FIX: Load fresh assignment data from DATABASE
  let assignment = null;
  try {
    const assignmentsResponse = await fetch(`/api/professor/classes/${currentClassId}/assignments`);
    if (assignmentsResponse.ok) {
      const assignments = await assignmentsResponse.json();
      assignment = assignments.find(a => String(a.id) === String(assignmentId));
      
      if (assignment) {
        console.log('✅ Found assignment from database:', assignment.title);
        
        // ✅ Update class item with fresh data
        classItem.assignments = assignments;
        
        // ✅ Update classes array
        const classIndex = classes.findIndex(c => c.id === currentClassId);
        if (classIndex !== -1) {
          classes[classIndex].assignments = assignments;
        }
      }
    }
  } catch (e) {
    console.error('❌ Error loading assignments from database:', e);
  }
  
  if (!assignment) {
    alert('❌ Assignment not found. It may have been deleted.');
    return;
  }
  
  // ✅ FIX: Fetch fresh submissions from database
  try {
    const response = await fetch(`/api/professor/assignments/${assignmentId}/submissions`);
    if (response.ok) {
      const submissions = await response.json();
      assignment.submissions = submissions;
      console.log(`✅ Loaded ${submissions.length} submissions from database`);
      
      // ✅ Update in classes array
      const classIndex = classes.findIndex(c => c.id === currentClassId);
      if (classIndex !== -1) {
        const assignmentIndex = classes[classIndex].assignments.findIndex(a => String(a.id) === String(assignmentId));
        if (assignmentIndex !== -1) {
          classes[classIndex].assignments[assignmentIndex].submissions = submissions;
        }
      }
    } else {
      console.warn('⚠️ No submissions found or API error');
      assignment.submissions = [];
    }
  } catch (e) {
    console.error('❌ Error loading submissions:', e);
    assignment.submissions = [];
  }

  // Remove any existing submissions modal
  const existingModal = document.getElementById('submissions-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create a new modal for submissions
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.id = 'submissions-modal';
  modal.style.zIndex = '10001';

  let submissionsHTML = `
    <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <h3><i class="fas fa-inbox"></i> Submissions for "${assignment.title}"</h3>
        <button class="close-btn" onclick="closeSubmissionsModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding: 2rem;">
  `;

  if (!assignment.submissions || assignment.submissions.length === 0) {
    submissionsHTML += `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>No Submissions Yet</h3>
        <p>Students haven't submitted this assignment yet.</p>
      </div>
    `;
  } else {
    submissionsHTML += `
      <div class="submissions-header" style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h4 style="margin: 0;">${assignment.submissions.length} Submission${assignment.submissions.length > 1 ? 's' : ''}</h4>
          <span class="due-date ${new Date(assignment.dueDate) < new Date() ? 'overdue' : ''}">
            Due: ${new Date(assignment.dueDate).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div class="submissions-list" style="display: flex; flex-direction: column; gap: 1.5rem;">
    `;
    
    assignment.submissions.forEach(submission => {
      const student = classItem.students ? 
        classItem.students.find(s => String(s.id) === String(submission.studentId)) : null;
      const studentName = student ? 
        (student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim()) : 
        submission.studentName || 'Unknown Student';
      const isGraded = submission.grade !== undefined && submission.grade !== null;
      
      submissionsHTML += `
        <div class="submission-item" style="border: 2px solid #e0e0e0; border-radius: 12px; padding: 1.5rem; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
            <div style="flex: 1; min-width: 200px;">
              <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=4a90a4&color=fff" 
                     alt="${studentName}" 
                     style="width: 40px; height: 40px; border-radius: 50%;">
                <div>
                  <h4 style="margin: 0; font-size: 1.1rem;">${studentName}</h4>
                  <p style="color: #666; font-size: 0.9rem; margin: 0.25rem 0;">
                    <i class="fas fa-clock"></i> Submitted: ${new Date(submission.date).toLocaleString()}
                  </p>
                </div>
              </div>
              ${isGraded ? `
                <div style="margin-top: 0.75rem;">
                  <span style="display: inline-block; background: #d4edda; color: #155724; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; font-size: 0.95rem;">
                    <i class="fas fa-check-circle"></i> Graded: ${submission.grade}/${assignment.points} (${((submission.grade / assignment.points) * 100).toFixed(1)}%)
                  </span>
                </div>
              ` : `
                <div style="margin-top: 0.75rem;">
                  <span style="display: inline-block; background: #fff3cd; color: #856404; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; font-size: 0.95rem;">
                    <i class="fas fa-hourglass-half"></i> Not Graded Yet
                  </span>
                </div>
              `}
            </div>
            <button class="btn-primary" 
                    onclick="openGradingModal('${assignmentId}', '${submission.studentId}')"
                    style="white-space: nowrap; padding: 0.75rem 1.5rem;">
              <i class="fas fa-pen"></i> ${isGraded ? 'Edit Grade' : 'Grade Now'}
            </button>
          </div>
          
          <div style="margin: 1.5rem 0;">
            <strong style="font-size: 1rem; color: #333; display: block; margin-bottom: 0.75rem;">
              <i class="fas fa-file-alt"></i> Submission Content:
            </strong>
            <div style="padding: 1.25rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #4a90a4; white-space: pre-wrap; line-height: 1.6; font-size: 0.95rem;">
              ${submission.content || 'No content provided'}
            </div>
          </div>
          
          ${submission.files && submission.files.length > 0 ? `
            <div style="margin: 1.5rem 0;">
              <strong style="font-size: 1rem; color: #333; display: block; margin-bottom: 0.75rem;">
                <i class="fas fa-paperclip"></i> Attached Files:
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
          ` : ''}
          
          ${isGraded && submission.feedback ? `
            <div style="margin: 1.5rem 0;">
              <strong style="font-size: 1rem; color: #333; display: block; margin-bottom: 0.75rem;">
                <i class="fas fa-comment"></i> Your Feedback:
              </strong>
              <div style="padding: 1.25rem; background: #e8f4f8; border-radius: 8px; border-left: 4px solid #17a2b8; line-height: 1.6; font-size: 0.95rem;">
                ${submission.feedback}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    });
    
    submissionsHTML += '</div>';
  }
  
  submissionsHTML += `
      </div>
    </div>
  `;
  
  modal.innerHTML = submissionsHTML;
  document.body.appendChild(modal);
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeSubmissionsModal();
    }
  });
  
  console.log('✅ Submissions modal opened successfully');
}

// Add this new function to your JavaScript:
async function refreshAndViewSubmissions(assignmentId) {
    console.log('🔄 Force refreshing submissions for assignment:', assignmentId);
    
    try {
        // Force refresh from database
        const response = await fetch(`/api/professor/assignments/${assignmentId}/submissions`);
        if (response.ok) {
            const freshSubmissions = await response.json();
            console.log('✅ Fresh submissions from DB:', freshSubmissions);
            
            // Update local state
            const classItem = classes.find(c => c.id === currentClassId);
            if (classItem && classItem.assignments) {
                const assignment = classItem.assignments.find(a => String(a.id) === String(assignmentId));
                if (assignment) {
                    assignment.submissions = freshSubmissions;
                    console.log(`✅ Updated ${freshSubmissions.length} submissions locally`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error refreshing submissions:', error);
    }
    
    // Now open the submissions view
    viewSubmissions(assignmentId);
}

function openGradeModal(submissionId) {
  // Hide submission modal first
  const submissionModal = document.getElementById('submission-modal');
  if (submissionModal) submissionModal.style.display = 'none';

  // Show grade modal above it
  const gradingModal = document.getElementById('grading-modal');
  if (gradingModal) {
    gradingModal.style.display = 'flex';
    gradingModal.style.zIndex = '1000'; // Ensures it's above all
  }
}


// Close submissions modal
function closeSubmissionsModal() {
  const modal = document.getElementById('submissions-modal');
  if (modal) {
    modal.remove();
  }
} 

// FIXED: Complete openGradingModal function
function openGradingModal(assignmentId, studentId) {
  console.log('📝 Opening grading modal for:', { assignmentId, studentId });
  
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem) {
    alert('❌ Class not found');
    return;
  }
  
  const assignment = classItem.assignments.find(a => a.id === assignmentId);
  if (!assignment) {
    alert('❌ Assignment not found');
    return;
  }
  
  const submission = assignment.submissions ? 
    assignment.submissions.find(s => String(s.studentId) === String(studentId)) : null;
  
  if (!submission) {
    alert('❌ Submission not found');
    return;
  }
  
  const student = classItem.students ? 
    classItem.students.find(s => String(s.id) === String(studentId)) : null;
  const studentName = student ? 
    (student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim()) : 
    'Unknown Student';
  
  const gradingModal = document.getElementById('grading-modal');
  if (!gradingModal) {
    console.error('❌ Grading modal not found in HTML');
    return;
  }
  
  // ✅ FIX: Clear previous data completely
  gradingModal.dataset.assignmentId = '';
  gradingModal.dataset.studentId = '';
  
  // ✅ FIX: Set HIGHER z-index to appear ABOVE submissions modal
  gradingModal.style.zIndex = '10003'; // ← CHANGED from 10002 to 10003
  
  // ✅ FIX: Hide submissions modal temporarily
  const submissionsModal = document.getElementById('submissions-modal');
  if (submissionsModal) {
    submissionsModal.style.display = 'none';
  }
  
  const modalBody = gradingModal.querySelector('.modal-body');
  if (modalBody) {
    modalBody.innerHTML = `
      <div class="form-group">
        <label><i class="fas fa-user"></i> Student</label>
        <div style="padding: 0.75rem 1rem; background: #f8f9fa; border-radius: 6px; font-weight: 500;">
          ${studentName}
        </div>
      </div>
      
      <div class="form-group">
        <label><i class="fas fa-tasks"></i> Assignment</label>
        <div style="padding: 0.75rem 1rem; background: #f8f9fa; border-radius: 6px; font-weight: 500;">
          ${assignment.title} (${assignment.points} points)
        </div>
      </div>
      
      <div class="form-group">
        <label><i class="fas fa-file-alt"></i> Submission Content</label>
        <div style="max-height: 200px; overflow-y: auto; padding: 1rem; background: #f8f9fa; border-radius: 6px; white-space: pre-wrap; line-height: 1.6; border-left: 3px solid #4a90a4;">
          ${submission.content || 'No content provided'}
        </div>
      </div>
      
      <div class="form-group">
        <label for="grade-score"><i class="fas fa-star"></i> Grade (0-${assignment.points})</label>
        <input type="number" 
               id="grade-score" 
               min="0" 
               max="${assignment.points}" 
               value="${submission.grade !== undefined && submission.grade !== null ? submission.grade : ''}" 
               placeholder="Enter grade"
               style="width: 100%; padding: 0.75rem; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 1rem;">
        <small style="color: #666; display: block; margin-top: 0.5rem;">
          Maximum points: ${assignment.points}
        </small>
      </div>
      
      <div class="form-group">
        <label for="grade-feedback"><i class="fas fa-comment"></i> Feedback (Optional)</label>
        <textarea id="grade-feedback" 
                  rows="4" 
                  placeholder="Provide feedback to the student..."
                  style="width: 100%; padding: 0.75rem; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 1rem; resize: vertical; font-family: inherit;">${submission.feedback || ''}</textarea>
      </div>
    `;
  }
  
  // ✅ Store data for saving
  gradingModal.dataset.assignmentId = assignmentId;
  gradingModal.dataset.studentId = studentId;
  gradingModal.dataset.classId = currentClassId;
  gradingModal.style.display = 'flex';
  
  // Focus on grade input
  setTimeout(() => {
    const gradeInput = document.getElementById('grade-score');
    if (gradeInput) gradeInput.focus();
  }, 100);
  
  console.log('✅ Grading modal opened successfully with fresh data');
}

async function refreshProfessorData() {
  try {
    console.log('🔄 Refreshing professor data...');
    
    // Reload classes from database
    await loadClasses();
    
    // If a class is currently open, refresh its data
    if (currentClassId) {
      const classItem = classes.find(c => c.id === currentClassId);
      if (classItem) {
        await loadClassDataFromDatabase(classItem);
        loadClassAssignments();
        loadClassGrades();
      }
    }
    
    // Refresh other sections
    updateDashboardStats();
    loadAllStudents();
    
    console.log('✅ Professor data refreshed successfully');
  } catch (error) {
    console.error('❌ Error refreshing professor data:', error);
  }
}

// ✅ ADD: Close grading modal and restore submissions modal
function closeGradingModal() {
  const gradingModal = document.getElementById('grading-modal');
  if (gradingModal) {
    gradingModal.style.display = 'none';
    gradingModal.style.zIndex = '';
    
    // ✅ Clear dataset
    gradingModal.dataset.assignmentId = '';
    gradingModal.dataset.studentId = '';
    gradingModal.dataset.classId = '';
  }
  
  // ✅ Restore submissions modal
  const submissionsModal = document.getElementById('submissions-modal');
  if (submissionsModal) {
    submissionsModal.style.display = 'flex';
  }
}
  

// Close submissions modal
function closeSubmissionsModal() {
  const modal = document.getElementById('submissions-modal');
  if (modal) {
    modal.remove();
  }
  
  // Also close grading modal if open
  const gradingModal = document.getElementById('grading-modal');
  if (gradingModal) {
    gradingModal.style.display = 'none';
  }
}


// Add at the top of both files

// Monitor localStorage usage
function checkStorageUsage() {
  try {
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    
    const sizeInMB = (totalSize / 1024 / 1024).toFixed(2);
    const maxSize = 10; // Approximate max
    const percentUsed = ((sizeInMB / maxSize) * 100).toFixed(1);
    
    console.log(`ðŸ“Š Storage Usage: ${sizeInMB}MB / ~${maxSize}MB (${percentUsed}%)`);
    
    if (percentUsed > 80) {
      console.warn('âš ï¸ Storage nearly full! Consider clearing old data.');
      if (percentUsed > 95) {
        alert('âš ï¸ Warning: Storage is almost full. Please clear some data or avoid uploading large files.');
      }
    }
    
    return { sizeInMB, percentUsed };
  } catch (e) {
    console.error('Error checking storage:', e);
    return null;
  }
}

// Call this periodically
setInterval(checkStorageUsage, 30000); // Check every 30 seconds

async function saveGrade() {
    console.log('💾 saveGrade() function called');
    
    const modalEl = document.getElementById('grading-modal');
    if (!modalEl) {
        console.error('❌ Grading modal not found');
        alert('Error: Grading modal not found. Please refresh the page.');
        return;
    }
    
    const assignmentId = modalEl.dataset.assignmentId;
    const studentId = modalEl.dataset.studentId;
    const classId = modalEl.dataset.classId || currentClassId;
    
    console.log('📋 Grading data:', { assignmentId, studentId, classId });
    
    // ✅ FIX: Better validation
    if (!assignmentId || !studentId || !classId) {
        console.error('❌ Missing required IDs:', { assignmentId, studentId, classId });
        alert('❌ Error: Missing assignment, student, or class information. Please reopen the grading modal.');
        return;
    }
    
    const gradeInput = document.getElementById('grade-score');
    const feedbackInput = document.getElementById('grade-feedback');
    
    if (!gradeInput) {
        console.error('❌ Grade input not found');
        alert('Error: Grade input field not found');
        return;
    }
    
    const gradeValue = gradeInput.value.trim();
    
    if (gradeValue === '') {
        alert('⚠️ Please enter a grade');
        gradeInput.focus();
        return;
    }
    
    const grade = parseFloat(gradeValue);
    const feedback = feedbackInput ? feedbackInput.value.trim() : '';
    
    if (isNaN(grade)) {
        alert('⚠️ Please enter a valid number');
        gradeInput.focus();
        return;
    }
    
    // ✅ FIX: Verify all data is still valid
    const classItem = classes.find(c => String(c.id) === String(classId));
    if (!classItem) {
        alert('❌ Class not found');
        return;
    }
    
    const assignment = classItem.assignments ? classItem.assignments.find(a => String(a.id) === String(assignmentId)) : null;
    if (!assignment) {
        alert('❌ Assignment not found');
        return;
    }
    
    const maxPoints = assignment.points || 100;
    
    if (grade < 0 || grade > maxPoints) {
        alert(`⚠️ Grade must be between 0 and ${maxPoints}`);
        gradeInput.focus();
        return;
    }
    
    const submission = assignment.submissions ? 
        assignment.submissions.find(s => String(s.studentId) === String(studentId)) : null;
    
    if (!submission) {
        alert('❌ Submission not found');
        return;
    }
    
    console.log('✅ All data validated, proceeding to save grade');
    
    try {
        // ✅ SAVE TO DATABASE
        const response = await fetch(`/api/professor/assignments/${assignmentId}/grade`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                student_id: studentId,
                grade: grade,
                feedback: feedback
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save grade');
        }
        
        const result = await response.json();
        console.log('✅ Grade saved to database:', result);
        
        // ✅ FIX: Update local state with proper reference
        submission.grade = grade;
        submission.feedback = feedback;
        submission.gradedDate = new Date().toISOString();
        
        console.log('Updated submission:', submission);
        
        // ✅ FIX: Clear modal data after successful save
        modalEl.dataset.assignmentId = '';
        modalEl.dataset.studentId = '';
        modalEl.dataset.classId = '';
        
        // Close modal
        modalEl.style.display = 'none';
        modalEl.style.zIndex = '';
        
        // ✅ CHANGED: Use closeGradingModal instead
        closeGradingModal();
        
        // Update UI
        loadClassAssignments();
        loadClassGrades();
        
        // Create notification
        addNotification(
            'grade',
            'Assignment Graded',
            `${submission.studentName || 'Student'}'s assignment "${assignment.title}" has been graded: ${grade}/${maxPoints}`,
            `class:${classId}`
        );
        
        // Success message
        const studentName = submission.studentName || 'Student';
        const percentage = ((grade / maxPoints) * 100).toFixed(1);
        alert(`✅ Grade Saved Successfully!\n\nStudent: ${studentName}\nGrade: ${grade}/${maxPoints} (${percentage}%)\n${feedback ? 'Feedback: ' + feedback : ''}`);
        
        console.log('✅ Grade saved successfully!');
        
        // Reopen submissions modal
        setTimeout(() => {
            viewSubmissions(assignmentId);
        }, 300);
        
    } catch (error) {
        console.error('❌ Error saving grade:', error);
        alert('❌ Failed to save grade: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Wait for DOM to be fully loaded
    setTimeout(() => {
        const saveGradeBtn = document.getElementById('save-grade');
        if (saveGradeBtn) {
            // Remove any old listeners
            const newBtn = saveGradeBtn.cloneNode(true);
            saveGradeBtn.parentNode.replaceChild(newBtn, saveGradeBtn);
            
            // Add fresh listener
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('ðŸ–±ï¸ Save Grade button clicked');
                saveGrade();
            });
            
            console.log(' Save grade button listener attached');
        } else {
            console.warn('âš ï¸ Save grade button not found on page load');
        }
    }, 500);

    // Check for new missed tasks periodically
    setInterval(() => {
      checkMissedTasksForNotifications();
    }, 60000); // Check every minute

    // Initial check on load
    setTimeout(checkMissedTasksForNotifications, 5000);

    loadClasses();
    
      // ✅ ADD THIS: Load materials and assignments when opening a class
  const originalOpenClass = openClass;
  openClass = async function(classId) {
    currentClassId = classId;
    const classItem = classes.find(c => c.id === classId);
    
    if (!classItem) return;
    
    // Load materials from database
    try {
      const materialsResponse = await fetch(`/api/professor/classes/${classId}/materials`);
      if (materialsResponse.ok) {
        classItem.materials = await materialsResponse.json();
      }
    } catch (e) {
      console.error('Error loading materials:', e);
    }
    
    // Load assignments from database
    try {
      const assignmentsResponse = await fetch(`/api/professor/classes/${classId}/assignments`);
      if (assignmentsResponse.ok) {
        classItem.assignments = await assignmentsResponse.json();
      }
    } catch (e) {
      console.error('Error loading assignments:', e);
    }
    
    // Call original function
    originalOpenClass.call(this, classId);
  };
});


// Load class grades
function loadClassGrades() {
  const classItem = classes.find(c => c.id === currentClassId);
  const gradesContainer = document.getElementById('grades-container');
  
  if (!classItem || !gradesContainer) return;
  
  gradesContainer.innerHTML = '';
  
  // ✅ Load fresh assignment data from professor's localStorage
  const professorClasses = localStorage.getItem('professor_classes');
  if (professorClasses) {
    try {
      const profClasses = JSON.parse(professorClasses);
      const matchingClass = profClasses.find(pc => pc.code === classItem.code);
      if (matchingClass && matchingClass.assignments) {
        classItem.assignments = matchingClass.assignments;
        console.log('✅ Loaded assignments for grades view:', classItem.assignments.length);
      }
    } catch (e) {
      console.error('Error loading professor data:', e);
    }
  }
  
  if (!classItem.students || classItem.students.length === 0) {
    gradesContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-chart-line"></i>
        <h3>No Student Grades</h3>
        <p>Grades will appear here once students submit assignments</p>
      </div>
    `;
    return;
  }
  
  // Create grades table
  let gradesHTML = `
    <div class="grades-table">
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Student ID</th>
  `;
  
  // Add assignment columns
  if (classItem.assignments && classItem.assignments.length > 0) {
    classItem.assignments.forEach(assignment => {
      gradesHTML += `<th>${assignment.title} (${assignment.points}pts)</th>`;
    });
  }
  
  gradesHTML += `
            <th>Average</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  // Add student rows
  classItem.students.forEach(student => {
    const studentName = student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim();
    const studentId = student.student_id || student.id;
    
    gradesHTML += `
      <tr>
        <td>${studentName}</td>
        <td>${studentId}</td>
    `;
    
    let totalScore = 0;
    let totalMaxPoints = 0;
    let gradedCount = 0;
    
    // Add grades for each assignment
    if (classItem.assignments && classItem.assignments.length > 0) {
      classItem.assignments.forEach(assignment => {
        const submission = assignment.submissions ? 
          assignment.submissions.find(s => String(s.studentId) === String(student.id)) : null;
        
        if (submission && submission.grade !== undefined && submission.grade !== null) {
          gradesHTML += `<td>${submission.grade}/${assignment.points}</td>`;
          totalScore += submission.grade;
          totalMaxPoints += assignment.points;
          gradedCount++;
        } else if (submission) {
          gradesHTML += '<td>Submitted</td>';
          totalMaxPoints += assignment.points;
        } else {
          gradesHTML += '<td>-</td>';
        }
      });
    }
    
    // Calculate average
    const average = gradedCount > 0 ? ((totalScore / totalMaxPoints) * 100).toFixed(2) : '-';
    
    gradesHTML += `<td><strong>${average}${average !== '-' ? '%' : ''}</strong></td>`;
    gradesHTML += `</tr>`;
  });
  
  gradesHTML += `
        </tbody>
      </table>
    </div>
  `;
  
  gradesContainer.innerHTML = gradesHTML;
  
  console.log('✅ Grades table rendered');
}

// Export student list
function exportStudentList() {
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem || !classItem.students || classItem.students.length === 0) {
    alert('No students to export');
    return;
  }
  
  let csvContent = 'Name,Student ID,Email\n';
  classItem.students.forEach(student => {
    // Bug Fix: Ensure no commas in data break CSV format (simple fix for demo)
    const name = (student.name || '').replace(/,/g, '');
    const email = (student.email || '').replace(/,/g, '');
    csvContent += `${name},${student.id},${email}\n`;
  });
  
  downloadCSV(csvContent, `${classItem.name}_students.csv`);
}

// Export grades
function exportGrades() {
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem) return;
  
  let csvContent = 'Student,Student ID';
  
  // Add assignment headers
  classItem.assignments.forEach(assignment => {
    csvContent += `,"${assignment.title} (Score)","${assignment.title} (Points)"`; // Export score and max points
  });
  
  csvContent += ',Average (%)\n';
  
  // Add student data
  classItem.students.forEach(student => {
    csvContent += `"${student.name}",${student.id}`;
    
    let totalScore = 0;
    let totalMaxPoints = 0;
    
    classItem.assignments.forEach(assignment => {
      const submission = assignment.submissions.find(s => s.studentId === student.id);
      if (submission && submission.grade !== undefined) {
        csvContent += `,${submission.grade},${assignment.points}`;
        totalScore += submission.grade;
        totalMaxPoints += assignment.points;
      } else {
        csvContent += ',-,-';
      }
    });
    
    const average = totalMaxPoints > 0 ? ((totalScore / totalMaxPoints) * 100).toFixed(2) : '-';
    csvContent += `,${average}\n`;
  });
  
  downloadCSV(csvContent, `${classItem.name}_grades.csv`);
}

// Download CSV file
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' }); // Added charset for broader compatibility
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download file
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

// VIDEO PLAYER for professors
function showVideoPlayerProfessor(filename, videoUrl) {
  const existingModal = document.getElementById('video-player-modal-prof');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.style.zIndex = '10001';
  modal.id = 'video-player-modal-prof';
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 900px; max-height: 95vh; overflow: hidden;">
      <div class="modal-header">
        <h3><i class="fas fa-play-circle"></i> ${filename}</h3>
        <button class="close-btn" onclick="closeVideoPlayerProfessor()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding: 0; background: #000;">
        <video 
          id="prof-video-player" 
          controls 
          controlsList="nodownload"
          style="width: 100%; max-height: 70vh; display: block;"
          autoplay>
          <source src="${videoUrl}" type="video/${filename.split('.').pop()}">
          Your browser does not support the video tag.
        </video>
      </div>
      <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem;">
        <div style="display: flex; gap: 1rem; align-items: center;">
          <button onclick="togglePlayPauseProfessor()" class="btn-secondary" style="min-width: 100px;">
            <i class="fas fa-pause" id="prof-play-pause-icon"></i> <span id="prof-play-pause-text">Pause</span>
          </button>
          <button onclick="toggleFullscreenProfessor()" class="btn-secondary">
            <i class="fas fa-expand"></i> Fullscreen
          </button>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button onclick="changePlaybackSpeedProfessor(-0.25)" class="btn-outline" title="Slower">
            <i class="fas fa-backward"></i>
          </button>
          <span id="prof-playback-speed" style="padding: 0.5rem 1rem; background: #f8f9fa; border-radius: 6px; font-weight: 600;">1.0x</span>
          <button onclick="changePlaybackSpeedProfessor(0.25)" class="btn-outline" title="Faster">
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
      closeVideoPlayerProfessor();
    }
  });
  
  document.addEventListener('keydown', videoKeyboardHandlerProfessor);
}

function closeVideoPlayerProfessor() {
  const modal = document.getElementById('video-player-modal-prof');
  if (modal) {
    const video = document.getElementById('prof-video-player');
    if (video) video.pause();
    modal.remove();
    document.removeEventListener('keydown', videoKeyboardHandlerProfessor);
  }
}

function togglePlayPauseProfessor() {
  const video = document.getElementById('prof-video-player');
  const icon = document.getElementById('prof-play-pause-icon');
  const text = document.getElementById('prof-play-pause-text');
  
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

function toggleFullscreenProfessor() {
  const video = document.getElementById('prof-video-player');
  
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

function changePlaybackSpeedProfessor(delta) {
  const video = document.getElementById('prof-video-player');
  const speedDisplay = document.getElementById('prof-playback-speed');
  
  let newSpeed = video.playbackRate + delta;
  newSpeed = Math.max(0.25, Math.min(2.0, newSpeed));
  
  video.playbackRate = newSpeed;
  speedDisplay.textContent = newSpeed.toFixed(2) + 'x';
}

function videoKeyboardHandlerProfessor(e) {
  const video = document.getElementById('prof-video-player');
  if (!video) return;
  
  switch(e.key) {
    case ' ':
    case 'k':
      e.preventDefault();
      togglePlayPauseProfessor();
      break;
    case 'f':
      e.preventDefault();
      toggleFullscreenProfessor();
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
      closeVideoPlayerProfessor();
      break;
  }
}


// Convert base64 to Blob
function base64ToBlob(base64) {
  const parts = base64.split(';base64,');
  if (parts.length !== 2) {
    throw new Error('Invalid base64 format for Blob conversion.');
  }
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const uInt8Array = new Uint8Array(raw.length);
  
  for (let i = 0; i < raw.length; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  return new Blob([uInt8Array], { type: contentType });
}

// Calendar functionality
function initializeCalendar() {
  const monthYear = document.getElementById('month-year');
  const calendarDays = document.getElementById('calendar-days');
  const prevMonth = document.getElementById('prev-month');
  const nextMonth = document.getElementById('next-month');
  
  let currentDate = new Date();
  
  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Update month-year display
    monthYear.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;
    
    // Clear previous days
    calendarDays.innerHTML = '';
    
    // Get first day of month (0=Sunday, 6=Saturday)
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Add empty cells for days before first day of month
    // Bug Fix: Adjusting for calendar starting on Sunday (getDay())
    for (let i = 0; i < firstDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'calendar-day empty';
      calendarDays.appendChild(emptyCell);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      dayElement.textContent = day;
      
      const dateKey = `${year}-${month + 1}-${day}`;
      if (calendarEvents[dateKey] && calendarEvents[dateKey].length > 0) { // Bug Fix: Check if events array is not empty
        dayElement.classList.add('has-event');
      }
      
      dayElement.addEventListener('click', () => openEventModal(year, month, day));
      calendarDays.appendChild(dayElement);
    }
  }
  
  prevMonth.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  
  nextMonth.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
  
  renderCalendar();
}

// Function to update the selected date in the modal before showing it
let currentSelectedDate = null;

function openEventModal(year, month, day) {
  const selectedDateEl = document.getElementById('selected-date');
  const eventList = document.getElementById('event-list');
  const modal = document.getElementById('event-modal');
  
  const date = new Date(year, month, day);
  currentSelectedDate = date;
  selectedDateEl.innerHTML = `<i class="fas fa-calendar"></i> ${date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`;
  
  const dateKey = `${year}-${month + 1}-${day}`;
  const events = calendarEvents[dateKey] || [];
  
  eventList.innerHTML = '';
  if (events.length === 0) {
    eventList.innerHTML = '<li style="padding: 1rem; text-align: center; color: #999; font-style: italic;">No events for this day</li>';
  } else {
    events.forEach((event, index) => {
      const li = document.createElement('li');
      li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; margin-bottom: 0.5rem;';
      
      li.innerHTML = `
        <span style="flex: 1; color: #333;">${event}</span>
        <button onclick="deleteEvent('${dateKey}', ${index})" 
                class="btn-danger btn-small" 
                style="margin-left: 1rem; padding: 0.4rem 0.75rem;">
          <i class="fas fa-trash"></i>
        </button>
      `;
      eventList.appendChild(li);
    });
  }
  
  document.getElementById('event-text').value = '';
  modal.style.display = 'flex';
}


// NEW: Delete calendar event
function deleteEvent(dateKey, eventIndex) {
  if (!confirm('Are you sure you want to delete this event?')) {
    return;
  }
  
  if (!calendarEvents[dateKey]) return;
  
  // Remove event from array
  calendarEvents[dateKey].splice(eventIndex, 1);
  
  // If no events left for this date, remove the date key
  if (calendarEvents[dateKey].length === 0) {
    delete calendarEvents[dateKey];
  }
  
  // Save to localStorage
  localStorage.setItem('calendar_events', JSON.stringify(calendarEvents));
  
  // Re-render calendar to update indicators
  initializeCalendar();
  
  // Refresh the event modal to show updated list
  if (currentSelectedDate) {
    const year = currentSelectedDate.getFullYear();
    const month = currentSelectedDate.getMonth();
    const day = currentSelectedDate.getDate();
    openEventModal(year, month, day);
  }
  
  alert('Event deleted successfully!');
}

document.getElementById('close-event').addEventListener('click', () => {
  document.getElementById('event-modal').style.display = 'none';
});

// UPDATE: Save event handler (around line 1400)
document.getElementById('save-event').addEventListener('click', () => {
    const eventText = document.getElementById('event-text').value.trim();
    if (!eventText) {
        alert('Please enter event text');
        return;
    }
    
    if (!currentSelectedDate) {
        alert('Error: No date selected.');
        return;
    }
    
    const dateKey = `${currentSelectedDate.getFullYear()}-${currentSelectedDate.getMonth() + 1}-${currentSelectedDate.getDate()}`;
    
    if (!calendarEvents[dateKey]) {
        calendarEvents[dateKey] = [];
    }
    
    calendarEvents[dateKey].push(eventText);
    
    // FIX: Save to localStorage
    saveCalendarEvents();
    
    document.getElementById('event-text').value = '';
    initializeCalendar();
    
    const year = currentSelectedDate.getFullYear();
    const month = currentSelectedDate.getMonth();
    const day = currentSelectedDate.getDate();
    openEventModal(year, month, day);
    
    alert('Event saved successfully!');
});

// Update dashboard statistics
async function updateDashboardStats() {
  try {
    const response = await fetch('/api/professor/stats');
    if (response.ok) {
      const stats = await response.json();
      
      document.getElementById('total-classes').textContent = stats.total_classes;
      document.getElementById('total-students').textContent = stats.total_students;
      document.getElementById('pending-tasks').textContent = stats.pending_tasks;
      document.getElementById('upcoming-deadlines').textContent = stats.upcoming_deadlines;
    } else {
      // Fallback to calculated stats if API fails
      calculateDashboardStats();
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
    calculateDashboardStats();
  }
  
  // Update deadline list
  // updateDeadlineList();
  
  // Update activity list
  updateActivityList();

  // CRITICAL FIX: Load all students for the Students section
  loadAllStudents();
}

// REPLACE lines 5883-5897 with:
function calculateDashboardStats() {
  // ✅ Only count active (non-archived) classes
  const activeClasses = classes.filter(c => !c.archived);
  const totalClassesEl = document.getElementById('total-classes');
  if (totalClassesEl) totalClassesEl.textContent = activeClasses.length;
  
  let totalStudents = 0;
  activeClasses.forEach(classItem => {
    totalStudents += classItem.students ? classItem.students.length : 0;
  });
  const totalStudentsEl = document.getElementById('total-students');
  if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;
  
  // Calculate pending tasks (active assignments not yet due)
  let pendingTasks = 0;
  const now = new Date();
  
  activeClasses.forEach(classItem => {
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const dueDate = new Date(assignment.dueDate);
        if (dueDate > now) {
          pendingTasks++;
        }
      });
    }
  });
  const pendingTasksEl = document.getElementById('pending-tasks');
  if (pendingTasksEl) pendingTasksEl.textContent = pendingTasks;
  
  // ✅ NEW: Calculate missed submissions
  let missedSubmissions = 0;
  
  activeClasses.forEach(classItem => {
    if (classItem.assignments && classItem.students) {
      classItem.assignments.forEach(assignment => {
        const dueDate = new Date(assignment.dueDate);
        if (dueDate < now) {
          classItem.students.forEach(student => {
            const submission = assignment.submissions ? 
              assignment.submissions.find(s => String(s.studentId) === String(student.id)) : null;
            if (!submission) {
              missedSubmissions++;
            }
          });
        }
      });
    }
  });
  
  const missedSubmissionsEl = document.getElementById('missed-submissions-count');
  if (missedSubmissionsEl) missedSubmissionsEl.textContent = missedSubmissions;
}

function updateDeadlineList() {
  // ✅ FIX: Check if element exists first
  const deadlineList = document.getElementById('deadline-list');
  if (!deadlineList) {
    console.log('📌 Deadline list element not found - skipping (element removed from UI)');
    return; // Element doesn't exist in new UI design
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let allDeadlines = [];
  classes.forEach(classItem => {
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const dueDate = new Date(assignment.dueDate);
        dueDate.setHours(23, 59, 59, 999);
        if (dueDate > today) {
          allDeadlines.push({
            title: assignment.title,
            dueDate: dueDate,
            class: classItem.name
          });
        }
      });
    }
  });
  
  allDeadlines.sort((a, b) => a.dueDate - b.dueDate);
  allDeadlines = allDeadlines.slice(0, 5);
  
  deadlineList.innerHTML = '';
  if (allDeadlines.length === 0) {
    deadlineList.innerHTML = '<div class="empty-message">No upcoming deadlines</div>';
    return;
  }
  
  allDeadlines.forEach(deadline => {
    const deadlineElement = document.createElement('div');
    deadlineElement.className = 'deadline-item';
    deadlineElement.innerHTML = `
      <div class="deadline-info">
        <h4>${deadline.title}</h4>
        <p>${deadline.class}</p>
      </div>
      <div class="deadline-date">
        ${deadline.dueDate.toLocaleDateString()}
      </div>
    `;
    deadlineList.appendChild(deadlineElement);
  });
}

// REPLACE lines 6012-6029 with:
function updateActivityList() {
  const activityList = document.getElementById('activity-list');
  
  // ✅ FIX: Check if element exists
  if (!activityList) {
    console.log('📌 Activity list element not found - skipping');
    return;
  }
  
  // For demo purposes, create some sample activities
  const activities = [
    { action: 'graded', item: 'Submission for Advanced Algorithms', time: '10 minutes ago' },
    { action: 'created', item: 'Data Structures class', time: '2 hours ago' },
    { action: 'uploaded', item: 'Lecture notes for Algorithms', time: '1 day ago' },
    { action: 'created', item: 'Assignment 1: Linked Lists', time: '2 days ago' },
    { action: 'graded', item: '5 submissions for Assignment 1', time: '3 days ago' }
  ];
  
  activityList.innerHTML = '';
  activities.forEach(activity => {
    const activityElement = document.createElement('div');
    activityElement.className = 'activity-item';
    activityElement.innerHTML = `
      <div class="activity-icon">
        <i class="fas fa-${getActivityIcon(activity.action)}"></i>
      </div>
      <div class="activity-details">
        <p>You ${activity.action} <strong>${activity.item}</strong></p>
        <span class="activity-time">${activity.time}</span>
      </div>
    `;
    activityList.appendChild(activityElement);
  });
}

function getActivityIcon(action) {
  switch(action) {
    case 'created': return 'plus-circle';
    case 'uploaded': return 'file-upload';
    case 'graded': return 'check-circle';
    default: return 'circle';
  }
}

// Profile Section Functionality
document.addEventListener('DOMContentLoaded', function() {
  const avatarUpload = document.getElementById('avatar-upload');
  const profileAvatar = document.getElementById('profile-avatar');
  const topbarAvatar = document.getElementById('topbar-avatar');
  
  const userType = 'professor';
  
  // Load saved avatar on page load
  // Load saved avatar on page load
  const savedAvatar = localStorage.getItem(`${userType}_avatar`);
  if (savedAvatar && profileAvatar && topbarAvatar) {
    profileAvatar.src = savedAvatar;
    topbarAvatar.src = savedAvatar;
  }
  
  if (avatarUpload && profileAvatar && topbarAvatar) {
    // Remove old listeners by cloning
    const newAvatarUpload = avatarUpload.cloneNode(true);
    avatarUpload.parentNode.replaceChild(newAvatarUpload, avatarUpload);
    
    newAvatarUpload.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG, PNG, GIF)');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = function(e) {
        const avatarData = e.target.result;
        
        // Update both avatars immediately
        profileAvatar.src = avatarData;
        topbarAvatar.src = avatarData;
        
        try {
          // Save to localStorage
          localStorage.setItem(`${userType}_avatar`, avatarData);
          
          // Show success toast (same as student dashboard)
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
          `;
          
          toast.innerHTML = `
            <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <i class="fas fa-check-circle" style="font-size: 1.75rem;"></i>
            </div>
            <div style="flex: 1;">
              <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 0.25rem;">Profile Picture Updated!</div>
              <div style="font-size: 0.9rem; opacity: 0.95; line-height: 1.4;">Your avatar has been saved successfully</div>
            </div>
          `;
          
          document.body.appendChild(toast);
          
          setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
          }, 3500);
          
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            alert('Storage full. Please choose a smaller image.');
          } else {
            alert('Error saving: ' + error.message);
          }
        }
      };
      
      reader.onerror = function() {
        alert('Error reading file. Please try again.');
      };

      reader.readAsDataURL(file);
    });
  }
  
});

    const savedEvents = localStorage.getItem('calendar_events');
    if (savedEvents) {
        try {
            calendarEvents = JSON.parse(savedEvents);
            console.log('Loaded calendar events:', Object.keys(calendarEvents).length);
        } catch (e) {
            console.error('Error loading calendar events:', e);
            calendarEvents = {};
        }
    }


  // ADD THIS: Password update functionality
  const updatePasswordBtn = document.getElementById('update-password');
  if (updatePasswordBtn) {
    updatePasswordBtn.addEventListener('click', async function() {
      const currentPassword = document.getElementById('current-password').value.trim();
      const newPassword = document.getElementById('new-password').value.trim();
      const confirmPassword = document.getElementById('confirm-password').value.trim();
      
      // Validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        showMessage('Please fill in all password fields', 'error');
        return;
      }
      
      if (newPassword.length < 8) {
        showMessage('New password must be at least 8 characters', 'error');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        showMessage('New passwords do not match', 'error');
        return;
      }
      
      if (currentPassword === newPassword) {
        showMessage('New password must be different from current password', 'error');
        return;
      }
      
      try {
        updatePasswordBtn.disabled = true;
        updatePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        
        const response = await fetch('/api/profile/update-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
          })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          showMessage('Password updated successfully!', 'success');
          // Clear fields
          document.getElementById('current-password').value = '';
          document.getElementById('new-password').value = '';
          document.getElementById('confirm-password').value = '';
        } else {
          showMessage(result.error || 'Failed to update password', 'error');
        }
      } catch (error) {
        console.error('Error updating password:', error);
        showMessage('Error updating password. Please try again.', 'error');
      } finally {
        updatePasswordBtn.disabled = false;
        updatePasswordBtn.innerHTML = 'Update Password';
      }
    });
  }
  
  function saveCalendarEvents() {
    try {
        localStorage.setItem('calendar_events', JSON.stringify(calendarEvents));
        console.log('Calendar events saved');
    } catch (e) {
        console.error('Error saving calendar events:', e);
        if (e.name === 'QuotaExceededError') {
            alert('âš ï¸ Storage full. Please clear some old calendar events.');
        }
    }
}
  
  //  Helper function to show messages
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

// Helper function to show messages
function showMessage(message, type) {
  const messageEl = document.getElementById('profile-message');
  if (!messageEl) return; // Bug Fix: Check if element exists
  
  messageEl.textContent = message;
  messageEl.className = `profile-message ${type}`;
  messageEl.style.display = 'block';
  
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 5000);
}

async function loadAllStudents() {
  const allStudentsList = document.getElementById('all-students-list');
  if (!allStudentsList) return;
  
  allStudentsList.innerHTML = '<div style="text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i><p>Loading students...</p></div>';
  
  const studentMap = new Map(); // ✅ Use Map to prevent duplicates
  
  classes.forEach(classItem => {
    if (classItem.students && classItem.students.length > 0) {
      classItem.students.forEach(student => {
        const studentKey = String(student.id || student.student_id); // ✅ Use string key
        if (!studentMap.has(studentKey)) {
          studentMap.set(studentKey, {
            ...student,
            classes: [classItem.name],
            classIds: [classItem.id]
          });
        } else {
          const existingStudent = studentMap.get(studentKey);
          if (!existingStudent.classes.includes(classItem.name)) { // ✅ Prevent duplicate class names
            existingStudent.classes.push(classItem.name);
            existingStudent.classIds.push(classItem.id);
          }
        }
      });
    }
  });
  
  let allStudents = Array.from(studentMap.values());
  
  if (allStudents.length === 0) {
    allStudentsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <h3>No Students Enrolled</h3>
        <p>Students will appear here once they join your classes</p>
      </div>
    `;
    return;
  }
  
  // SORT STUDENTS ALPHABETICALLY BY NAME
  allStudents.sort((a, b) => {
    const nameA = (a.name || `${a.first_name || ''} ${a.last_name || ''}`.trim()).toLowerCase();
    const nameB = (b.name || `${b.first_name || ''} ${b.last_name || ''}`.trim()).toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  allStudentsList.innerHTML = '';
  
  // ✅ Load avatars for all students
  for (const student of allStudents) {
    const studentName = student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student';
    const studentEmail = student.email || student.username || 'N/A';
    const studentId = student.student_id || student.id || 'N/A';
    const studentDatabaseId = String(student.id || student.student_id);
    
    // ✅ Load avatar from DATABASE
    let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=4a90a4&color=fff`;
    
    try {
      const response = await fetch(`/api/profile/avatar/student/${studentDatabaseId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.avatar) {
          avatarUrl = data.avatar;
        }
      }
    } catch (e) {
      console.error('Error loading student avatar:', e);
    }
    
    const studentElement = document.createElement('div');
    studentElement.className = 'student-item';
    studentElement.innerHTML = `
      <div class="student-info">
        <img src="${avatarUrl}" 
             alt="${studentName}" 
             class="avatar"
             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=4a90a4&color=fff'">
        <div>
          <h4>${studentName}</h4>
          <p>${studentId} • ${studentEmail}</p>
          <p style="font-size: 0.85rem; color: var(--text-light); margin-top: 0.25rem;">
            Enrolled in: ${student.classes.join(', ')}
          </p>
        </div>
      </div>
      <div class="student-stats">
        <span>${student.classes.length} Class${student.classes.length !== 1 ? 'es' : ''}</span>
      </div>
    `;
    allStudentsList.appendChild(studentElement);
  }
  
  const searchInput = document.getElementById('students-search');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      filterStudents(allStudents, searchTerm);
    });
  }
}
  


// Render students list
function renderStudentsList(students) {
  const allStudentsList = document.getElementById('all-students-list');
  allStudentsList.innerHTML = '';
  
  students.forEach(student => {
    const studentName = student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student';
    const studentEmail = student.email || student.username || 'N/A';
    const studentId = student.student_id || student.id || 'N/A';
    const studentDatabaseId = String(student.id || student.student_id);
    
    // ✅ Try to load student's custom avatar
    let avatarUrl = null;
    // ✅ NEW CODE - REPLACE WITH THIS:
    const possibleAvatarKeys = [
      `avatar_student_${studentDatabaseId}`,  // ← NEW PRIORITY KEY
      `student_avatar_${studentDatabaseId}`,
      `student_avatar`,
      'avatar'
    ];
    
    for (const key of possibleAvatarKeys) {
      const savedAvatar = localStorage.getItem(key);
      if (savedAvatar && savedAvatar.startsWith('data:image')) {
        avatarUrl = savedAvatar;
        break;
      }
    }
    
    if (!avatarUrl) {
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=4a90a4&color=fff`;
    }
    
    const studentElement = document.createElement('div');
    studentElement.className = 'student-item';
    studentElement.innerHTML = `
      <div class="student-info">
        <img src="${avatarUrl}" 
             alt="${studentName}" 
             class="avatar"
             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=4a90a4&color=fff'">
        <div>
          <h4>${studentName}</h4>
          <p>${studentId} ${studentEmail}</p>
          <p style="font-size: 0.85rem; color: var(--text-light); margin-top: 0.25rem;">
            Enrolled in: ${student.classes.join(', ')}
          </p>
        </div>
      </div>
      <div class="student-stats">
        <span>${student.classes.length} Class${student.classes.length !== 1 ? 'es' : ''}</span>
      </div>
    `;
    allStudentsList.appendChild(studentElement);
  });
}

// ✅ ADD: In professor-script.js, add this function to load student avatars
async function loadStudentAvatars(studentIds) {
  try {
    const response = await fetch('/api/professor/student-avatars', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ student_ids: studentIds })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.avatars || {};
    }
  } catch (e) {
    console.error('Error loading student avatars:', e);
  }
  return {};
}

// ✅ UPDATE: When displaying students, use this function
async function displayStudentsWithAvatars(students, container) {
  const studentIds = students.map(s => s.id);
  const avatars = await loadStudentAvatars(studentIds);
  
  container.innerHTML = '';
  
  students.forEach(student => {
    const avatar = avatars[student.id] || '/images/default-avatar.png';
    // Use the avatar in your student card HTML
  });
}

// Filter students based on search term
function filterStudents(allStudents, searchTerm) {
  const filtered = allStudents.filter(student => {
    const studentName = (student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || '').toLowerCase();
    const studentEmail = (student.email || student.username || '').toLowerCase();
    const studentId = (student.student_id || student.id || '').toLowerCase();
    
    return studentName.includes(searchTerm) || 
           studentEmail.includes(searchTerm) || 
           studentId.includes(searchTerm);
  });
  
  renderStudentsList(filtered);
}

// Export all students to CSV
function exportAllStudents() {
  const studentMap = new Map();
  
  classes.forEach(classItem => {
    if (classItem.students && classItem.students.length > 0) {
      classItem.students.forEach(student => {
        const studentKey = student.id || student.student_id;
        if (!studentMap.has(studentKey)) {
          studentMap.set(studentKey, {
            ...student,
            classes: [classItem.name]
          });
        } else {
          const existingStudent = studentMap.get(studentKey);
          existingStudent.classes.push(classItem.name);
        }
      });
    }
  });
  
  const allStudents = Array.from(studentMap.values());
  
  if (allStudents.length === 0) {
    alert('No students to export');
    return;
  }
  
  let csvContent = 'Name,Student ID,Email,Classes\n';
  allStudents.forEach(student => {
    const name = (student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || '').replace(/,/g, '');
    const email = (student.email || student.username || '').replace(/,/g, '');
    const studentId = student.student_id || student.id || '';
    const classes = student.classes.join('; ');
    csvContent += `${name},${studentId},${email},"${classes}"\n`;
  });
  
  downloadCSV(csvContent, 'all_students.csv');
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

// Run this in browser console on both dashboards:


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