import os
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Length, EqualTo, Email, ValidationError
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
from authlib.integrations.flask_client import OAuth
import generator

# Inisialisasi & Konfigurasi
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'site.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['GOOGLE_CLIENT_ID'] = os.environ.get('GOOGLE_CLIENT_ID')
app.config['GOOGLE_CLIENT_SECRET'] = os.environ.get('GOOGLE_CLIENT_SECRET')

# Inisialisasi Ekstensi
db = SQLAlchemy(app)
oauth = OAuth(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message_category = 'info'
login_manager.login_message = "Anda harus login untuk mengakses halaman ini."

# Konfigurasi Google OAuth
google = oauth.register(
    name='google',
    client_id=app.config["GOOGLE_CLIENT_ID"],
    client_secret=app.config["GOOGLE_CLIENT_SECRET"],
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile',
        'claims_options': {
            'iss': {
                'essential': True,
                'values': ['https://accounts.google.com', 'accounts.google.com']
            }
        }
    }
)

# Model Database
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=True)
    google_id = db.Column(db.String(128), unique=True, nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return self.password_hash and check_password_hash(self.password_hash, password)

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

# Forms
class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=2, max=20)])
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Konfirmasi Password', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Register')

    def validate_email(self, email):
        if User.query.filter_by(email=email.data).first():
            raise ValidationError('Email sudah terdaftar. Silakan gunakan email lain atau login.')

class LoginForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')

# Rute-rute Aplikasi
@app.route('/')
@login_required
def chat():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('chat'))
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(username=form.username.data, email=form.email.data)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash('Akun Anda telah berhasil dibuat! Silakan login.', 'success')
        return redirect(url_for('login'))
    return render_template('register.html', form=form)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('chat'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user and user.password_hash and user.check_password(form.password.data):
            login_user(user)
            next_page = request.args.get('next')
            return redirect(next_page) if next_page else redirect(url_for('chat'))
        else:
            flash('Login gagal. Periksa kembali email dan password.', 'danger')
    return render_template('login.html', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Anda telah berhasil logout.', 'info')
    return redirect(url_for('login'))

@app.route('/google/login')
def google_login():
    redirect_uri = url_for('google_auth', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/google/auth')
def google_auth():
    try:
        token = google.authorize_access_token()
        user_info = token.get('userinfo')
        if not user_info:
            raise Exception("Gagal mendapatkan userinfo dari token.")
    except Exception as e:
        print(f"An error occurred during Google authentication: {e}")
        flash('Gagal mengautentikasi dengan Google. Silakan coba lagi.', 'danger')
        return redirect(url_for('login'))

    user = User.query.filter_by(google_id=user_info['sub']).first()
    if not user:
        user = User.query.filter_by(email=user_info['email']).first()
    
    if user:
        if not user.google_id:
            user.google_id = user_info['sub']
            db.session.commit()
    else:
        user = User(
            username=user_info.get('name', user_info['email']),
            email=user_info['email'],
            google_id=user_info['sub']
        )
        db.session.add(user)
        db.session.commit()
        
    login_user(user)
    return redirect(url_for('chat'))

@app.route('/get-response', methods=['POST'])
@login_required
def get_response():
    data = request.json
    system_prompt = data.get('prompt')
    history = data.get('history')
    if not system_prompt or history is None:
        return jsonify({'error': 'Prompt dan Riwayat percakapan tidak boleh kosong'}), 400
    ai_response = generator.generate_from_history(system_prompt, history)
    return jsonify({'response': ai_response})
    
@app.route('/summarize-role', methods=['POST'])
@login_required
def summarize_role():
    data = request.json
    description = data.get('description')
    if not description:
        return jsonify({'error': 'Deskripsi tidak boleh kosong'}), 400
    short_role = generator.summarize_role(description)
    return jsonify({'short_role': short_role})

@app.route('/generate-prompt', methods=['POST'])
@login_required
def generate_prompt():
    data = request.json
    description = data.get('description')
    if not description:
        return jsonify({'error': 'Deskripsi tidak boleh kosong'}), 400
    nuanced_prompt = generator.generate_nuanced_prompt(description)
    return jsonify({'nuanced_prompt': nuanced_prompt})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
