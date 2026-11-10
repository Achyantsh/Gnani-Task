LANGUAGE_NAMES = {
    "bn": "Bengali",
    "en": "English",
    "gu": "Gujarati",
    "hi": "Hindi",
    "kn": "Kannada",
    "ml": "Malayalam",
    "mr": "Marathi",
    "pa": "Punjabi",
    "ta": "Tamil",
    "te": "Telugu",
}

# Supported language codes for Prisma v3.0 (BCP-47 format with -IN region)
SUPPORTED_LANGUAGE_CODES = [
    "bn-IN", "en-IN", "gu-IN", "hi-IN", "kn-IN",
    "ml-IN", "mr-IN", "pa-IN", "ta-IN", "te-IN",
]

# Prisma v3.0 supports automatic language detection via this code
INDIC_AUTO_LANGUAGE_CODE = "indic-auto"

# Prisma v3.0 output formats
OUTPUT_FORMAT_CODEMIX = "codemix"
OUTPUT_FORMAT_TRANSLITERATE = "transliterate"
OUTPUT_FORMAT_VERBATIM = "verbatim"
OUTPUT_FORMAT_TRANSCRIBE = "transcribe"

# Prisma v3.0 model name (explicit selection required)
PRISMA_V3_MODEL = "prisma-v3.0"

# Legacy default model used by the current batch flow
PRISMA_V2_5_MODEL = "gnani-prisma-v2.5"

GNANI_BATCH_URL = "https://api.vachana.ai/stt/v3/batch/jobs"