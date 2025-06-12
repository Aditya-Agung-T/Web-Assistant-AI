from flask import Flask, render_template, request, jsonify
import generator

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get-response', methods=['POST'])
def get_response():
    # Sekarang kita mengharapkan 'history' bukan 'message'
    history = request.json.get('history')
    
    if not history:
        return jsonify({'error': 'Riwayat percakapan tidak boleh kosong'}), 400
    
    # Panggil fungsi generator baru dengan seluruh riwayat
    ai_response = generator.generate_from_history(history)
    
    return jsonify({'response': ai_response})

if __name__ == '__main__':
    app.run(debug=True)