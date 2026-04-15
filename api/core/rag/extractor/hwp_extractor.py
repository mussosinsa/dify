"""Extractors for HWP and HWPX (Hangul Word Processor) file formats."""

import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

from core.rag.extractor.extractor_base import BaseExtractor
from core.rag.models.document import Document


class HwpxExtractor(BaseExtractor):
    """Extract text from HWPX files (ZIP-based XML format).

    HWPX is the XML-based format for Hangul Word Processor documents.
    It is a ZIP archive containing section XML files with text content.
    """

    def __init__(self, file_path: str) -> None:
        self._file_path = file_path

    def extract(self) -> list[Document]:
        content = self._extract_text()
        return [Document(page_content=content, metadata={"source": self._file_path})]

    def _extract_text(self) -> str:
        texts: list[str] = []
        try:
            with zipfile.ZipFile(self._file_path) as zf:
                section_files = sorted(
                    [f for f in zf.namelist() if re.match(r"Contents/section\d+\.xml", f)]
                )
                # Fallback: look for any section XML if standard path not found
                if not section_files:
                    section_files = sorted(
                        [f for f in zf.namelist() if f.endswith(".xml") and "section" in f.lower()]
                    )

                for section_file in section_files:
                    with zf.open(section_file) as f:
                        root = ET.parse(f).getroot()
                        for elem in root.iter():
                            # Strip XML namespace prefix to get local tag name
                            local = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
                            if local == "t" and elem.text:
                                texts.append(elem.text)

        except zipfile.BadZipFile as e:
            raise ValueError(f"Not a valid HWPX file (bad ZIP): {self._file_path}") from e
        except ET.ParseError as e:
            raise ValueError(f"Failed to parse HWPX XML content: {self._file_path}") from e

        return "\n".join(filter(None, texts))


class HwpExtractor(BaseExtractor):
    """Extract text from HWP binary files via the Unstructured API.

    HWP is the legacy binary compound-document format for Hangul Word Processor.
    Text extraction requires the Unstructured API (UNSTRUCTURED_API_URL must be set).
    """

    def __init__(self, file_path: str, api_url: str, api_key: str = "") -> None:
        self._file_path = file_path
        self._api_url = api_url
        self._api_key = api_key

    def extract(self) -> list[Document]:
        import os
        import tempfile

        from unstructured.partition.api import partition_via_api

        from configs import dify_config

        try:
            with tempfile.NamedTemporaryFile(suffix=Path(self._file_path).suffix, delete=False) as tmp:
                tmp.write(Path(self._file_path).read_bytes())
                tmp.flush()
                tmp_path = tmp.name

            try:
                with open(tmp_path, "rb") as file:
                    elements = partition_via_api(
                        file=file,
                        metadata_filename=tmp_path,
                        api_url=self._api_url,
                        api_key=self._api_key or dify_config.UNSTRUCTURED_API_KEY or "",
                    )
            finally:
                os.unlink(tmp_path)

        except Exception as e:
            raise ValueError(f"Failed to extract text from HWP via Unstructured API: {e}") from e

        from unstructured.chunking.title import chunk_by_title

        from configs import dify_config as _cfg

        max_chars = _cfg.INDEXING_MAX_SEGMENTATION_TOKENS_LENGTH
        chunks = chunk_by_title(elements, max_characters=max_chars, combine_text_under_n_chars=max_chars)
        return [Document(page_content=chunk.text.strip()) for chunk in chunks if chunk.text.strip()]
