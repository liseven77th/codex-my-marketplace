#!/usr/bin/env python3
"""Generate one measured Edge TTS narration file per demo/storyboard section.

Requires Python 3.9+, edge-tts, ffmpeg/ffprobe on PATH, and network access to the
Microsoft Edge TTS service. Default Chinese voice: zh-CN-XiaoxiaoNeural.
"""
from __future__ import annotations
import argparse
import asyncio
import json
import shutil
import subprocess
import sys
from pathlib import Path

DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural"

def probe_duration(path: Path) -> float:
    if not shutil.which("ffprobe"):
        raise RuntimeError("ffprobe not found. Install FFmpeg and add its bin directory to PATH.")
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    duration = float(result.stdout.strip())
    if duration <= 0:
        raise RuntimeError(f"ffprobe returned an invalid duration for {path}")
    return duration

async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", default=".")
    parser.add_argument("--voice", default=DEFAULT_VOICE)
    parser.add_argument("--rate", default="+0%")
    parser.add_argument("--pitch", default="+0Hz")
    parser.add_argument("--volume", default="+0%")
    parser.add_argument("--section", action="append", help="Section id; repeat to select multiple")
    parser.add_argument("--list-voices", action="store_true")
    args = parser.parse_args()

    try:
        import edge_tts
    except ImportError:
        print("edge-tts is missing. Install with: python -m pip install --upgrade edge-tts", file=sys.stderr)
        return 2

    if args.list_voices:
        voices = await edge_tts.list_voices()
        for voice in voices:
            if voice.get("Locale", "").lower().startswith("zh"):
                print(f'{voice.get("ShortName")}\t{voice.get("Gender")}\t{voice.get("FriendlyName")}')
        return 0

    project = Path(args.project).resolve()
    demo = project / "demo"
    storyboard_path = demo / "storyboard.json"
    if not storyboard_path.exists():
        print(f"Storyboard not found: {storyboard_path}", file=sys.stderr)
        return 2

    storyboard = json.loads(storyboard_path.read_text(encoding="utf-8-sig"))
    selected = set(args.section or [])
    sections = [
        section for section in storyboard.get("sections", [])
        if str(section.get("voiceover", "")).strip()
        and (not selected or section.get("id") in selected)
    ]
    if not sections:
        print("No narration sections matched.")
        return 0

    audio_dir = demo / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    manifest = []
    for section in sections:
        section_id = section["id"]
        output = audio_dir / f"{section_id}.mp3"
        print(f"[Edge TTS] {section_id} -> {output.name} ({args.voice})")
        communicate = edge_tts.Communicate(
            text=str(section["voiceover"]).strip(),
            voice=args.voice,
            rate=args.rate,
            pitch=args.pitch,
            volume=args.volume,
        )
        await communicate.save(str(output))
        duration = probe_duration(output)
        sidecar = {
            "id": section_id,
            "file": f"audio/{output.name}",
            "durationSeconds": round(duration, 3),
            "provider": "edge-tts",
            "voiceId": args.voice,
            "rate": args.rate,
            "pitch": args.pitch,
            "volume": args.volume,
        }
        (audio_dir / f"{section_id}.json").write_text(
            json.dumps(sidecar, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        manifest.append(sidecar)
        print(f"  measured {duration:.2f}s")

    (audio_dir / "voice-manifest.json").write_text(
        json.dumps({"provider": "edge-tts", "voiceId": args.voice, "sections": manifest}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Generated {len(manifest)} narration file(s). Reconcile the timeline before rendering.")
    return 0

if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
