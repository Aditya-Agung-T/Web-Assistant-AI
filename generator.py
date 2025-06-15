import os
import google.generativeai as genai

# Fungsi ini tidak berubah
def generate_from_history(system_prompt: str, conversation_history: list) -> str:
    try:
        genai.configure(api_key="AIzaSyDWoFkynWoyA8PDYjR9OLzkCkcmBcQHdKI")
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash-preview-05-20",
            system_instruction=system_prompt
        )
        generation_config = genai.types.GenerationConfig(
            response_mime_type="text/plain",
        )
        response = model.generate_content(
            contents=conversation_history,
            generation_config=generation_config
        )
        return response.text
    except Exception as e:
        print(f"Terjadi error: {e}")
        return "Maaf, terjadi kesalahan internal saat memproses percakapan."

# Fungsi ini tidak berubah
def summarize_role(description: str) -> str:
    try:
        genai.configure(api_key="AIzaSyDWoFkynWoyA8PDYjR9OLzkCkcmBcQHdKI")
        model = genai.GenerativeModel(model_name="gemini-1.5-flash-latest")
        prompt = f"""
        TUGAS ANDA: Meringkas deskripsi peran berikut menjadi jabatan pekerjaan yang sangat singkat.
        ATURAN KETAT:
        - Output HARUS antara 2 hingga 4 kata. JANGAN PERNAH LEBIH DARI 4 KATA.
        - Fokus pada kata kunci utama (profesi, keahlian).
        - Jangan gunakan kalimat lengkap.
        Contoh:
        Input: 'Anda adalah seorang programmer ahli dengan pengalaman 10 tahun di bidang pengembangan web dan AI.'
        Output: 'Programmer Web & AI'
        Lakukan tugas Anda untuk deskripsi ini:
        Input: '{description}'
        Output:
        """
        response = model.generate_content(prompt)
        raw_summary = response.text.strip().replace('"', '').replace('*', '')
        words = raw_summary.split()
        short_summary = ' '.join(words[:4])
        return short_summary
    except Exception as e:
        print(f"Terjadi error saat meringkas: {e}")
        return ' '.join(description.split()[:4]) + '...'

# --- FUNGSI BARU UNTUK MEMBUAT KEPRIBADIAN ---
def generate_nuanced_prompt(description: str) -> str:
    """
    Membuat system prompt yang bernuansa dari deskripsi peran sederhana.
    """
    try:
        genai.configure(api_key="AIzaSyDWoFkynWoyA8PDYjR9OLzkCkcmBcQHdKI")
        model = genai.GenerativeModel(model_name="gemini-1.5-flash-latest")
        
        prompt = f"""
        Anda adalah seorang Prompt Engineer ahli. Tugas Anda adalah mengubah deskripsi peran sederhana menjadi sebuah prompt kepribadian yang cerdas dan bernuansa untuk sebuah chatbot AI.
        Prompt yang Anda hasilkan harus mendefinisikan dengan jelas apa yang bisa dilakukan oleh AI tersebut sesuai perannya, sekaligus menetapkan batasan yang sopan mengenai apa yang tidak bisa dilakukannya.

        Contoh:
        Input Deskripsi: 'seorang programmer ahli'
        Output Prompt: 'Sebagai seorang programmer ahli, Anda berfungsi sebagai sumber daya teknis. Anda dapat memberikan penjelasan, panduan arsitektur, dan contoh kode untuk pertanyaan teknis terkait pengembangan web dan AI. Namun, jelaskan juga bahwa konsep "coding partner" dalam arti kolaborasi real-time atau pair programming berada di luar kemampuan Anda sebagai model AI, namun Anda dapat membantu dengan memberikan kode untuk implementasi fitur spesifik dan menjelaskan konsep teknis.'

        Sekarang, buatkan prompt kepribadian yang cerdas dan bernuansa untuk deskripsi peran berikut.
        Input Deskripsi: '{description}'
        Output Prompt:
        """
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Terjadi error saat membuat prompt: {e}")
        # Jika gagal, kembalikan deskripsi asli sebagai fallback
        return description