"""Original geometric mirror/mouth mark. Run with server/.venv Python (Pillow installed)."""

from pathlib import Path

from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parents[1] / "assets/images"
SIZE = 1024
SCALE = 3
BLUE = "#0B3D91"


def curve(points: list[tuple[int, int]]) -> list[tuple[float, float]]:
    out = []
    for step in range(61):
        t = step / 60
        out.append(
            tuple(
                sum(
                    (1 - t) ** (3 - k) * t**k * (1, 3, 3, 1)[k] * points[k][axis]
                    for k in range(4)
                )
                for axis in range(2)
            )
        )
    return out


def mark(background: str | None, color: str = BLUE) -> Image.Image:
    image = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE), background or (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(
        tuple(value * SCALE for value in (266, 220, 758, 804)),
        radius=100 * SCALE,
        outline=color,
        width=36 * SCALE,
    )
    paths = [
        [(344, 512), (422, 424), (472, 456), (512, 478)],
        [(512, 478), (552, 456), (602, 424), (680, 512)],
        [(680, 512), (600, 632), (424, 632), (344, 512)],
        [(344, 512), (440, 548), (584, 548), (680, 512)],
    ]
    for points in paths:
        samples = [(x * SCALE, y * SCALE) for x, y in curve(points)]
        draw.line(
            samples,
            fill=color,
            width=22 * SCALE,
            joint="curve",
        )
        for x, y in samples:
            radius = 11 * SCALE
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color)
    return image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


if __name__ == "__main__":
    ASSETS.mkdir(parents=True, exist_ok=True)
    opaque = mark("#FFFFFF")
    assert opaque.size == (SIZE, SIZE) and opaque.getextrema()[3] == (255, 255)
    opaque.convert("RGB").save(ASSETS / "icon.png")
    transparent = mark(None)
    assert transparent.getpixel((0, 0))[3] == 0
    transparent.save(ASSETS / "android-icon-foreground.png")
    transparent.save(ASSETS / "splash-icon.png")
    mark(None, "#000000").save(ASSETS / "android-icon-monochrome.png")
    Image.new("RGB", (SIZE, SIZE), "#FFFFFF").save(
        ASSETS / "android-icon-background.png"
    )
    print(
        "Generated five original mirror/mouth PNG assets; dimension and alpha checks passed."
    )
