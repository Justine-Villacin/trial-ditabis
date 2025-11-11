// Login function
function handleLogin() {
    // Redirect to login page
    window.location.href = "/login";
}

// Carousel functionality
const cards = Array.from(document.querySelectorAll(".card"));
const positions = ["position-1", "position-2", "position-3", "position-4"];

function rotateNext() {
    positions.unshift(positions.pop()); // move last to first
    updatePositions();
}

function rotatePrev() {
    positions.push(positions.shift()); // move first to last
    updatePositions();
}

function updatePositions() {
    cards.forEach((card, index) => {
        card.className = "card " + positions[index];
    });
}

// Initialize carousel
updatePositions();

document.querySelector(".carousel-next").addEventListener("click", rotateNext);
document.querySelector(".carousel-prev").addEventListener("click", rotatePrev);

// INSTANT SMOOTH Scrolling - No delay version
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            // START IMMEDIATELY - no waiting for frames
            initiateInstantSmoothScroll(targetElement);
        }
    });
});

function initiateInstantSmoothScroll(targetElement) {
    // Pre-calculate values for maximum performance
    const navbar = document.querySelector('.navbar');
    const navbarHeight = navbar ? navbar.offsetHeight : 0;
    const elementTop = targetElement.getBoundingClientRect().top + window.pageYOffset;
    
    const startPosition = window.pageYOffset;
    const targetPosition = elementTop - navbarHeight - 10; // Small offset
    const distance = targetPosition - startPosition;
    
    // Shorter duration for faster response
    const duration = Math.min(Math.max(Math.abs(distance) * 0.6, 600), 1000);
    
    let startTime = performance.now(); // Use performance.now() for better accuracy
    
    // Optimized easing function
    function easeInOutCubic(t) {
        return t < 0.5 
            ? 4 * t * t * t 
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    function animation(currentTime) {
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        
        // Smooth easing
        const easeProgress = easeInOutCubic(progress);
        
        window.scrollTo({
            top: startPosition + distance * easeProgress,
            behavior: 'auto'
        });
        
        if (timeElapsed < duration) {
            requestAnimationFrame(animation);
        } else {
            // Final precision adjustment
            window.scrollTo({
                top: targetPosition,
                behavior: 'auto'
            });
        }
    }
    
    // START IMMEDIATELY
    requestAnimationFrame(animation);
}

// Contact Form Handling
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    const contactMessage = document.getElementById('contactMessage');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(contactForm);
            
            try {
                const response = await fetch('/contact', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    contactMessage.style.display = 'block';
                    contactMessage.style.backgroundColor = '#d4edda';
                    contactMessage.style.color = '#155724';
                    contactMessage.style.border = '1px solid #c3e6cb';
                    contactMessage.textContent = result.message;
                    
                    // Clear form
                    contactForm.reset();
                    
                    // Hide message after 5 seconds
                    setTimeout(() => {
                        contactMessage.style.display = 'none';
                    }, 5000);
                } else {
                    contactMessage.style.display = 'block';
                    contactMessage.style.backgroundColor = '#f8d7da';
                    contactMessage.style.color = '#721c24';
                    contactMessage.style.border = '1px solid #f5c6cb';
                    contactMessage.textContent = result.error || 'Failed to send message. Please try again.';
                }
            } catch (error) {
                contactMessage.style.display = 'block';
                contactMessage.style.backgroundColor = '#f8d7da';
                contactMessage.style.color = '#721c24';
                contactMessage.style.border = '1px solid #f5c6cb';
                contactMessage.textContent = 'Network error. Please check your connection and try again.';
            }
        });
    }
});

// Remove focus outlines from navigation (to remove the orange box)
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        // Remove focus outline immediately with CSS
        link.style.outline = 'none';
    });
    
    // Also for login button
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        loginBtn.style.outline = 'none';
    }
});

// Optional: Add passive event listeners for better scrolling performance
document.addEventListener('DOMContentLoaded', function() {
    const anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach(anchor => {
        anchor.addEventListener('touchstart', null, { passive: true });
        anchor.addEventListener('touchmove', null, { passive: true });
    });
});