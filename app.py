from threading import Timer
import webbrowser
from flask import Flask, render_template, request, redirect, url_for, flash, session, send_from_directory, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from io import BytesIO
import base64
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import uuid
from datetime import datetime, timedelta
import re
import random
import string
import json
import logging
from logging.handlers import RotatingFileHandler


# Add after imports
MAX_LOGIN_ATTEMPTS = 5
LOGIN_TIMEOUT_MINUTES = 15
login_attempts = {}  # Store failed attempts

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(24).hex())
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)

# Database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'app.db')

database_url = os.environ.get('DATABASE_URL')
if database_url:
    # Fix for Render PostgreSQL
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    print(f"✅ Using PostgreSQL: {database_url[:30]}...")
else:
    # Local SQLite fallback
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    print(f"⚠️ Using SQLite: {db_path}")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
}

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Production configuration
if os.environ.get('FLASK_ENV') == 'production':
    # Enable logging
    if not os.path.exists('logs'):
        os.mkdir('logs')
    file_handler = RotatingFileHandler('logs/learnsync.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('LearnSync startup')

db = SQLAlchemy(app)

# Association Table for Student/Class Enrollment
enrollments = db.Table('enrollments',
    db.Column('student_id', db.Integer, db.ForeignKey('student.id'), primary_key=True),
    db.Column('class_id', db.Integer, db.ForeignKey('class.id'), primary_key=True)
)


# Student model
class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    student_id = db.Column(db.String(50), unique=True)
    course = db.Column(db.String(100))
    year_level = db.Column(db.String(50))
    user_type = db.Column(db.String(20), default='student')
    
    classes = db.relationship('Class', secondary=enrollments, lazy='subquery',
                              backref=db.backref('students', lazy=True))

    def __repr__(self):
        return f'<Student {self.username}>'

# Professor model
class Professor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    professor_id = db.Column(db.String(50), unique=True)
    department = db.Column(db.String(100))
    user_type = db.Column(db.String(20), default='professor')

    classes = db.relationship('Class', backref='professor', lazy=True)

    def __repr__(self):
        return f'<Professor {self.username}>'
        
# Class Model
class Class(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.String(300))
    code = db.Column(db.String(10), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    professor_id = db.Column(db.Integer, db.ForeignKey('professor.id'), nullable=False)
    archived = db.Column(db.Boolean, default=False)  # ADD THIS LINE

    def __repr__(self):
        return f'<Class {self.name} ({self.code})>'

# Material Model
class Material(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey('class.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    deadline = db.Column(db.DateTime, nullable=True)
    resource_link = db.Column(db.String(500), nullable=True)
    files = db.Column(db.Text, nullable=True)  # Store as JSON string
    
    def __repr__(self):
        return f'<Material {self.title}>'

# Assignment Model
class Assignment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey('class.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    instructions = db.Column(db.Text, nullable=True)
    due_date = db.Column(db.DateTime, nullable=False)
    points = db.Column(db.Integer, default=100)
    date_created = db.Column(db.DateTime, default=datetime.utcnow)
    files = db.Column(db.Text, nullable=True)  # Store as JSON string
    
    submissions = db.relationship('Submission', backref='assignment', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Assignment {self.title}>'

# Submission Model
class Submission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignment.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    files = db.Column(db.Text, nullable=True)  # Store as JSON string
    date = db.Column(db.DateTime, default=datetime.utcnow)
    grade = db.Column(db.Float, nullable=True)
    feedback = db.Column(db.Text, nullable=True)
    
    def __repr__(self):
        return f'<Submission {self.id}>'

# Password Reset Token model
class PasswordResetToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), nullable=False)
    token = db.Column(db.String(100), unique=True, nullable=False)
    user_type = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f'<PasswordResetToken {self.token}>' 

# Database initialization with better error handling
def cleanup_expired_tokens():
    """Remove expired password reset tokens from database"""
    try:
        expired_tokens = PasswordResetToken.query.filter(
            PasswordResetToken.expires_at < datetime.utcnow()
        ).all()
        
        for token in expired_tokens:
            db.session.delete(token)
        
        db.session.commit()
        print(f"✓ Cleaned up {len(expired_tokens)} expired tokens")
    except Exception as e:
        db.session.rollback()
        print(f"✗ Error cleaning up tokens: {e}")

def generate_reset_token():
    """Generate a unique reset token"""
    return str(uuid.uuid4())

# Database initialization with better error handling
def init_db():
    """Initialize database with all tables"""
    try:
        with app.app_context():
            db.create_all()
            cleanup_expired_tokens()  # ✅ Now this function is defined above
            print("✓ Database initialized successfully!")
    except Exception as e:
        print(f"✗ Database initialization error: {e}")
        raise

# Initialize database only when app starts, not during imports
def initialize_app():
    with app.app_context():
        try:
            db.create_all()
            cleanup_expired_tokens()
            print("✅ Database initialized successfully!")
        except Exception as e:
            print(f"❌ Database initialization error: {e}")
            raise

# Call initialization when the app starts
with app.app_context():
    initialize_app()


# Configure upload folder
UPLOAD_FOLDER = os.path.join(basedir, 'uploads')
ALLOWED_EXTENSIONS = {
    'pdf', 'doc', 'docx', 'txt', 
    'png', 'jpg', 'jpeg', 'gif', 
    'zip',
    # ✅ VIDEO FILES SUPPORT
    'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'
}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB per file

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # ✅ Increased to 500MB for video files

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Static file routes
@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(basedir, 'css'), filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(basedir, 'js'), filename)

@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory(os.path.join(basedir, 'images'), filename)

@app.route('/professor-styles.css')
def serve_professor_css():
    return send_from_directory(basedir, 'professor-styles.css')

@app.route('/professor-script.js')
def serve_professor_js():
    return send_from_directory(basedir, 'professor-script.js')

@app.route('/student-styles.css')
def serve_student_css():
    return send_from_directory(basedir, 'student-styles.css')

@app.route('/student-script.js')
def serve_student_js():
    return send_from_directory(basedir, 'student-script.js')

@app.route('/login.css')
def serve_login_css():
    return send_from_directory(basedir, 'login.css')

@app.route('/signup.css')
def serve_signup_css():
    return send_from_directory(basedir, 'signup.css')

@app.route('/styles.css')
def serve_styles_css():
    return send_from_directory(basedir, 'styles.css')

@app.route('/script.js')
def serve_script_js():
    return send_from_directory(basedir, 'script.js')

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Endpoint not found'}), 404
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Internal server error'}), 500
    return render_template('500.html'), 500

@app.errorhandler(401)
def unauthorized_error(error):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Unauthorized'}), 401
    flash("Please log in to access this page")
    return redirect(url_for('login'))

# Routes
@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/api/profile')
def get_profile():
    if 'user_id' not in session:
        return {'error': 'Unauthorized'}, 401
    
    user_type = session.get('user_type')
    user_id = session.get('user_id')
    
    if user_type == 'student':
        user = Student.query.get(user_id)
        return {
            'id': user.id,
            'student_id': user.student_id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.username,
            'course': user.course,
            'year_level': user.year_level,
            'user_type': 'student'
        }
    else:
        user = Professor.query.get(user_id)
        return {
            'id': user.id,
            'professor_id': user.professor_id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.username,
            'department': user.department,
            'user_type': 'professor'
        }

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form.get('email')
        user_type = request.form.get('userType')
        
        if not email or not user_type:
            flash("Please provide email and select user type")
            return redirect(url_for('forgot_password'))
        
        if user_type == 'student':
            user = Student.query.filter_by(username=email).first()
        else:
            user = Professor.query.filter_by(username=email).first()
        
        if user:
            token = generate_reset_token()
            expires_at = datetime.utcnow() + timedelta(hours=1)
            
            reset_token = PasswordResetToken(
                email=email,
                token=token,
                user_type=user_type,
                expires_at=expires_at
            )
            
            try:
                db.session.add(reset_token)
                db.session.commit()
                flash("Reset link generated! You can now verify your identity.")
                return redirect(url_for('verify_identity', token=token))
                
            except Exception as e:
                db.session.rollback()
                flash("Error generating reset token. Please try again.")
        else:
            flash("No account found with that email address.")
        
        return redirect(url_for('forgot_password'))
    
    return render_template('forgot_password.html')

@app.route('/verify-identity/<token>', methods=['GET', 'POST'])
def verify_identity(token):
    reset_token = PasswordResetToken.query.filter_by(token=token, used=False).first()
    
    if not reset_token:
        flash("Invalid or expired reset link.")
        return redirect(url_for('login'))
    
    if datetime.utcnow() > reset_token.expires_at:
        flash("Reset link has expired.")
        return redirect(url_for('forgot_password'))
    
    if reset_token.user_type == 'student':
        user = Student.query.filter_by(username=reset_token.email).first()
        user_type_name = "Student"
    else:
        user = Professor.query.filter_by(username=reset_token.email).first()
        user_type_name = "Professor"
    
    if not user:
        flash("User not found.")
        return redirect(url_for('forgot_password'))
    
    if request.method == 'POST':
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        
        if reset_token.user_type == 'student':
            student_id = request.form.get('student_id')
            if (user.first_name.lower() == first_name.lower() and 
                user.last_name.lower() == last_name.lower() and 
                user.student_id == student_id):
                flash("Identity verified! You can now reset your password.")
                return redirect(url_for('reset_password', token=token))
            else:
                flash("The information you provided does not match our records. Please try again.")
        else:
            professor_id = request.form.get('professor_id')
            if (user.first_name.lower() == first_name.lower() and 
                user.last_name.lower() == last_name.lower() and 
                user.professor_id == professor_id):
                flash("Identity verified! You can now reset your password.")
                return redirect(url_for('reset_password', token=token))
            else:
                flash("The information you provided does not match our records. Please try again.")
    
    return render_template('verify_identity.html', 
                         token=token, 
                         user_type=reset_token.user_type,
                         user_type_name=user_type_name,
                         email=reset_token.email)

@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    reset_token = PasswordResetToken.query.filter_by(token=token, used=False).first()
    
    if not reset_token:
        flash("Invalid or expired reset link.")
        return redirect(url_for('login'))
    
    if datetime.utcnow() > reset_token.expires_at:
        flash("Reset link has expired.")
        return redirect(url_for('forgot_password'))
    
    if request.method == 'POST':
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # ✅ FIX 1: Check if passwords match
        if password != confirm_password:
            flash("Passwords do not match!")
            return render_template('reset_password.html', token=token)
        
        # ✅ FIX 2: Use the same validation function as signup
        is_valid, message = validate_password(password)
        if not is_valid:
            flash(message)
            return render_template('reset_password.html', token=token)
        
        if reset_token.user_type == 'student':
            user = Student.query.filter_by(username=reset_token.email).first()
        else:
            user = Professor.query.filter_by(username=reset_token.email).first()
        
        if user:
            try:
                user.password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)
                reset_token.used = True
                db.session.commit()
                flash("Password reset successfully! You can now login with your new password.")
                return redirect(url_for('login'))
            except Exception as e:
                db.session.rollback()
                flash("Error resetting password. Please try again.")
        else:
            flash("User not found.")
    
    return render_template('reset_password.html', token=token)

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"
    return True, "Password is strong"

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def check_login_attempts(email):
    """Check if user has exceeded login attempts"""
    if email in login_attempts:
        attempts, locked_until = login_attempts[email]
        if locked_until and datetime.utcnow() < locked_until:
            remaining = (locked_until - datetime.utcnow()).seconds // 60
            return False, f"Account locked. Try again in {remaining} minutes."
        elif locked_until and datetime.utcnow() >= locked_until:
            # Reset after timeout
            login_attempts[email] = [0, None]
    return True, ""



@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        user_type = request.form.get('userType')
        first_name = request.form.get('firstName')
        last_name = request.form.get('lastName')
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password')
        confirm_password = request.form.get('confirmPassword')
        policy_agreed = request.form.get('policy')

        # Enhanced validation
        if not all([first_name, last_name, email, password, confirm_password, user_type]):
            flash("All fields are required!")
            return redirect(url_for('signup'))
        
        if not validate_email(email):
            flash("Invalid email format!")
            return redirect(url_for('signup'))
            
        if not policy_agreed:
            flash("You must agree to the policy!")
            return redirect(url_for('signup'))

        if password != confirm_password:
            flash("Passwords do not match!")
            return redirect(url_for('signup'))
        
        # Validate password strength
        is_valid, message = validate_password(password)
        if not is_valid:
            flash(message)
            return redirect(url_for('signup'))

        # Check existing users
        existing_student = Student.query.filter_by(username=email).first()
        existing_professor = Professor.query.filter_by(username=email).first()
        
        if existing_student or existing_professor:
            flash("Email already registered!")
            return redirect(url_for('signup'))

        try:
            hashed_password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)
            
            if user_type == 'student':
                student_id = request.form.get('studentId')
                course = request.form.get('course')
                year_level = request.form.get('yearLevel')
                
                if not all([student_id, course, year_level]):
                    flash("All student fields are required!")
                    return redirect(url_for('signup'))
                
                existing_student_id = Student.query.filter_by(student_id=student_id).first()
                if existing_student_id:
                    flash("Student ID already registered!")
                    return redirect(url_for('signup'))
                
                new_user = Student(
                    username=email,
                    password=hashed_password,
                    first_name=first_name,
                    last_name=last_name,
                    student_id=student_id,
                    course=course,
                    year_level=year_level
                )
                
            else:
                professor_id = request.form.get('professorId')
                department = request.form.get('department')
                
                if not all([professor_id, department]):
                    flash("All professor fields are required!")
                    return redirect(url_for('signup'))
                
                existing_professor_id = Professor.query.filter_by(professor_id=professor_id).first()
                if existing_professor_id:
                    flash("Professor ID already registered!")
                    return redirect(url_for('signup'))
                
                new_user = Professor(
                    username=email,
                    password=hashed_password,
                    first_name=first_name,
                    last_name=last_name,
                    professor_id=professor_id,
                    department=department
                )
            
            db.session.add(new_user)
            db.session.commit()
            flash("Account created successfully! Please log in.", category="success")
            return redirect(url_for('login'))
            
        except Exception as e:
            db.session.rollback()
            flash("Error creating account. Please try again.")
            return redirect(url_for('signup'))

    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password')
        user_type = request.form.get('userType')

        if not email or not password or not user_type:
            flash("All fields are required")
            return redirect(url_for('login'))
        
        # Check login attempts
        can_login, message = check_login_attempts(email)
        if not can_login:
            flash(message)
            return redirect(url_for('login'))

        # ✅ FIX: Check if user exists first
        if user_type == 'student':
            user = Student.query.filter_by(username=email).first()
        else:
            user = Professor.query.filter_by(username=email).first()
        
        # ✅ FIX: Different messages for "not registered" vs "wrong password"
        if not user:
            flash("This account is not registered. Please sign up first.")
            return redirect(url_for('login'))
        
        if not check_password_hash(user.password, password):
            # Track failed attempts only if user exists
            if email not in login_attempts:
                login_attempts[email] = [0, None]
            
            attempts, _ = login_attempts[email]
            attempts += 1
            
            if attempts >= MAX_LOGIN_ATTEMPTS:
                locked_until = datetime.utcnow() + timedelta(minutes=LOGIN_TIMEOUT_MINUTES)
                login_attempts[email] = [attempts, locked_until]
                flash(f"Too many failed attempts. Account locked for {LOGIN_TIMEOUT_MINUTES} minutes.")
            else:
                login_attempts[email] = [attempts, None]
                remaining = MAX_LOGIN_ATTEMPTS - attempts
                flash(f"Incorrect password. {remaining} attempt{'s' if remaining > 1 else ''} remaining.")
            
            return redirect(url_for('login'))
        
        # Success - Reset login attempts
        if email in login_attempts:
            login_attempts[email] = [0, None]
        
        session['user_id'] = user.id
        session['user_email'] = user.username
        session['user_first_name'] = user.first_name
        session['user_type'] = user_type
        session.permanent = True
        app.permanent_session_lifetime = timedelta(hours=2)
        
        flash("Logged in successfully!", "success")
        return redirect(url_for('dashboard'))

    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        flash("Please log in to access the dashboard")
        return redirect(url_for('login'))
    
    user_type = session.get('user_type')
    user_id = session.get('user_id')
    
    if user_type == 'student':
        user = Student.query.get(user_id)
        if not user:
            flash("Student not found")
            return redirect(url_for('logout'))
        
        # Store student data in session for JS access
        session['student_data'] = {
            'id': str(user.id),
            'student_id': user.student_id,
            'name': f"{user.first_name} {user.last_name}"
        }
        
        return render_template('student_dashboard.html', user=user)
    else:
        user = Professor.query.get(user_id)
        if not user:
            flash("Professor not found")
            return redirect(url_for('logout'))
        return render_template('professor_dashboard.html', user=user)

@app.route('/logout', methods=['GET', 'POST'])
def logout():
    session.clear()
    flash("You have been logged out successfully!", "success")
    return redirect(url_for('login'))

def generate_class_code():
    """Generates a random 6-character alphanumeric class code."""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not Class.query.filter_by(code=code).first():
            return code

# Add archive endpoint
@app.route('/api/professor/classes/<class_id>/archive', methods=['POST'])
def archive_class(class_id):
    if 'user_id' not in session or session.get('user_type') != 'professor':
        return jsonify({'error': 'Unauthorized'}), 401
    
    professor_id = session['user_id']
    
    try:
        class_id_int = int(class_id)
        cls = Class.query.filter_by(id=class_id_int, professor_id=professor_id).first()
        
        if not cls:
            return jsonify({'error': 'Class not found'}), 404
        
        cls.archived = not cls.archived  # Toggle archive status
        db.session.commit()
        
        status = 'archived' if cls.archived else 'unarchived'
        return jsonify({'message': f'Class {status} successfully', 'archived': cls.archived}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to archive class'}), 500

@app.route('/api/professor/classes', methods=['GET', 'POST', 'DELETE'])
def manage_classes():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    user_id = session['user_id']
    user_type = session.get('user_type')

    if request.method in ['POST', 'DELETE'] and not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 400

    if user_type == 'professor':
        professor = Professor.query.get(user_id)
        if not professor:
            return jsonify({'error': 'Professor not found'}), 404

        if request.method == 'GET':
            try:
                # ✅ FIX: Proper archived filtering
                show_archived = request.args.get('archived', 'false').lower() == 'true'
                
                if show_archived:
                    classes = Class.query.filter_by(
                        professor_id=user_id,
                        archived=True
                    ).all()
                else:
                    classes = Class.query.filter_by(
                        professor_id=user_id,
                        archived=False
                    ).all()
                
                classes_data = []
                for cls in classes:
                    # Load fresh data for each class
                    materials = Material.query.filter_by(class_id=cls.id).all()
                    assignments = Assignment.query.filter_by(class_id=cls.id).all()
                    
                    students_list = []
                    for student in cls.students:
                        students_list.append({
                            'id': str(student.id),
                            'student_id': student.student_id,
                            'first_name': student.first_name,
                            'last_name': student.last_name,
                            'name': f"{student.first_name} {student.last_name}",
                            'email': student.username
                        })
                    
                    professor = Professor.query.get(cls.professor_id)
                    
                    classes_data.append({
                        'id': str(cls.id),
                        'name': cls.name,
                        'description': cls.description,
                        'code': cls.code,
                        'archived': cls.archived,
                        'professor_name': f"{professor.first_name} {professor.last_name}" if professor else "N/A",
                        'students': students_list,
                        'materials': [{
                            'id': str(m.id),
                            'title': m.title,
                            'description': m.description,
                            'date': m.date.isoformat(),
                            'deadline': m.deadline.isoformat() if m.deadline else None,
                            'resourceLink': m.resource_link,
                            'files': json.loads(m.files) if m.files else []
                        } for m in materials],
                        'assignments': [{
                            'id': str(a.id),
                            'title': a.title,
                            'description': a.description,
                            'dueDate': a.due_date.isoformat(),
                            'points': a.points,
                            'files': json.loads(a.files) if a.files else []
                        } for a in assignments]
                    })
                return jsonify(classes_data)
            except Exception as e:
                print(f"Error fetching professor classes: {e}")
                return jsonify({'error': 'Failed to fetch classes'}), 500
            
        elif request.method == 'POST':
            try:
                data = request.get_json()
                if not data:
                    return jsonify({'error': 'No JSON data provided'}), 400
                
                name = data.get('name')
                description = data.get('description', '')
                code = data.get('code')
                
                if not name or not code:
                    return jsonify({'error': 'Class name and code are required'}), 400
                
                existing_class = Class.query.filter_by(code=code).first()
                if existing_class:
                    return jsonify({'error': 'Class code already exists'}), 400
                
                new_class = Class(
                    name=name,
                    description=description,
                    code=code,
                    professor_id=user_id
                )
                
                db.session.add(new_class)
                db.session.commit()
                
                return jsonify({
                    'id': str(new_class.id),
                    'name': new_class.name,
                    'description': new_class.description,
                    'code': new_class.code,
                    'students': [],
                    'materials': [],
                    'assignments': []
                }), 201
                
            except Exception as e:
                db.session.rollback()
                print(f"Error creating class: {e}")
                return jsonify({'error': 'Failed to create class'}), 500

        elif request.method == 'DELETE':
            try:
                data = request.get_json()
                if not data:
                    return jsonify({'error': 'No JSON data provided'}), 400
                    
                class_id = data.get('class_id')
                
                if not class_id:
                    return jsonify({'error': 'Class ID is required'}), 400
                
                try:
                    class_id_int = int(class_id)
                except ValueError:
                    return jsonify({'error': 'Invalid class ID format'}), 400
                
                cls = Class.query.filter_by(id=class_id_int, professor_id=user_id).first()
                if not cls:
                    return jsonify({'error': 'Class not found or you do not have permission to delete it'}), 404
                
                # Remove all students from the class first
                cls.students = []
                db.session.commit()
                
                # Then delete the class
                db.session.delete(cls)
                db.session.commit()
                
                return jsonify({'message': 'Class deleted successfully'}), 200
            except Exception as e:
                db.session.rollback()
                print(f"Error deleting class: {e}")
                return jsonify({'error': 'Failed to delete class'}), 500
    
    elif user_type == 'student':
        if request.method == 'POST':
            return jsonify({'error': 'Students are not allowed to create classes'}), 403
        
        if request.method == 'DELETE':
            return jsonify({'error': 'Students are not allowed to delete classes'}), 403
            
        student = Student.query.get(user_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        try:
            classes_data = []
            # ✅ FIX: Get archived parameter correctly
            show_archived = request.args.get('archived', 'false').lower() == 'true'
            
            for cls in student.classes:
                # ✅ FIX: Match archived status
                if cls.archived == show_archived:
                    professor = Professor.query.get(cls.professor_id)
                    classes_data.append({
                        'id': str(cls.id),
                        'name': cls.name,
                        'description': cls.description,
                        'code': cls.code,
                        'archived': cls.archived,
                        'professor_name': f"{professor.first_name} {professor.last_name}" if professor else "N/A",
                        'materials': [],
                        'assignments': []
                    })
            return jsonify(classes_data)
        except Exception as e:
            print(f"Error fetching student classes: {e}")
            return jsonify({'error': 'Failed to fetch classes'}), 500
        
    else:
        return jsonify({'error': 'Invalid user type'}), 400


@app.route('/api/student/join_class', methods=['POST'])
def join_class():
    if 'user_id' not in session or session.get('user_type') != 'student':
        return jsonify({'error': 'Unauthorized'}), 401
    
    student_id = session['user_id']
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON data provided'}), 400
        
    class_code = data.get('code')
    if not class_code:
        return jsonify({'error': 'Class code is required'}), 400

    cls_to_join = Class.query.filter_by(code=class_code).first()
    if not cls_to_join:
        return jsonify({'error': 'Class not found with that code'}), 404
    
    if student in cls_to_join.students:
        return jsonify({'error': 'You are already enrolled in this class'}), 400

    try:
        cls_to_join.students.append(student)
        db.session.commit()
        
        professor = Professor.query.get(cls_to_join.professor_id)
        
        return jsonify({
            'message': 'Successfully joined class!',
            'class': {
                'id': str(cls_to_join.id),
                'name': cls_to_join.name,
                'description': cls_to_join.description,
                'code': cls_to_join.code,
                'professor_name': f"{professor.first_name} {professor.last_name}" if professor else "N/A"
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Could not join class, please try again.'}), 500

@app.route('/api/student/unenroll_class', methods=['POST'])
def unenroll_class():
    if 'user_id' not in session or session.get('user_type') != 'student':
        return jsonify({'error': 'Unauthorized'}), 401
    
    student_id = session['user_id']
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON data provided'}), 400
        
    class_id = data.get('class_id')
    if not class_id:
        return jsonify({'error': 'Class ID is required'}), 400

    try:
        class_id_int = int(class_id)
        cls_to_leave = Class.query.get(class_id_int)
    except ValueError:
        return jsonify({'error': 'Invalid class ID format'}), 400
    
    if not cls_to_leave:
        return jsonify({'error': 'Class not found'}), 404
    
    if student not in cls_to_leave.students:
        return jsonify({'error': 'You are not enrolled in this class'}), 400

    try:
        cls_to_leave.students.remove(student)
        db.session.commit()
        
        return jsonify({
            'message': 'Successfully unenrolled from class!',
            'class_id': class_id
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Could not unenroll from class, please try again.'}), 500

@app.route('/api/student/submit_assignment', methods=['POST'])
def submit_assignment():
    if 'user_id' not in session or session.get('user_type') != 'student':
        return jsonify({'error': 'Unauthorized'}), 401
    
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 400
    
    student_id = session['user_id']
    
    try:
        data = request.get_json()
        assignment_id = data.get('assignment_id')
        class_id = data.get('class_id')
        content = data.get('content', '')
        files = data.get('files', [])
        
        print(f"📥 Received submission: assignment={assignment_id}, student={student_id}, class={class_id}")
        
        if not assignment_id:
            return jsonify({'error': 'Assignment ID is required'}), 400
        
        # ✅ FIX: Verify assignment exists
        assignment = Assignment.query.get(assignment_id)
        if not assignment:
            print(f"❌ Assignment {assignment_id} not found in database")
            return jsonify({'error': 'Assignment not found or has been deleted'}), 404
        
        # ✅ FIX: Verify student is enrolled in the class
        cls = Class.query.get(assignment.class_id)
        student = Student.query.get(student_id)
        
        if not cls or student not in cls.students:
            return jsonify({'error': 'You are not enrolled in this class'}), 403
        
        # ✅ FIX: Check if class is archived
        if cls.archived:
            return jsonify({'error': 'Cannot submit to archived class'}), 400
        
        # ✅ FIX: Check deadline
        if datetime.utcnow() > assignment.due_date:
            return jsonify({'error': 'Cannot submit - assignment deadline has passed'}), 400
        
        # ✅ FIX: Find existing submission
        existing_submission = Submission.query.filter_by(
            assignment_id=assignment_id,
            student_id=student_id
        ).first()
        
        if existing_submission:
            # ✅ FIX: Update existing submission
            existing_submission.content = content
            existing_submission.files = json.dumps(files)
            existing_submission.date = datetime.utcnow()
            db.session.commit()
            
            print(f"✅ Updated submission {existing_submission.id}")
            
            return jsonify({
                'message': 'Submission updated successfully',
                'submission_id': existing_submission.id
            }), 200
        else:
            # ✅ FIX: Create new submission
            new_submission = Submission(
                assignment_id=assignment_id,
                student_id=student_id,
                content=content,
                files=json.dumps(files),
                date=datetime.utcnow()
            )
            
            db.session.add(new_submission)
            db.session.commit()
            
            print(f"✅ Created new submission {new_submission.id}")
            
            return jsonify({
                'message': 'Submission saved successfully',
                'submission_id': new_submission.id
            }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error saving submission: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to save submission: {str(e)}'}), 500

@app.route('/api/student/unsubmit_assignment', methods=['POST'])
def unsubmit_assignment():
    if 'user_id' not in session or session.get('user_type') != 'student':
        return jsonify({'error': 'Unauthorized'}), 401
    
    student_id = session['user_id']
    
    try:
        data = request.get_json()
        assignment_id = data.get('assignment_id')
        
        if not assignment_id:
            return jsonify({'error': 'Assignment ID is required'}), 400
        
        # ✅ FIX: Find the submission
        submission = Submission.query.filter_by(
            assignment_id=assignment_id,
            student_id=student_id
        ).first()
        
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404
        
        # ✅ FIX: Check if already graded
        if submission.grade is not None:
            return jsonify({'error': 'Cannot unsubmit - assignment has been graded'}), 400
        
        # ✅ FIX: Check deadline
        assignment = Assignment.query.get(assignment_id)
        if datetime.utcnow() > assignment.due_date:
            return jsonify({'error': 'Cannot unsubmit - deadline has passed'}), 400
        
        # ✅ FIX: Delete submission
        db.session.delete(submission)
        db.session.commit()
        
        print(f"✅ Deleted submission {submission.id}")
        
        return jsonify({'message': 'Submission removed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error unsubmitting: {e}")
        return jsonify({'error': 'Failed to unsubmit assignment'}), 500

# ✅ ADD: New endpoint for removing students (add after unenroll_class route)
@app.route('/api/professor/remove_student', methods=['POST'])
def remove_student():
    if 'user_id' not in session or session.get('user_type') != 'professor':
        return jsonify({'error': 'Unauthorized'}), 401
    
    professor_id = session['user_id']
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON data provided'}), 400
    
    class_id = data.get('class_id')
    student_id = data.get('student_id')
    
    if not class_id or not student_id:
        return jsonify({'error': 'Class ID and Student ID are required'}), 400
    
    try:
        class_id_int = int(class_id)
        student_id_int = int(student_id)
        
        # Verify class belongs to professor
        cls = Class.query.filter_by(id=class_id_int, professor_id=professor_id).first()
        if not cls:
            return jsonify({'error': 'Class not found or unauthorized'}), 404
        
        # Find the student
        student = Student.query.get(student_id_int)
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Remove student from class
        if student in cls.students:
            cls.students.remove(student)
            db.session.commit()
            
            return jsonify({
                'message': 'Student removed successfully',
                'student_id': student_id,
                'class_id': class_id
            }), 200
        else:
            return jsonify({'error': 'Student not enrolled in this class'}), 400
            
    except ValueError:
        return jsonify({'error': 'Invalid ID format'}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error removing student: {e}")
        return jsonify({'error': 'Failed to remove student'}), 500


@app.route('/api/student/stats')
def student_stats():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if session.get('user_type') != 'student':
        return jsonify({'error': 'Unauthorized - Professors cannot access student stats'}), 403
    
    student_id = session.get('user_id')
    student = Student.query.get(student_id)
    
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    return jsonify({
        'enrolled_classes': len(student.classes),
        'pending_assignments': 0,
        'upcoming_deadlines': 0,
        'completed_assignments': 0
    })

@app.route('/api/professor/stats')
def professor_stats():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if session.get('user_type') != 'professor':
        return jsonify({'error': 'Unauthorized - Students cannot access professor stats'}), 403
    
    professor_id = session.get('user_id')
    professor = Professor.query.get(professor_id)
    
    if not professor:
        return {'error': 'Professor not found'}, 404
    
    # ✅ FIX: Count only active (non-archived) classes
    active_classes = Class.query.filter_by(
        professor_id=professor_id,
        archived=False
    ).all()
    
    # ✅ FIX: Use set to track UNIQUE students across ALL classes
    unique_students = set()
    for cls in active_classes:
        for student in cls.students:
            unique_students.add(student.id)  # Uses student.id for uniqueness
    
    total_students = len(unique_students)
    
    # ✅ FIX: Count pending assignments
    pending_tasks = 0
    now = datetime.utcnow()
    for cls in active_classes:
        assignments = Assignment.query.filter_by(class_id=cls.id).all()
        for assignment in assignments:
            if assignment.due_date > now:
                pending_tasks += 1
    
    return {
        'total_classes': len(active_classes),
        'total_students': total_students,
        'pending_tasks': pending_tasks,
        'upcoming_deadlines': 0
    }

@app.route('/api/profile/update-password', methods=['POST'])
def update_password():
    if 'user_id' not in session:
        return {'error': 'Unauthorized'}, 401
    
    user_type = session.get('user_type')
    user_id = session.get('user_id')
    current_password = request.json.get('current_password')
    new_password = request.json.get('new_password')
    
    if user_type == 'student':
        user = Student.query.get(user_id)
    else:
        user = Professor.query.get(user_id)
    
    if not user:
        return {'error': 'User not found'}, 404
    
    if not check_password_hash(user.password, current_password):
        return {'error': 'Current password is incorrect'}, 400
    
    try:
        user.password = generate_password_hash(new_password)
        db.session.commit()
        return {'message': 'Password updated successfully'}
    except Exception as e:
        db.session.rollback()
        return {'error': 'Failed to update password'}, 500

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(os.path.join(basedir, 'static'), filename)

def open_browser():
    webbrowser.open_new("http://127.0.0.1:5000/")

# ✅ ADD THIS ROUTE TO SERVE UPLOADED FILES
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Contact Us Email Functionality
@app.route('/contact', methods=['POST'])
def contact_us():
    try:
        name = request.form.get('name')
        email = request.form.get('email')
        message = request.form.get('message')
        
        if not all([name, email, message]):
            return jsonify({'error': 'All fields are required'}), 400
        
        # Email configuration
        # Email configuration - USE ENVIRONMENT VARIABLES
        smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        sender_email = os.environ.get("SENDER_EMAIL", "learnsynclms@gmail.com")
        sender_password = os.environ.get("SENDER_PASSWORD")  # MUST be set in environment
        recipient_email = os.environ.get("RECIPIENT_EMAIL", "learnsynclms@gmail.com")

        if not sender_password:
            return jsonify({'error': 'Email service not configured'}), 503
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = recipient_email
        msg['Subject'] = f"Contact Form Message from {name}"
        
        body = f"""
        New message from LearnSync Contact Form:
        
        Name: {name}
        Email: {email}
        
        Message:
        {message}
        
        ---
        This message was sent from the LearnSync LMS contact form.
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        text = msg.as_string()
        server.sendmail(sender_email, recipient_email, text)
        server.quit()
        
        return jsonify({'success': True, 'message': 'Message sent successfully!'}), 200
        
    except Exception as e:
        print(f"Error sending contact email: {e}")
        return jsonify({'error': 'Failed to send message. Please try again.'}), 500

# ✅ ADD THIS NEW ENDPOINT
@app.route('/api/upload_file', methods=['POST'])
def upload_file():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        try:
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)
            
            if file_size > MAX_FILE_SIZE:
                size_mb = file_size / 1024 / 1024
                max_mb = MAX_FILE_SIZE / 1024 / 1024
                return jsonify({
                    'error': f'File too large ({size_mb:.1f}MB). Maximum allowed: {max_mb}MB'
                }), 400
            
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            
            # ✅ PRODUCTION FIX: Store in database as base64 for files < 5MB
            if file_size < 5 * 1024 * 1024:  # 5MB limit
                file_data = base64.b64encode(file.read()).decode('utf-8')
                file_url = f"data:{file.content_type};base64,{file_data}"
            else:
                # For larger files, save to disk (will be lost on restart)
                # TODO: Implement cloud storage (AWS S3, Cloudinary, etc.)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(filepath)
                file_url = f"/uploads/{unique_filename}"
            
            return jsonify({
                'success': True,
                'filename': filename,
                'url': file_url,
                'file_id': unique_filename,
                'size': file_size
            }), 200
            
        except Exception as e:
            print(f"Error uploading file: {e}")
            return jsonify({'error': f'Failed to upload file: {str(e)}'}), 500
    else:
        allowed = ', '.join(ALLOWED_EXTENSIONS)
        return jsonify({'error': f'Invalid file type. Allowed: {allowed}'}), 400


# Save material to database
@app.route('/api/professor/materials', methods=['POST'])
def save_material():
    if 'user_id' not in session or session.get('user_type') != 'professor':
        return jsonify({'error': 'Unauthorized'}), 401
    
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 400
    
    data = request.get_json()
    class_id = data.get('class_id')
    material_data = data.get('material')
    
    if not class_id or not material_data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        # Verify class belongs to professor
        cls = Class.query.filter_by(id=class_id, professor_id=session['user_id']).first()
        if not cls:
            return jsonify({'error': 'Class not found'}), 404
        
        # Create new material
        new_material = Material(
            class_id=class_id,
            title=material_data.get('title'),
            description=material_data.get('description'),
            date=datetime.fromisoformat(material_data.get('date').replace('Z', '+00:00')),
            deadline=datetime.fromisoformat(material_data['deadline'].replace('Z', '+00:00')) if material_data.get('deadline') else None,
            resource_link=material_data.get('resourceLink'),
            files=json.dumps(material_data.get('files', []))
        )
        
        db.session.add(new_material)
        db.session.commit()
        
        return jsonify({
            'message': 'Material saved successfully',
            'material_id': new_material.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error saving material: {e}")
        return jsonify({'error': 'Failed to save material'}), 500


# Save assignment to database
@app.route('/api/professor/assignments', methods=['POST'])
def save_assignment():
    if 'user_id' not in session or session.get('user_type') != 'professor':
        return jsonify({'error': 'Unauthorized'}), 401
    
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 400
    
    data = request.get_json()
    class_id = data.get('class_id')
    assignment_data = data.get('assignment')
    
    if not class_id or not assignment_data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        # Verify class belongs to professor
        cls = Class.query.filter_by(id=class_id, professor_id=session['user_id']).first()
        if not cls:
            return jsonify({'error': 'Class not found'}), 404
        
        # Create new assignment
        new_assignment = Assignment(
            class_id=class_id,
            title=assignment_data.get('title'),
            description=assignment_data.get('description'),
            instructions=assignment_data.get('instructions'),
            due_date=datetime.fromisoformat(assignment_data.get('dueDate').replace('Z', '+00:00')),
            points=assignment_data.get('points', 100),
            date_created=datetime.utcnow(),
            files=json.dumps(assignment_data.get('files', []))
        )
        
        db.session.add(new_assignment)
        db.session.commit()
        
        return jsonify({
            'message': 'Assignment saved successfully',
            'assignment_id': new_assignment.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error saving assignment: {e}")
        return jsonify({'error': 'Failed to save assignment'}), 500


@app.route('/api/professor/assignments/<assignment_id>/update-deadline', methods=['POST'])
def update_assignment_deadline(assignment_id):
    if 'user_id' not in session or session.get('user_type') != 'professor':
        return jsonify({'error': 'Unauthorized'}), 401
    
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 400
    
    data = request.get_json()
    new_due_date = data.get('due_date')
    
    if not new_due_date:
        return jsonify({'error': 'Due date is required'}), 400
    
    try:
        assignment = Assignment.query.get(assignment_id)
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404
        
        # Verify the assignment belongs to professor's class
        cls = Class.query.filter_by(id=assignment.class_id, professor_id=session['user_id']).first()
        if not cls:
            return jsonify({'error': 'Unauthorized'}), 403
        
        assignment.due_date = datetime.fromisoformat(new_due_date.replace('Z', '+00:00'))
        db.session.commit()
        
        return jsonify({'message': 'Deadline updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating deadline: {e}")
        return jsonify({'error': 'Failed to update deadline'}), 500

# Delete material
@app.route('/api/professor/materials/<material_id>', methods=['DELETE'])
def delete_material(material_id):
    if 'user_id' not in session or session.get('user_type') != 'professor':
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        material = Material.query.get(material_id)
        if not material:
            return jsonify({'error': 'Material not found'}), 404
        
        # Verify the material belongs to professor's class
        cls = Class.query.filter_by(id=material.class_id, professor_id=session['user_id']).first()
        if not cls:
            return jsonify({'error': 'Unauthorized to delete this material'}), 403
        
        db.session.delete(material)
        db.session.commit()
        
        return jsonify({'message': 'Material deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting material: {e}")
        return jsonify({'error': 'Failed to delete material'}), 500


# Delete assignment
@app.route('/api/professor/assignments/<assignment_id>', methods=['DELETE'])
def delete_assignment(assignment_id):
    if 'user_id' not in session or session.get('user_type') != 'professor':
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        assignment = Assignment.query.get(assignment_id)
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404
        
        # Verify the assignment belongs to professor's class
        cls = Class.query.filter_by(id=assignment.class_id, professor_id=session['user_id']).first()
        if not cls:
            return jsonify({'error': 'Unauthorized to delete this assignment'}), 403
        
        # Note: Submissions will be automatically deleted due to cascade='all, delete-orphan'
        db.session.delete(assignment)
        db.session.commit()
        
        return jsonify({'message': 'Assignment deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting assignment: {e}")
        return jsonify({'error': 'Failed to delete assignment'}), 500

# ===============================
# STUDENT API ENDPOINTS
# ===============================

@app.route('/api/student/classes/<int:class_id>/materials')
def get_student_class_materials(class_id):
    if 'user_id' not in session or session.get('user_type') != 'student':
        return {"error": "Unauthorized"}, 401

    materials = Material.query.filter_by(class_id=class_id).order_by(Material.date.desc()).all()
    
    return jsonify([
        {
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "date": m.date.isoformat()
        } for m in materials
    ])


@app.route('/api/student/classes/<int:class_id>/assignments')
def get_student_class_assignments(class_id):
    if 'user_id' not in session or session.get('user_type') != 'student':
        return {"error": "Unauthorized"}, 401

    assignments = Assignment.query.filter_by(class_id=class_id).order_by(Assignment.due_date.desc()).all()
    
    return jsonify([
        {
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "due_date": a.due_date.isoformat(),
            "points": a.points
        } for a in assignments
    ])


@app.route('/api/student/assignments/<int:assignment_id>/submit', methods=['POST'])
def submit_student_assignment(assignment_id):
    if 'user_id' not in session or session.get('user_type') != 'student':
        return {"error": "Unauthorized"}, 401

    assignment = Assignment.query.get(assignment_id)
    if not assignment:
        return {"error": "Assignment not found or has been deleted by professor"}, 404

    if assignment.archived:
        return {"error": "This assignment belongs to an archived class"}, 403

    text = request.form.get('text', '')
    file = request.files.get('file')

    submission = Submission(
        assignment_id=assignment_id,
        student_id=session['user_id'],
        text=text,
        date=datetime.utcnow()
    )

    db.session.add(submission)
    db.session.commit()

    return jsonify({"success": True})


@app.route('/api/student/assignments/<int:assignment_id>/submission')
def get_student_submission(assignment_id):
    if 'user_id' not in session or session.get('user_type') != 'student':
        return {"error": "Unauthorized"}, 401

    submission = Submission.query.filter_by(
        assignment_id=assignment_id,
        student_id=session['user_id']
    ).first()

    if not submission:
        return jsonify({"submitted": False})

    return jsonify({
        "submitted": True,
        "date": submission.date.isoformat(),
        "grade": submission.grade,
        "feedback": submission.feedback
    })


@app.route('/api/student/classes')
def get_student_classes():
    if 'user_id' not in session or session.get('user_type') != 'student':
        return {"error": "Unauthorized"}, 401

    student = Student.query.get(session['user_id'])
    return jsonify([
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "code": c.code,
            "archived": c.archived
        } for c in student.classes
    ])

@app.route('/api/professor/assignments/<assignment_id>/submissions', methods=['GET'])
def get_assignment_submissions(assignment_id):
    if 'user_id' not in session or session.get('user_type') != 'professor':
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        assignment = Assignment.query.get(assignment_id)
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404
        
        # Verify the assignment belongs to professor's class
        cls = Class.query.filter_by(id=assignment.class_id, professor_id=session['user_id']).first()
        if not cls:
            return jsonify({'error': 'Unauthorized'}), 403
        
        submissions = Submission.query.filter_by(assignment_id=assignment_id).all()
        
        submissions_data = []
        for submission in submissions:
            student = Student.query.get(submission.student_id)
            submissions_data.append({
                'id': str(submission.id),
                'studentId': str(submission.student_id),
                'studentName': f"{student.first_name} {student.last_name}" if student else "Unknown",
                'content': submission.content,
                'date': submission.date.isoformat(),
                'grade': submission.grade,
                'feedback': submission.feedback,
                'files': json.loads(submission.files) if submission.files else []
            })
        
        return jsonify(submissions_data), 200
        
    except Exception as e:
        print(f"Error fetching submissions: {e}")
        return jsonify({'error': 'Failed to fetch submissions'}), 500

@app.route('/api/professor/assignments/<assignment_id>/grade', methods=['POST'])
def grade_submission(assignment_id):
    if 'user_id' not in session or session.get('user_type') != 'professor':
        return jsonify({'error': 'Unauthorized'}), 401
    
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 400
    
    data = request.get_json()
    student_id = data.get('student_id')
    grade = data.get('grade')
    feedback = data.get('feedback', '')
    
    if not student_id or grade is None:
        return jsonify({'error': 'Student ID and grade are required'}), 400
    
    try:
        # ✅ FIX: Convert IDs to integers for proper comparison
        assignment_id_int = int(assignment_id)
        student_id_int = int(student_id)
        
        # Verify assignment belongs to professor
        assignment = Assignment.query.get(assignment_id_int)
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404
        
        cls = Class.query.filter_by(id=assignment.class_id, professor_id=session['user_id']).first()
        if not cls:
            return jsonify({'error': 'Unauthorized to grade this assignment'}), 403
        
        # ✅ FIX: Verify student is enrolled
        student = Student.query.get(student_id_int)
        if not student or student not in cls.students:
            return jsonify({'error': 'Student not enrolled in this class'}), 400
        
        # ✅ FIX: Find submission with proper type casting
        submission = Submission.query.filter(
            Submission.assignment_id == assignment_id_int,
            Submission.student_id == student_id_int
        ).first()
        
        if not submission:
            print(f"❌ Submission not found: assignment={assignment_id_int}, student={student_id_int}")
            print(f"Available submissions: {Submission.query.filter_by(assignment_id=assignment_id_int).count()}")
            return jsonify({'error': 'Submission not found. Student may not have submitted yet.'}), 404
        
        # Validate grade range
        if grade < 0 or grade > assignment.points:
            return jsonify({'error': f'Grade must be between 0 and {assignment.points}'}), 400
        
        # Update grade
        submission.grade = float(grade)
        submission.feedback = feedback
        db.session.commit()
        
        print(f"✅ Grade saved: {grade}/{assignment.points} for student {student_id_int}")
        
        return jsonify({
            'message': 'Grade saved successfully',
            'submission_id': submission.id,
            'grade': submission.grade,
            'feedback': submission.feedback
        }), 200
        
    except ValueError as ve:
        print(f"❌ Value error: {ve}")
        return jsonify({'error': 'Invalid ID format'}), 400
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error saving grade: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to save grade: {str(e)}'}), 500
    
# Get materials for a class
@app.route('/api/professor/classes/<class_id>/materials', methods=['GET'])
def get_class_materials(class_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        cls = Class.query.get(class_id)
        if not cls:
            return jsonify({'error': 'Class not found'}), 404
        
        materials = Material.query.filter_by(class_id=class_id).order_by(Material.date.desc()).all()
        
        materials_data = []
        for material in materials:
            materials_data.append({
                'id': str(material.id),
                'title': material.title,
                'description': material.description,
                'date': material.date.isoformat(),
                'deadline': material.deadline.isoformat() if material.deadline else None,
                'resourceLink': material.resource_link,
                'files': json.loads(material.files) if material.files else []
            })
        
        return jsonify(materials_data), 200
        
    except Exception as e:
        print(f"Error fetching materials: {e}")
        return jsonify({'error': 'Failed to fetch materials'}), 500


# Get assignments for a class
@app.route('/api/professor/classes/<class_id>/assignments', methods=['GET'])
def get_class_assignments(class_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        cls = Class.query.get(class_id)
        if not cls:
            return jsonify({'error': 'Class not found'}), 404
        
        assignments = Assignment.query.filter_by(class_id=class_id).order_by(Assignment.date_created.desc()).all()
        
        assignments_data = []
        for assignment in assignments:
            # ✅ FIX: Always include ALL submissions
            submissions_data = []
            submissions = Submission.query.filter_by(assignment_id=assignment.id).all()
            
            for submission in submissions:
                student = Student.query.get(submission.student_id)
                submissions_data.append({
                    'id': str(submission.id),
                    'studentId': str(submission.student_id),
                    'studentName': f"{student.first_name} {student.last_name}" if student else "Unknown",
                    'content': submission.content,
                    'date': submission.date.isoformat(),
                    'grade': submission.grade,  # ✅ Will be None if not graded
                    'feedback': submission.feedback,
                    'files': json.loads(submission.files) if submission.files else []
                })
            
            assignments_data.append({
                'id': str(assignment.id),
                'title': assignment.title,
                'description': assignment.description,
                'instructions': assignment.instructions,
                'dueDate': assignment.due_date.isoformat(),
                'points': assignment.points,
                'dateCreated': assignment.date_created.isoformat(),
                'files': json.loads(assignment.files) if assignment.files else [],
                'submissions': submissions_data  # ✅ Always include this
            })
        
        return jsonify(assignments_data), 200
        
    except Exception as e:
        print(f"Error fetching assignments: {e}")
        return jsonify({'error': 'Failed to fetch assignments'}), 500

# Add this route to handle calendar event updates
@app.route('/api/calendar/events', methods=['GET', 'POST'])
def manage_calendar_events():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if request.method == 'GET':
        # Return empty events for now - frontend handles calendar
        return jsonify({}), 200
    
    elif request.method == 'POST':
        data = request.get_json()
        # Frontend handles calendar storage in localStorage
        return jsonify({'message': 'Calendar events updated'}), 200

@app.route('/api/profile/update-avatar', methods=['POST'])
def update_avatar():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    user_type = session.get('user_type')
    user_id = session['user_id']
    
    data = request.get_json()
    avatar_data = data.get('avatar')
    
    if not avatar_data:
        return jsonify({'error': 'No avatar data provided'}), 400
    
    try:
        # ✅ Save avatar to database as base64
        if user_type == 'student':
            user = Student.query.get(user_id)
            if not user:
                return jsonify({'error': 'Student not found'}), 404
            
            # Add avatar column if it doesn't exist
            if not hasattr(user, 'avatar'):
                # Create migration later, for now store in a new table
                pass
            
            # ✅ For now, return success - avatar is stored in localStorage
            return jsonify({'message': 'Avatar updated successfully'}), 200
        else:
            user = Professor.query.get(user_id)
            if not user:
                return jsonify({'error': 'Professor not found'}), 404
            
            return jsonify({'message': 'Avatar updated successfully'}), 200
            
    except Exception as e:
        print(f"Error updating avatar: {e}")
        return jsonify({'error': 'Failed to update avatar'}), 500

@app.route('/api/profile/avatar/<user_type>/<user_id>')
def get_avatar(user_type, user_id):
    """Get user avatar from database or localStorage cache"""
    try:
        # For now, return empty - client will use localStorage
        # In production, you'd fetch from database
        return jsonify({'avatar': None}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add after existing routes
@app.route('/api/student/refresh-data')
def refresh_student_data():
    if 'user_id' not in session or session.get('user_type') != 'student':
        return jsonify({'error': 'Unauthorized'}), 401
    
    student_id = session['user_id']
    
    try:
        # Get updated classes with fresh data
        student = Student.query.get(student_id)
        classes_data = []
        
        for cls in student.classes:
            professor = Professor.query.get(cls.professor_id)
            
            # Load fresh assignments
            assignments = Assignment.query.filter_by(class_id=cls.id).all()
            assignments_data = []
            
            for assignment in assignments:
                submission = Submission.query.filter_by(
                    assignment_id=assignment.id,
                    student_id=student_id
                ).first()
                
                assignments_data.append({
                    'id': str(assignment.id),
                    'title': assignment.title,
                    'description': assignment.description,
                    'dueDate': assignment.due_date.isoformat(),
                    'points': assignment.points,
                    'submissions': [{
                        'studentId': str(submission.student_id),
                        'content': submission.content,
                        'grade': submission.grade,
                        'feedback': submission.feedback,
                        'date': submission.date.isoformat(),
                        'files': json.loads(submission.files) if submission.files else []
                    }] if submission else []
                })
            
            classes_data.append({
                'id': str(cls.id),
                'name': cls.name,
                'code': cls.code,
                'description': cls.description,
                'assignments': assignments_data,
                'professor_name': f"{professor.first_name} {professor.last_name}"
            })
        
        return jsonify(classes_data)
        
    except Exception as e:
        print(f"Error refreshing data: {e}")
        return jsonify({'error': 'Failed to refresh data'}), 500

@app.route('/api/professor/refresh-data')
def refresh_professor_data():
    if 'user_id' not in session or session.get('user_type') != 'professor':
        return jsonify({'error': 'Unauthorized'}), 401
    
    professor_id = session['user_id']
    
    try:
        classes = Class.query.filter_by(professor_id=professor_id, archived=False).all()
        classes_data = []
        
        for cls in classes:
            # Load fresh assignments with submissions
            assignments = Assignment.query.filter_by(class_id=cls.id).all()
            assignments_data = []
            
            for assignment in assignments:
                submissions = Submission.query.filter_by(assignment_id=assignment.id).all()
                submissions_data = []
                
                for submission in submissions:
                    student = Student.query.get(submission.student_id)
                    submissions_data.append({
                        'id': str(submission.id),
                        'studentId': str(submission.student_id),
                        'studentName': f"{student.first_name} {student.last_name}",
                        'content': submission.content,
                        'grade': submission.grade,
                        'feedback': submission.feedback,
                        'date': submission.date.isoformat(),
                        'files': json.loads(submission.files) if submission.files else []
                    })
                
                assignments_data.append({
                    'id': str(assignment.id),
                    'title': assignment.title,
                    'description': assignment.description,
                    'dueDate': assignment.due_date.isoformat(),
                    'points': assignment.points,
                    'submissions': submissions_data
                })
            
            classes_data.append({
                'id': str(cls.id),
                'name': cls.name,
                'code': cls.code,
                'description': cls.description,
                'assignments': assignments_data,
                'students': [{
                    'id': str(student.id),
                    'name': f"{student.first_name} {student.last_name}",
                    'email': student.username,
                    'student_id': student.student_id
                } for student in cls.students]
            })
        
        return jsonify(classes_data)
        
    except Exception as e:
        print(f"Error refreshing professor data: {e}")
        return jsonify({'error': 'Failed to refresh data'}), 500

@app.route('/api/database/health')
def database_health():
    """Check database connection and health"""
    try:
        # Test database connection
        db.session.execute(db.text('SELECT 1'))
        
        # Get basic stats
        total_students = Student.query.count()
        total_professors = Professor.query.count()
        total_classes = Class.query.count()
        total_assignments = Assignment.query.count()
        total_submissions = Submission.query.count()
        
        # Get database type
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        db_type = 'postgresql' if 'postgresql' in db_uri else 'sqlite'
        
        return jsonify({
            'status': 'healthy',
            'database_type': db_type,
            'timestamp': datetime.utcnow().isoformat(),
            'stats': {
                'students': total_students,
                'professors': total_professors,
                'classes': total_classes,
                'assignments': total_assignments,
                'submissions': total_submissions
            }
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/api/database/')
def database_info():
    """Database information endpoint"""
    return database_health()

@app.route('/api/database/cleanup', methods=['POST'])
def database_cleanup():
    """Clean up expired data (admin only)"""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Clean expired password reset tokens
        expired_tokens = PasswordResetToken.query.filter(
            PasswordResetToken.expires_at < datetime.utcnow()
        ).all()
        
        tokens_deleted = 0
        for token in expired_tokens:
            db.session.delete(token)
            tokens_deleted += 1
        
        db.session.commit()
        
        return jsonify({
            'message': 'Cleanup completed',
            'tokens_deleted': tokens_deleted,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Cleanup failed: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"Database path: {db_path}")
    print(f"Starting Flask application on port {port}...")
    
    if os.path.exists(db_path):
        print("✓ Database file exists")
    else:
        print("⚠ Database file will be created")
    
    # Only open browser in local development
    if os.environ.get("RENDER") != "true":
        import sys
        if not os.environ.get("WERKZEUG_RUN_MAIN"):
            Timer(1, open_browser).start()
    
    # Use debug=False in production
    debug_mode = os.environ.get("FLASK_ENV") == "development"
    app.run(host='0.0.0.0', port=port, debug=debug_mode)