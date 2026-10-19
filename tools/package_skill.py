#!/usr/bin/env python3
"""Build an installable, metadata-only skill bundle; reference media stays in checkout."""
from pathlib import Path
import zipfile
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/uihall-design-skill.zip'
def main():
 OUT.parent.mkdir(exist_ok=True)
 skill=ROOT/'skills/stormy-design'
 with zipfile.ZipFile(OUT,'w',zipfile.ZIP_DEFLATED) as bundle:
  for f in sorted(skill.rglob('*')):
   if f.is_file():bundle.write(f,Path('stormy-design')/f.relative_to(skill))
  # Tools and metadata are bundled for deterministic CLI searches even without
  # a checkout. Image/clip inspection still requires the documented full checkout.
  bundle.write(ROOT/'stormy-mcp/tools.js','stormy-design/scripts/lib/tools.mjs')
  bundle.write(ROOT/'ui-hall/data/corpus.json','stormy-design/corpus.json')
 print('Built dist/uihall-design-skill.zip. No third-party reference media is bundled; clone UiHall for visual inspection.')
if __name__=='__main__':main()
