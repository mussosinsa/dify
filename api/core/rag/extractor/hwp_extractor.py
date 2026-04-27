"""HWP and HWPX text extractors.

Parsing logic ported from rhwp (https://github.com/edwardkim/rhwp), a Rust
implementation of the HWP 5.0 binary and HWPX open-XML formats.
"""

import io
import re
import struct
import xml.etree.ElementTree as ET
import zipfile
import zlib

import olefile

from core.rag.extractor.extractor_base import BaseExtractor
from core.rag.models.document import Document

# HWPTAG_PARA_TEXT = HWPTAG_BEGIN(0x10) + 51 = 67
# See rhwp/src/parser/tags.rs
_HWPTAG_PARA_TEXT = 0x43  # 67


def _is_extended_ctrl_char(ch: int) -> bool:
    """Return True for 16-byte (8 code-unit) control characters.

    Ported from is_extended_ctrl_char() in rhwp/src/parser/body_text.rs.
    Tab(9), line-end(10), and paragraph-end(13) are handled separately.
    """
    return (1 <= ch <= 8) or (11 <= ch <= 12) or (14 <= ch <= 23)


def _parse_para_text(data: bytes) -> str:
    """Parse a HWPTAG_PARA_TEXT record payload into a plain-text string.

    Ported from parse_para_text() in rhwp/src/parser/body_text.rs.

    The record data is UTF-16LE encoded.  Control code-points 0x0000–0x001F
    follow special sizing rules:
    - 0x0009 (tab)          → 16 bytes (8 code units) including extra data
    - 0x000A (line break)   →  2 bytes
    - 0x000D (para end)     → signals end of paragraph text
    - 0x0001-0x0008, 0x000B-0x000C, 0x000E-0x0017, 0x0015-0x0017
                            → 16 bytes (extended control objects)
    - 0x0018–0x001F         →  2 bytes (special spacing characters)
    Regular characters occupy 2 bytes; surrogate pairs 4 bytes.
    """
    parts: list[str] = []
    pos = 0
    n = len(data)

    while pos + 1 < n:
        ch = struct.unpack_from("<H", data, pos)[0]

        if ch == 0x0000:
            pos += 2
        elif ch == 0x0009:  # tab — occupies 16 bytes (extra tab data)
            parts.append("\t")
            pos += 16
        elif ch == 0x000A:  # line break
            parts.append("\n")
            pos += 2
        elif ch == 0x000D:  # paragraph end — stops here
            break
        elif _is_extended_ctrl_char(ch):  # 16-byte object placeholder
            # 0x0012 = hard hyphen shown as space in rendered text
            if ch == 0x0012:
                parts.append(" ")
            pos += 16
        elif ch < 0x0020:  # 2-byte special spacing characters
            if ch == 0x0018:    # non-breaking space
                parts.append(" ")
            elif ch == 0x0019:  # fixed-width space
                parts.append(" ")
            elif ch == 0x001E:  # soft hyphen
                parts.append("-")
            elif ch == 0x001F:  # figure space
                parts.append(" ")
            pos += 2
        else:
            # Surrogate pair → code point beyond BMP
            if 0xD800 <= ch <= 0xDBFF and pos + 3 < n:
                low = struct.unpack_from("<H", data, pos + 2)[0]
                if 0xDC00 <= low <= 0xDFFF:
                    code_point = 0x10000 + ((ch - 0xD800) << 10) + (low - 0xDC00)
                    parts.append(chr(code_point))
                    pos += 4
                    continue
            parts.append(chr(ch))
            pos += 2

    return "".join(parts)


def _decompress_stream(data: bytes) -> bytes:
    """Decompress a HWP body-text stream.

    HWP uses raw deflate (wbits=-15).  Falls back to standard zlib.
    Ported from decompress_stream() in rhwp/src/parser/cfb_reader.rs.
    """
    try:
        return zlib.decompress(data, -15)  # raw deflate
    except zlib.error:
        return zlib.decompress(data)       # standard zlib


def _parse_records(data: bytes) -> list[tuple[int, int, bytes]]:
    """Parse HWP binary records and return (tag_id, level, payload) tuples.

    4-byte LE record header layout (rhwp/src/parser/record.rs):
      bits  0– 9 : tag_id
      bits 10–19 : level (nesting depth)
      bits 20–31 : size  (0xFFF → read next 4 bytes for true size)
    """
    records: list[tuple[int, int, bytes]] = []
    pos = 0
    n = len(data)

    while pos + 4 <= n:
        header = struct.unpack_from("<I", data, pos)[0]
        pos += 4

        tag_id = header & 0x3FF
        level = (header >> 10) & 0x3FF
        size = header >> 20

        if size == 0xFFF:
            if pos + 4 > n:
                break
            size = struct.unpack_from("<I", data, pos)[0]
            pos += 4

        if pos + size > n:
            break

        records.append((tag_id, level, data[pos : pos + size]))
        pos += size

    return records


def extract_hwp_text(source: str | bytes | io.IOBase) -> str:
    """Extract plain text from an HWP 5.x binary document.

    *source* can be a file path string, raw bytes, or a file-like object.

    Algorithm (from rhwp/src/parser/cfb_reader.rs + body_text.rs):
    1. Open OLE2 compound document with olefile.
    2. Read FileHeader flags to determine compression.
    3. Iterate BodyText/Section* streams (fall back to root Section* for
       older files).
    4. Decompress each stream with raw deflate.
    5. Parse binary records; for HWPTAG_PARA_TEXT (tag 67) extract UTF-16LE.
    """
    if isinstance(source, str):
        ole_src: str | io.BytesIO = source
    elif isinstance(source, (bytes, bytearray)):
        ole_src = io.BytesIO(source)
    else:
        ole_src = io.BytesIO(source.read())  # type: ignore[arg-type]

    paragraphs: list[str] = []

    with olefile.OleFileIO(ole_src) as ole:
        # Check compression flag in FileHeader (bit 0 of the flags DWORD at
        # offset 36).  Absent FileHeader → assume compressed (most files are).
        compressed = True
        if ole.exists("FileHeader"):
            hdr = ole.openstream("FileHeader").read()
            if len(hdr) >= 40:
                flags = struct.unpack_from("<I", hdr, 36)[0]
                compressed = bool(flags & 0x01)

        # Collect BodyText/Section* streams, then fall back to root Section*.
        all_entries = ole.listdir()
        section_paths: list[str] = []

        for entry in all_entries:
            joined = "/".join(entry)
            if len(entry) == 2 and entry[0] == "BodyText" and entry[1].startswith("Section"):
                section_paths.append(joined)

        if not section_paths:
            for entry in all_entries:
                if len(entry) == 1 and entry[0].startswith("Section"):
                    section_paths.append(entry[0])

        section_paths.sort()

        for path in section_paths:
            try:
                raw = ole.openstream(path).read()
                data = _decompress_stream(raw) if compressed else raw
                for tag_id, _level, payload in _parse_records(data):
                    if tag_id == _HWPTAG_PARA_TEXT:
                        text = _parse_para_text(payload)
                        if text.strip():
                            paragraphs.append(text)
            except Exception:
                continue  # skip malformed sections

    return "\n".join(paragraphs)


def extract_hwpx_text(source: str | bytes | io.IOBase) -> str:
    """Extract plain text from an HWPX document (ZIP-based XML format).

    Algorithm (from rhwp/src/parser/hwpx/section.rs):
    - Open as ZIP archive.
    - Read Contents/section*.xml files in order.
    - Collect text from all <hp:t> elements (namespace-agnostic local-name match).
    """
    if isinstance(source, str):
        zip_src: str | io.BytesIO = source
    elif isinstance(source, (bytes, bytearray)):
        zip_src = io.BytesIO(source)
    else:
        zip_src = io.BytesIO(source.read())  # type: ignore[arg-type]

    texts: list[str] = []

    with zipfile.ZipFile(zip_src) as zf:
        section_files = sorted(
            f for f in zf.namelist() if re.match(r"Contents/section\d+\.xml", f)
        )
        if not section_files:
            section_files = sorted(
                f for f in zf.namelist() if f.endswith(".xml") and "section" in f.lower()
            )

        for name in section_files:
            with zf.open(name) as f:
                root = ET.parse(f).getroot()
                for elem in root.iter():
                    local = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
                    if local == "t" and elem.text:
                        texts.append(elem.text)

    return "\n".join(filter(None, texts))


class HwpExtractor(BaseExtractor):
    """Extract text from HWP 5.x binary files.

    The api_url / api_key parameters are accepted for interface compatibility
    but are not used; extraction is performed natively via OLE2 + record parsing.
    """

    def __init__(self, file_path: str, api_url: str = "", api_key: str = "") -> None:
        self._file_path = file_path

    def extract(self) -> list[Document]:
        content = extract_hwp_text(self._file_path)
        return [Document(page_content=content, metadata={"source": self._file_path})]


class HwpxExtractor(BaseExtractor):
    """Extract text from HWPX files (ZIP/XML format)."""

    def __init__(self, file_path: str) -> None:
        self._file_path = file_path

    def extract(self) -> list[Document]:
        content = extract_hwpx_text(self._file_path)
        return [Document(page_content=content, metadata={"source": self._file_path})]
