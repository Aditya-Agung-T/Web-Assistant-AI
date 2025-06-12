import os
from google import genai
from google.genai import types

def generate_from_history(conversation_history: list) -> str:
    """
    Menghasilkan respons AI berdasarkan seluruh riwayat percakapan.

    Args:
        conversation_history: Sebuah list berisi objek pesan dari user dan model.
    """
    try:
        client = genai.Client(
            api_key=os.environ.get("GEMINI_API_KEY"),
        )

        model = "gemini-1.5-flash-latest"
        
        # 'contents' sekarang langsung diisi dari riwayat percakapan
        contents = conversation_history

        generate_content_config = types.GenerateContentConfig(
            response_mime_type="text/plain",
        )

        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config,
        )
        
        return response.text

    except Exception as e:
        print(f"Terjadi error: {e}")
        return "Maaf, terjadi kesalahan internal saat memproses percakapan."