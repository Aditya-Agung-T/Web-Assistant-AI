import os
import google.generativeai as genai

def generate_from_history(system_prompt: str, conversation_history: list) -> str:
    """
    Menghasilkan respons AI berdasarkan instruksi sistem dan riwayat percakapan.

    Args:
        system_prompt: Instruksi peran untuk AI.
        conversation_history: Sebuah list berisi objek pesan dari user dan model.
    """
    try:
        # Konfigurasi API key
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

        # Inisialisasi model dengan instruksi sistem
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=system_prompt
        )
        
        # Konfigurasi output
        generation_config = genai.types.GenerationConfig(
            response_mime_type="text/plain",
        )

        # Hasilkan konten berdasarkan riwayat
        response = model.generate_content(
            contents=conversation_history,
            generation_config=generation_config
        )
        
        return response.text

    except Exception as e:
        print(f"Terjadi error: {e}")
        return "Maaf, terjadi kesalahan internal saat memproses percakapan."