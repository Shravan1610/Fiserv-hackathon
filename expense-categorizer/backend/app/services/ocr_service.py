import pytesseract
from PIL import Image, ImageFilter, ImageEnhance
import io

def preprocess(image: Image.Image) -> Image.Image:
    image = image.convert("L")
    image = image.filter(ImageFilter.SHARPEN)
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.0)
    return image

def run_ocr(file_storage) -> str:
    image_bytes = file_storage.read()
    image = Image.open(io.BytesIO(image_bytes))
    image = preprocess(image)
    text = pytesseract.image_to_string(image, lang="eng")
    return text.strip()
