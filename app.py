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
import uuid # Diperlukan untuk ID unik persona

# Inisialisasi & Konfigurasi
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
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
    client_kwargs={'scope': 'openid email profile'}
)

# === MODEL DATABASE BARU ===
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=True)
    google_id = db.Column(db.String(128), unique=True, nullable=True)
    personas = db.relationship('Persona', backref='owner', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return self.password_hash and check_password_hash(self.password_hash, password)

class Persona(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    persona_id_str = db.Column(db.String(50), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    display_role = db.Column(db.String(200), nullable=False)
    base_prompt = db.Column(db.Text, nullable=False)
    avatar = db.Column(db.String(255), nullable=False)
    is_partner_mode = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self):
        return {
            'persona_id_str': self.persona_id_str,
            'name': self.name,
            'displayRole': self.display_role,
            'basePrompt': self.base_prompt,
            'avatar': self.avatar,
            'isPartner': self.is_partner_mode
        }

class ChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    persona_id_str = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(10), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=db.func.current_timestamp())
    user = db.relationship('User', backref=db.backref('messages', lazy=True))

    def to_dict(self):
        return {"role": self.role, "parts": [{"text": self.content}]}

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

def create_default_personas_for_user(user):
    """Membuat persona default (Emil & Anton) untuk pengguna baru."""
    if not Persona.query.filter_by(user_id=user.id).first():
        emil = Persona(
            owner=user,
            persona_id_str='emil-default',
            name='Emil',
            display_role='Programmer Web & AI',
            base_prompt='Nama Anda adalah Emil. Peran utama Anda adalah sebagai sumber daya teknis ahli. Anda dapat memberikan penjelasan, panduan arsitektur, dan contoh kode untuk pertanyaan teknis terkait pengembangan web dan AI.',
            avatar='https://api.dicebear.com/8.x/bottts-neutral/svg?seed=Emil'
        )
        anton = Persona(
            owner=user,
            persona_id_str='anton-default',
            name='Anton',
            display_role='Analis Politik Kritis',
            base_prompt='Nama Anda adalah Anton. Peran utama Anda adalah sebagai analis politik yang kritis dan objektif. Anda selalu memberikan jawaban yang seimbang dari berbagai sudut pandang dan data. Saat memperkenalkan diri untuk pertama kali, selalu gunakan format daftar berpoin dengan judul yang ditebalkan. Contoh: "* **Peran:** Analis Politik Kritis dan Objektif".',
            avatar='https://api.dicebear.com/8.x/initials/svg?seed=Anton'
        )
        db.session.add_all([emil, anton])
        db.session.commit()

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
    create_default_personas_for_user(current_user)
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
        create_default_personas_for_user(user)
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
            create_default_personas_for_user(user)
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
    except Exception as e:
        flash('Gagal mengautentikasi dengan Google.', 'danger')
        return redirect(url_for('login'))

    user = User.query.filter_by(google_id=user_info['sub']).first()
    if not user:
        user = User.query.filter_by(email=user_info['email']).first()
        if not user:
            user = User(
                username=user_info.get('name', user_info['email']),
                email=user_info['email'],
                google_id=user_info['sub']
            )
            db.session.add(user)
            db.session.commit()
    
    if not user.google_id:
        user.google_id = user_info['sub']
        db.session.commit()
        
    login_user(user)
    create_default_personas_for_user(user)
    return redirect(url_for('chat'))

# === ENDPOINT MANAJEMEN PERSONA ===

@app.route('/get-personas')
@login_required
def get_personas():
    user_personas = Persona.query.filter_by(user_id=current_user.id).all()
    personas_dict = {p.persona_id_str: p.to_dict() for p in user_personas}
    return jsonify(personas_dict)

@app.route('/save-persona', methods=['POST'])
@login_required
def save_persona():
    data = request.json
    new_persona = Persona(
        owner=current_user,
        name=data.get('name'),
        display_role=data.get('displayRole'),
        base_prompt=data.get('basePrompt'),
        avatar=data.get('avatar')
    )
    db.session.add(new_persona)
    db.session.commit()
    return jsonify(new_persona.to_dict()), 201

@app.route('/update-persona-mode', methods=['POST'])
@login_required
def update_persona_mode():
    data = request.json
    persona_id_str = data.get('persona_id_str')
    is_partner_mode = data.get('is_partner_mode')

    persona = Persona.query.filter_by(persona_id_str=persona_id_str, user_id=current_user.id).first()
    if not persona:
        return jsonify({'status': 'error', 'message': 'Persona tidak ditemukan'}), 404

    persona.is_partner_mode = is_partner_mode
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Mode partner diperbarui'}), 200

# === ENDPOINT LAMA YANG DISESUAIKAN ===

@app.route('/get-history/<persona_id_str>')
@login_required
def get_history(persona_id_str):
    messages = ChatMessage.query.filter_by(user_id=current_user.id, persona_id_str=persona_id_str).order_by(ChatMessage.timestamp).all()
    history = [msg.to_dict() for msg in messages]
    return jsonify(history)

@app.route('/delete-history/<persona_id_str>', methods=['POST'])
@login_required
def delete_history(persona_id_str):
    try:
        ChatMessage.query.filter_by(user_id=current_user.id, persona_id_str=persona_id_str).delete()
        db.session.commit()
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': 'Gagal menghapus riwayat'}), 500

@app.route('/get-response', methods=['POST'])
@login_required
def get_response():
    data = request.json
    system_prompt = data.get('prompt')
    history = data.get('history')
    user_message_text = history[-1]['parts'][0]['text']
    persona_id_str = data.get('persona_id_str')

    if not all([system_prompt, history is not None, persona_id_str]):
        return jsonify({'error': 'Data tidak lengkap'}), 400

    user_message = ChatMessage(user_id=current_user.id, persona_id_str=persona_id_str, role='user', content=user_message_text)
    db.session.add(user_message)

    ai_response_text = generator.generate_from_history(system_prompt, history)

    ai_message = ChatMessage(user_id=current_user.id, persona_id_str=persona_id_str, role='model', content=ai_response_text)
    db.session.add(ai_message)
    db.session.commit()
    return jsonify({'response': ai_response_text})
    
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
    app.run(debug=false)