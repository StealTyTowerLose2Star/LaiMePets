"""预处理管线可视化检查工具

功能：对比不同预处理模式下的照片效果，帮助用户理解和管理
预处理对猫咪身份特征的影响。

用法:
    # 检查单张照片的所有预处理模式对比
    python tools/inspect_preprocessing.py tests/Geigei01.jpg --output inspect_output/

    # 检查某个已完成任务的预处理产物
    python tools/inspect_preprocessing.py --task-id <task_id> --server http://localhost:8000

    # 仅检查身份保留模式（默认）
    python tools/inspect_preprocessing.py tests/Geigei01.jpg --mode fidelity
"""

from __future__ import annotations

import argparse
import io
import json
import sys
from pathlib import Path

# 添加项目根目录到 sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageDraw, ImageFont

from services.preprocessing import preprocess_photo
from config import settings


def create_comparison_image(
    original: Image.Image,
    processed: Image.Image,
    mode_label: str,
    scores: dict | None = None,
) -> Image.Image:
    """
    创建原始照片与预处理产物的并排对比图。

    Returns:
        PIL Image: 宽=original.width*2 + 20, 高=original.height + 标题栏
    """
    w, h = original.size
    pw, ph = processed.size

    # 确保两者高度一致（以原图为准）
    target_h = h + 60  # 标题栏
    target_w = w + pw + 30

    canvas = Image.new("RGB", (target_w, target_h), (240, 240, 240))

    # 标题
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 18)
    except (OSError, IOError):
        font = ImageFont.load_default()

    draw.text((10, 8), f"原始照片 ({w}×{h})", fill=(50, 50, 50), font=font)
    draw.text((w + 20, 8), f"{mode_label} ({pw}×{ph})", fill=(50, 50, 50), font=font)

    # 如果有评分，添加
    if scores:
        score_text = f"清晰度:{scores.get('sharpness', '?')} 主体:{scores.get('subject_ratio', '?')} 亮度:{scores.get('brightness', '?')} 综合:{scores.get('composite', '?')}/100"
        draw.text((10, target_h - 25), score_text, fill=(100, 100, 100), font=font)

    # 粘贴原图
    canvas.paste(original, (0, 40))

    # 粘贴处理后的图（缩放到与原图等高）
    processed_resized = processed.resize(
        (int(pw * (h / ph)), h), Image.LANCZOS
    )
    canvas.paste(processed_resized, (w + 20, 40))

    return canvas


def inspect_photo(
    photo_path: Path,
    output_dir: Path,
    modes: list[str] | None = None,
) -> dict:
    """
    检查单张照片的预处理效果。

    对每种预处理模式生成对比图。
    """
    if modes is None:
        modes = ["fidelity", "enhanced", "minimal"]

    output_dir.mkdir(parents=True, exist_ok=True)
    results = {}

    # 加载原图
    original = Image.open(photo_path).convert("RGB")
    file_bytes = photo_path.read_bytes()

    print(f"\n{'='*60}")
    print(f"[Photo] 检查照片: {photo_path.name} ({original.size[0]}×{original.size[1]})")
    print(f"{'='*60}")

    for mode in modes:
        print(f"\n--- {mode} 模式 ---")
        mode_label = {"fidelity": "身份保留", "enhanced": "增强", "minimal": "最简"}.get(mode, mode)

        # 运行预处理
        pp_data = preprocess_photo(
            file_bytes,
            remove_bg=settings.enable_background_removal,
            smart_crop=True,
            enhance=(mode == "enhanced"),
            mode=mode,
        )

        processed = Image.open(io.BytesIO(pp_data)).convert("RGB")

        # 尝试评分
        try:
            from services.photo_scoring import compute_composite_score
            scores = compute_composite_score(processed)
        except ImportError:
            scores = None

        # 生成对比图
        comparison = create_comparison_image(original, processed, f"{mode_label}模式", scores)

        out_path = output_dir / f"{photo_path.stem}_{mode}.png"
        comparison.save(out_path, format="PNG", optimize=True)

        # 单独保存预处理产物（这是发给 AI 的实际图片）
        pp_out = output_dir / f"{photo_path.stem}_{mode}_preprocessed.png"
        processed.save(pp_out, format="PNG", optimize=True)

        file_size_kb = len(pp_data) / 1024
        print(f"  输出: {out_path.name} ({file_size_kb:.1f} KB)")
        print(f"  预处理产物: {pp_out.name} ({processed.size[0]}×{processed.size[1]})")
        if scores:
            print(f"  评分: 清晰度={scores['sharpness']}, 主体={scores['subject_ratio']}, "
                  f"亮度={scores['brightness']}, 综合={scores['composite']}/100")

        results[mode] = {
            "comparison_path": str(out_path),
            "preprocessed_path": str(pp_out),
            "preprocessed_size": processed.size,
            "file_size_kb": round(file_size_kb, 1),
            "scores": scores,
        }

    return results


def inspect_from_server(task_id: str, server: str, output_dir: Path):
    """从运行中的 API 服务器获取预处理产物"""
    import urllib.request
    import urllib.error

    print(f"\n从 {server} 获取任务 {task_id} 的预处理产物...")

    try:
        # 获取文件列表
        url = f"{server}/api/v1/task/{task_id}/preprocessed"
        with urllib.request.urlopen(url) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        print(f"  找到 {data['count']} 张预处理照片")

        output_dir.mkdir(parents=True, exist_ok=True)

        for img_name, img_url in zip(data["images"], data["urls"]):
            full_url = f"{server}{img_url}"
            with urllib.request.urlopen(full_url) as resp:
                img_data = resp.read()

            out_path = output_dir / img_name
            out_path.write_bytes(img_data)
            print(f"  已下载: {out_path} ({len(img_data) / 1024:.1f} KB)")

    except urllib.error.HTTPError as e:
        print(f"  HTTP 错误: {e.code} — {e.reason}")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"  连接失败: {e.reason}")
        print(f"  请确保服务器已在 {server} 启动")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="LaiMePet 预处理管线可视化检查工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python tools/inspect_preprocessing.py tests/Geigei01.jpg
  python tools/inspect_preprocessing.py tests/Geigei01.jpg --mode fidelity,enhanced
  python tools/inspect_preprocessing.py tests/Geigei01.jpg --output ./my_inspect/
  python tools/inspect_preprocessing.py --task-id abc123 --server http://localhost:8000
        """,
    )

    parser.add_argument(
        "photo",
        nargs="?",
        help="照片文件路径",
    )
    parser.add_argument(
        "--output", "-o",
        default="./inspect_output",
        help="输出目录（默认: ./inspect_output）",
    )
    parser.add_argument(
        "--mode", "-m",
        default="fidelity,enhanced,minimal",
        help="预处理模式，逗号分隔（默认: fidelity,enhanced,minimal）",
    )
    parser.add_argument(
        "--task-id",
        help="从 API 服务器获取指定任务的预处理产物",
    )
    parser.add_argument(
        "--server",
        default="http://localhost:8000",
        help="API 服务器地址（默认: http://localhost:8000）",
    )

    args = parser.parse_args()

    output_dir = Path(args.output)

    # 模式 1: 从服务器获取
    if args.task_id:
        inspect_from_server(args.task_id, args.server, output_dir)
        return

    # 模式 2: 本地照片检查
    if not args.photo:
        parser.error("需要提供照片路径或 --task-id")

    photo_path = Path(args.photo)
    if not photo_path.exists():
        print(f"[ERROR] 照片不存在: {photo_path}")
        sys.exit(1)

    modes = [m.strip() for m in args.mode.split(",")]

    results = inspect_photo(photo_path, output_dir, modes)

    # 汇总
    print(f"\n{'='*60}")
    print(f"[OK] 检查完成！输出目录: {output_dir.absolute()}")
    print(f"   共生成 {len(results)} 组对比图")
    if any(r.get("scores") for r in results.values()):
        print(f"   [TIP]: fidelity 模式评分最高 = 照片质量好；enhanced 反而降低 = 过度处理")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
