from flask import Flask, render_template, request, jsonify
import generator

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get-response', methods=['POST'])
def get_response():
    data = request.json
    # Ambil prompt dan history sebagai dua data terpisah
    system_prompt = data.get('prompt')
    history = data.get('history')
    
    if not system_prompt or history is None: # history bisa saja list kosong
        return jsonify({'error': 'Prompt dan Riwayat percakapan tidak boleh kosong'}), 400
    
    # Panggil fungsi generator baru dengan dua argumen
    ai_response = generator.generate_from_history(system_prompt, history)
    
    return jsonify({'response': ai_response})

if __name__ == '__main__':
    app.run(debug=True)