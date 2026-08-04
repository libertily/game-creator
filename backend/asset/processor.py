"""
Asset Processor — image processing, thumbnail generation, format conversion.
Uses Pillow for image manipulation.
"""

from io import BytesIO
from pathlib import Path
from typing import Optional, Tuple

try:
    from PIL import Image, ImageFilter, ImageOps
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False


THUMBNAIL_SIZE = (128, 128)
MAX_PREVIEW_SIZE = (512, 512)


def get_image_info(file_path: str) -> Optional[dict]:
    """Get basic image metadata without loading the full image."""
    if not HAS_PILLOW:
        return {"width": 0, "height": 0, "format": "unknown", "has_pillow": False}

    try:
        with Image.open(file_path) as img:
            return {
                "width": img.width,
                "height": img.height,
                "format": img.format or "unknown",
                "mode": img.mode,
                "has_pillow": True,
            }
    except Exception:
        return None


def generate_thumbnail(
    source_path: str,
    output_path: str,
    size: Tuple[int, int] = THUMBNAIL_SIZE,
    format: str = "PNG",
) -> bool:
    """Generate a thumbnail for an image asset."""
    if not HAS_PILLOW:
        return False

    try:
        with Image.open(source_path) as img:
            img = img.convert("RGBA")
            img.thumbnail(size, Image.LANCZOS)
            img.save(output_path, format)
        return True
    except Exception:
        return False


def process_sprite_sheet(
    file_path: str,
    frame_width: int,
    frame_height: int,
    columns: Optional[int] = None,
) -> Optional[list]:
    """Extract frames from a sprite sheet. Returns list of frame info dicts."""
    if not HAS_PILLOW:
        return None

    try:
        with Image.open(file_path) as img:
            cols = columns or (img.width // frame_width)
            rows = img.height // frame_height
            frames = []

            for row in range(rows):
                for col in range(cols):
                    x = col * frame_width
                    y = row * frame_height
                    frames.append({
                        "index": row * cols + col,
                        "x": x,
                        "y": y,
                        "width": frame_width,
                        "height": frame_height,
                    })

            return frames
    except Exception:
        return None


def convert_image(
    source_path: str,
    output_path: str,
    target_format: str = "PNG",
    resize: Optional[Tuple[int, int]] = None,
) -> bool:
    """Convert an image to a different format, optionally resizing."""
    if not HAS_PILLOW:
        return False

    try:
        with Image.open(source_path) as img:
            img = img.convert("RGBA")
            if resize:
                img = img.resize(resize, Image.LANCZOS)
            img.save(output_path, target_format)
        return True
    except Exception:
        return False


def create_placeholder(
    width: int = 64,
    height: int = 64,
    color: Tuple[int, int, int, int] = (100, 100, 100, 255),
    text: Optional[str] = None,
) -> Optional[bytes]:
    """Create a placeholder image (returns PNG bytes)."""
    if not HAS_PILLOW:
        return None

    try:
        img = Image.new("RGBA", (width, height), color)
        buf = BytesIO()
        img.save(buf, "PNG")
        return buf.getvalue()
    except Exception:
        return None


def detect_asset_type_from_content(file_path: str) -> str:
    """Heuristic asset type detection based on image dimensions."""
    info = get_image_info(file_path)
    if not info or info["width"] == 0:
        return "other"

    w, h = info["width"], info["height"]

    # Tilesets are typically power-of-2 wide and very wide
    if w >= 256 and w % 32 == 0 and h % 32 == 0:
        return "tileset"

    # Portraits are typically square or portrait-oriented
    ratio = w / h if h > 0 else 1
    if 0.5 <= ratio <= 1.5 and max(w, h) <= 512:
        return "portrait"

    # Backgrounds are typically landscape
    if ratio > 1.5 and w >= 640:
        return "background"

    return "sprite"
