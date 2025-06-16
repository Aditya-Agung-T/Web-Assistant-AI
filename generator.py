import os
from cerebras.cloud.sdk import Cerebras

# Inisialisasi client Cerebras di tingkat modul untuk digunakan kembali
# Pastikan variabel lingkungan CEREBRAS_API_KEY sudah diatur.
try:
    client = Cerebras(api_key=os.environ.get("CEREBRAS_API_KEY"))
except Exception as e:
    print(f"Gagal menginisialisasi client Cerebras: {e}")
    client = None

def _call_cerebras_api(messages: list) -> str:
    """Fungsi helper untuk memanggil Cerebras API dan mengumpulkan respons."""
    if not client:
        return "Maaf, client AI tidak terkonfigurasi dengan benar."
    try:
        stream = client.chat.completions.create(
            messages=messages,
            model="csl-hermes-15b-dpo", # atau model Cerebras lain yang Anda inginkan
            stream=True,
            temperature=0.2,
            top_p=1
        )
        
        full_response = ""
        for chunk in stream:
            full_response += chunk.choices[0].delta.content or ""
        return full_response.strip()

    except Exception as e:
        print(f"Terjadi error saat memanggil Cerebras API: {e}")
        return "Maaf, terjadi kesalahan internal saat menghubungi AI."

def generate_from_history(system_prompt: str, conversation_history: list) -> str:
    """
    Menghasilkan respons AI berdasarkan riwayat percakapan menggunakan Cerebras,
    dengan mempertahankan struktur try-except.
    """
    if not client:
        return "Maaf, client AI tidak terkonfigurasi dengan benar."
        
    try:
        # Memformat pesan sesuai standar Cerebras
        messages = [{"role": "system", "content": system_prompt}]
        for msg in conversation_history:
            role = "assistant" if msg.get("role") == "model" else msg.get("role", "user")
            content = msg.get("parts", [{}])[0].get("text", "")
            if content:
                messages.append({"role": role, "content": content})

        # Memanggil fungsi helper untuk eksekusi API
        return _call_cerebras_api(messages)

    except Exception as e:
        # Struktur error handling tetap sama
        print(f"Terjadi error: {e}")
        return "Maaf, terjadi kesalahan internal saat memproses percakapan."


def summarize_role(description: str) -> str:
    """Meringkas deskripsi peran menggunakan Cerebras."""
    system_message = """
    TUGAS ANDA: Meringkas deskripsi peran berikut menjadi jabatan pekerjaan yang sangat singkat.
    ATURAN KETAT:
    - Output HARUS antara 2 hingga 4 kata. JANGAN PERNAH LEBIH DARI 4 KATA.
    - Fokus pada kata kunci utama (profesi, keahlian).
    - Jangan gunakan kalimat lengkap.
    Contoh:
    Input: 'Anda adalah seorang programmer ahli dengan pengalaman 10 tahun di bidang pengembangan web dan AI.'
    Output: 'Programmer Web & AI'
    """
    user_message = f"Lakukan tugas Anda untuk deskripsi ini:\nInput: '{description}'\nOutput:"
    
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message}
    ]
    
    raw_summary = _call_cerebras_api(messages)
    words = raw_summary.replace('"', '').replace('*', '').strip().split()
    short_summary = ' '.join(words[:4])
    return short_summary if short_summary else 'Peran Kustom'


def generate_nuanced_prompt(description: str) -> str:
    """Membuat system prompt yang bernuansa dari deskripsi sederhana menggunakan Cerebras."""
    system_message = """
    Anda adalah seorang Prompt Engineer ahli. Tugas Anda adalah mengubah deskripsi peran sederhana menjadi sebuah prompt kepribadian yang cerdas dan bernuansa untuk sebuah chatbot AI.
    Prompt yang Anda hasilkan harus mendefinisikan dengan jelas apa yang bisa dilakukan oleh AI tersebut sesuai perannya, sekaligus menetapkan batasan yang sopan mengenai apa yang tidak bisa dilakukannya.

    Contoh:
    Input Deskripsi: 'seorang programmer ahli'
    Output Prompt: 'Sebagai seorang programmer ahli, Anda berfungsi sebagai sumber daya teknis. Anda dapat memberikan penjelasan, panduan arsitektur, dan contoh kode untuk pertanyaan teknis terkait pengembangan web dan AI. Namun, jelaskan juga bahwa konsep "coding partner" dalam arti kolaborasi real-time atau pair programming berada di luar kemampuan Anda sebagai model AI, namun Anda dapat membantu dengan memberikan kode untuk implementasi fitur spesifik dan menjelaskan konsep teknis.'
    """
    user_message = f"Sekarang, buatkan prompt kepribadian yang cerdas dan bernuansa untuk deskripsi peran berikut.\nInput Deskripsi: '{description}'\nOutput Prompt:"

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message}
    ]

    return _call_cerebras_api(messages)
