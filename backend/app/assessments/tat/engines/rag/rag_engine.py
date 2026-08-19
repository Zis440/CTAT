"""
RAG (Retrieval-Augmented Generation) Engine for TAT Learning System
=====================================================================
Provides knowledge-grounded retrieval from clinical manuals and scoring guides.
Fully offline, lazy-indexed, with graceful fallback on failure.

Corpus sources (read in-place, never relocated):
  - data/tat_scoring_manual/
  - data/tat_judging_manual/
  - data/remedies_dataset/

Dependencies:
  - sentence-transformers (already in requirements)
  - faiss-cpu (new)
  - pdfplumber / PyPDF2 (already in requirements via pdf_parser.py)
"""

import os
import json
import time
import hashlib
import logging
import pickle
from pathlib import Path
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field, asdict

logger = logging.getLogger(__name__)

@dataclass
class DocumentChunk:
    """A single text chunk from a corpus document."""
    text: str
    source_file: str
    page_number: int
    chunk_index: int
    section: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class RetrievedPassage:
    """A passage returned from similarity search."""
    text: str
    source_file: str
    page_number: int
    similarity_score: float
    section: str = ""
    chunk_index: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

class RAGEngine:
    """
    Retrieval-Augmented Generation engine for the TAT system.

    Ingests clinical PDF documents, chunks them, generates embeddings
    using a local sentence-transformer, indexes with FAISS, and
    retrieves relevant passages for LLM context augmentation.

    All operations are fully offline. Index is built lazily on first
    query and persisted to disk for subsequent sessions.
    """

    def __init__(
        self,
        corpus_dirs: List[Path],
        index_dir: Path,
        embedding_model_name: str = "all-MiniLM-L6-v2",
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        top_k: int = 5,
    ):
        self.corpus_dirs = [Path(d) for d in corpus_dirs]
        self.index_dir = Path(index_dir)
        self.embedding_model_name = embedding_model_name
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.top_k = top_k

        self._embedding_model = None
        self._faiss_index = None
        self._chunks: List[DocumentChunk] = []
        self._index_built = False

        self.index_dir.mkdir(parents=True, exist_ok=True)
        self._index_file = self.index_dir / "faiss_index.bin"
        self._chunks_file = self.index_dir / "chunks.pkl"
        self._manifest_file = self.index_dir / "manifest.json"

        self._query_cache: Dict[str, List[RetrievedPassage]] = {}

        logger.info("RAGEngine created (lazy init, index not yet built)")

    def ensure_index_built(self) -> bool:
        """
        Build or load the FAISS index. Returns True on success.
        Safe to call multiple times (no-op after first build).
        """
        if self._index_built:
            return True

        try:

            if self._load_persisted_index():
                self._index_built = True
                logger.info("RAG index loaded from disk")
                return True

            logger.info("Building RAG index from corpus...")
            start = time.time()

            chunks = self._ingest_all_documents()
            if not chunks:
                logger.warning("No documents found in corpus directories")
                return False

            self._chunks = chunks
            self._build_faiss_index(chunks)
            self._persist_index()
            self._index_built = True

            elapsed = time.time() - start
            logger.info(
                f"RAG index built: {len(chunks)} chunks, "
                f"{elapsed:.1f}s"
            )
            return True

        except Exception as e:
            logger.error(f"RAG index build failed: {e}")
            return False

    def retrieve(
        self, query: str, top_k: Optional[int] = None
    ) -> List[RetrievedPassage]:
        """
        Retrieve top-k most relevant passages for a query.
        Returns empty list on any failure (graceful fallback).
        """
        if not query or not query.strip():
            return []

        k = top_k or self.top_k

        cache_key = f"{query.strip()[:200]}_{k}"
        if cache_key in self._query_cache:
            return self._query_cache[cache_key]

        if not self.ensure_index_built():
            logger.warning("RAG retrieve called but index unavailable")
            return []

        try:
            import faiss
            import numpy as np

            model = self._get_embedding_model()
            query_embedding = model.encode(
                [query], show_progress_bar=False, normalize_embeddings=True
            )
            query_vec = np.array(query_embedding, dtype=np.float32)

            actual_k = min(k, len(self._chunks))
            if actual_k == 0:
                return []

            distances, indices = self._faiss_index.search(query_vec, actual_k)

            passages = []
            for dist, idx in zip(distances[0], indices[0]):
                if idx < 0 or idx >= len(self._chunks):
                    continue
                chunk = self._chunks[idx]
                passages.append(RetrievedPassage(
                    text=chunk.text,
                    source_file=chunk.source_file,
                    page_number=chunk.page_number,
                    similarity_score=float(dist),
                    section=chunk.section,
                    chunk_index=chunk.chunk_index,
                ))

            self._query_cache[cache_key] = passages
            return passages

        except Exception as e:
            logger.error(f"RAG retrieval error: {e}")
            return []

    def format_context(
        self, passages: List[RetrievedPassage], max_chars: int = 2000
    ) -> str:
        """
        Format retrieved passages into a structured context block
        suitable for LLM prompt injection.

        Returns empty string if no passages available.
        """
        if not passages:
            return ""

        lines = ["REFERENCE MATERIAL:"]
        total_chars = 0

        for i, p in enumerate(passages, 1):
            citation = f"[{p.source_file}, p.{p.page_number}]"
            entry = f"\n--- Source {i} {citation} (score: {p.similarity_score:.3f}) ---\n{p.text}"

            if total_chars + len(entry) > max_chars:
                break

            lines.append(entry)
            total_chars += len(entry)

        return "\n".join(lines)

    def format_context_concise(
        self, passages: List[RetrievedPassage], max_chars: int = 800
    ) -> str:
        """
        Format retrieved passages into a shorter context block suitable
        for non-LLM engines (e.g., enriching evidence strings).
        Returns empty string if no passages available.
        """
        if not passages:
            return ""
        lines = []
        total = 0
        for p in passages:
            snippet = p.text[:200].strip()
            entry = f"[{p.source_file}] {snippet}"
            if total + len(entry) > max_chars:
                break
            lines.append(entry)
            total += len(entry)
        return "\n".join(lines)

    DOMAIN_QUERY_PREFIXES = {
        "needs_presses": "Murray need press scoring TAT personality assessment",
        "conflict": "conflict resolution defense mechanism psychological tension TAT",
        "scoring": "TAT scoring psychological assessment judgment interpretation criteria",
        "remedies": "Bhagavad Gita remedy treatment therapeutic intervention mental health",
        "clinical": "TAT manual clinical interpretation thematic apperception personality",
        "defense": "defense mechanism coping strategy psychological adaptation",
    }

    def retrieve_for_domain(
        self, domain: str, query: str, top_k: Optional[int] = None
    ) -> List[RetrievedPassage]:
        """
        Domain-targeted retrieval. Prepends a domain-specific prefix to the
        query to bias FAISS similarity toward the appropriate corpus documents.

        Supported domains: needs_presses, conflict, scoring, remedies, clinical, defense.
        Falls back to standard retrieve() for unknown domains.
        """
        prefix = self.DOMAIN_QUERY_PREFIXES.get(domain, "")
        augmented_query = f"{prefix} {query}".strip() if prefix else query
        return self.retrieve(augmented_query, top_k=top_k)

    def retrieve_from_source(
        self, query: str, source_filter: str, top_k: Optional[int] = None
    ) -> List[RetrievedPassage]:
        """
        Retrieve passages and post-filter to only those from a specific source file.
        Useful for ensuring a feature only gets context from the relevant manual/dataset.

        source_filter: substring matched against passage source_file (case-insensitive).
        """

        k = (top_k or self.top_k) * 3
        all_passages = self.retrieve(query, top_k=k)
        source_lower = source_filter.lower()
        filtered = [
            p for p in all_passages
            if source_lower in p.source_file.lower()
        ]
        return filtered[: (top_k or self.top_k)]

    def get_retrieval_metadata(
        self, passages: List[RetrievedPassage]
    ) -> Dict[str, Any]:
        """Return audit-friendly metadata about a retrieval operation."""
        return {
            "num_passages": len(passages),
            "sources": list(set(p.source_file for p in passages)),
            "scores": [p.similarity_score for p in passages],
            "avg_score": (
                sum(p.similarity_score for p in passages) / len(passages)
                if passages else 0.0
            ),
            "total_chars": sum(len(p.text) for p in passages),
        }

    def get_index_stats(self) -> Dict[str, Any]:
        """Return statistics about the current index."""
        return {
            "index_built": self._index_built,
            "num_chunks": len(self._chunks),
            "corpus_dirs": [str(d) for d in self.corpus_dirs],
            "index_dir": str(self.index_dir),
            "embedding_model": self.embedding_model_name,
            "chunk_size": self.chunk_size,
            "chunk_overlap": self.chunk_overlap,
        }

    def _ingest_all_documents(self) -> List[DocumentChunk]:
        """Ingest all documents from corpus directories."""
        all_chunks: List[DocumentChunk] = []

        for corpus_dir in self.corpus_dirs:
            if not corpus_dir.exists():
                logger.warning(f"Corpus dir not found: {corpus_dir}")
                continue

            for pdf_file in corpus_dir.glob("*.pdf"):
                try:
                    chunks = self._ingest_pdf(pdf_file)
                    all_chunks.extend(chunks)
                    logger.info(
                        f"Ingested {pdf_file.name}: {len(chunks)} chunks"
                    )
                except Exception as e:
                    logger.warning(f"Failed to ingest {pdf_file.name}: {e}")

            for csv_file in corpus_dir.glob("*.csv"):
                try:
                    chunks = self._ingest_csv(csv_file)
                    all_chunks.extend(chunks)
                    logger.info(
                        f"Ingested {csv_file.name}: {len(chunks)} chunks"
                    )
                except Exception as e:
                    logger.warning(f"Failed to ingest {csv_file.name}: {e}")

            for txt_file in corpus_dir.glob("*.txt"):
                try:
                    chunks = self._ingest_text(txt_file)
                    all_chunks.extend(chunks)
                    logger.info(
                        f"Ingested {txt_file.name}: {len(chunks)} chunks"
                    )
                except Exception as e:
                    logger.warning(f"Failed to ingest {txt_file.name}: {e}")

        return all_chunks

    def _ingest_pdf(self, pdf_path: Path) -> List[DocumentChunk]:
        """Extract text from a PDF and chunk it."""
        pages = self._extract_pdf_text(pdf_path)
        chunks: List[DocumentChunk] = []
        chunk_idx = 0

        for page in pages:
            page_text = page.get("text", "")
            if not page_text or len(page_text.strip()) < 20:
                continue

            page_chunks = self._chunk_text(page_text)
            for chunk_text in page_chunks:
                chunks.append(DocumentChunk(
                    text=chunk_text,
                    source_file=pdf_path.name,
                    page_number=page.get("page_number", 0),
                    chunk_index=chunk_idx,
                    section=page.get("section", ""),
                ))
                chunk_idx += 1

        return chunks

    def _extract_pdf_text(self, pdf_path: Path) -> List[Dict]:
        """
        Extract text from PDF using pdfplumber (same approach as
        the existing pdf_parser.py, but lighter-weight).
        """
        pages: List[Dict] = []

        try:
            import pdfplumber

            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    try:
                        text = page.extract_text()
                        if text and len(text.strip()) > 10:
                            pages.append({
                                "page_number": page_num,
                                "text": text.strip(),
                            })
                    except Exception as e:
                        logger.warning(
                            f"PDF page {page_num} extraction failed: {e}"
                        )
        except Exception as e:
            logger.warning(f"PDF open failed for {pdf_path.name}: {e}")

        return pages

    def _ingest_csv(self, csv_path: Path) -> List[DocumentChunk]:
        """Ingest a CSV file by converting rows to text chunks."""
        chunks: List[DocumentChunk] = []

        try:
            import pandas as pd

            df = pd.read_csv(csv_path, encoding="utf-8", on_bad_lines="skip")

            row_texts = []
            for _, row in df.iterrows():

                parts = []
                for col in df.columns:
                    val = row.get(col)
                    if pd.notna(val) and str(val).strip():
                        parts.append(f"{col}: {val}")
                if parts:
                    row_texts.append(". ".join(parts))

            current_text = ""
            chunk_idx = 0
            for row_text in row_texts:
                if len(current_text) + len(row_text) > self.chunk_size:
                    if current_text:
                        chunks.append(DocumentChunk(
                            text=current_text.strip(),
                            source_file=csv_path.name,
                            page_number=1,
                            chunk_index=chunk_idx,
                            section="data",
                        ))
                        chunk_idx += 1
                    current_text = row_text + "\n"
                else:
                    current_text += row_text + "\n"

            if current_text.strip():
                chunks.append(DocumentChunk(
                    text=current_text.strip(),
                    source_file=csv_path.name,
                    page_number=1,
                    chunk_index=chunk_idx,
                ))

        except Exception as e:
            logger.warning(f"CSV ingestion failed for {csv_path.name}: {e}")

        return chunks

    def _ingest_text(self, txt_path: Path) -> List[DocumentChunk]:
        """Ingest a plain text file."""
        chunks: List[DocumentChunk] = []

        try:
            text = txt_path.read_text(encoding="utf-8", errors="ignore")
            text_chunks = self._chunk_text(text)

            for idx, chunk_text in enumerate(text_chunks):
                chunks.append(DocumentChunk(
                    text=chunk_text,
                    source_file=txt_path.name,
                    page_number=1,
                    chunk_index=idx,
                ))

        except Exception as e:
            logger.warning(f"Text ingestion failed for {txt_path.name}: {e}")

        return chunks

    def _chunk_text(self, text: str) -> List[str]:
        """
        Split text into overlapping chunks of approximately chunk_size
        characters, breaking at sentence boundaries where possible.
        """
        if not text or len(text.strip()) < 20:
            return []

        import re
        sentences = re.split(r'(?<=[.!?])\s+', text)

        chunks: List[str] = []
        current_chunk = ""

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            if len(current_chunk) + len(sentence) + 1 > self.chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())

                if self.chunk_overlap > 0 and current_chunk:
                    overlap_text = current_chunk[-self.chunk_overlap:]
                    current_chunk = overlap_text + " " + sentence
                else:
                    current_chunk = sentence
            else:
                if current_chunk:
                    current_chunk += " " + sentence
                else:
                    current_chunk = sentence

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        return chunks

    def _get_embedding_model(self):
        """Lazy-load the sentence transformer model (single load)."""
        if self._embedding_model is None:
            from sentence_transformers import SentenceTransformer
            self._embedding_model = SentenceTransformer(
                self.embedding_model_name
            )
            logger.info(
                f"Embedding model loaded: {self.embedding_model_name}"
            )
        return self._embedding_model

    def _build_faiss_index(self, chunks: List[DocumentChunk]):
        """Generate embeddings and build FAISS index."""
        import faiss
        import numpy as np

        model = self._get_embedding_model()
        texts = [c.text for c in chunks]

        logger.info(f"Generating embeddings for {len(texts)} chunks...")
        embeddings = model.encode(
            texts,
            show_progress_bar=False,
            normalize_embeddings=True,
            batch_size=32,
        )

        embeddings = np.array(embeddings, dtype=np.float32)
        dim = embeddings.shape[1]

        self._faiss_index = faiss.IndexFlatIP(dim)
        self._faiss_index.add(embeddings)

        logger.info(
            f"FAISS index built: {self._faiss_index.ntotal} vectors, "
            f"dim={dim}"
        )

    def _persist_index(self):
        """Save FAISS index and chunks to disk."""
        try:
            import faiss

            faiss.write_index(
                self._faiss_index, str(self._index_file)
            )
            with open(self._chunks_file, "wb") as f:
                pickle.dump(self._chunks, f)

            manifest = {
                "num_chunks": len(self._chunks),
                "embedding_model": self.embedding_model_name,
                "chunk_size": self.chunk_size,
                "chunk_overlap": self.chunk_overlap,
                "corpus_hash": self._compute_corpus_hash(),
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            }
            with open(self._manifest_file, "w") as f:
                json.dump(manifest, f, indent=2)

            logger.info(f"RAG index persisted to {self.index_dir}")

        except Exception as e:
            logger.error(f"Failed to persist RAG index: {e}")

    def _load_persisted_index(self) -> bool:
        """Load FAISS index and chunks from disk. Returns True on success."""
        if not (
            self._index_file.exists()
            and self._chunks_file.exists()
            and self._manifest_file.exists()
        ):
            return False

        try:
            import faiss

            with open(self._manifest_file) as f:
                manifest = json.load(f)

            current_hash = self._compute_corpus_hash()
            if manifest.get("corpus_hash") != current_hash:
                logger.info("Corpus changed since last index, rebuilding...")
                return False

            self._faiss_index = faiss.read_index(str(self._index_file))

            with open(self._chunks_file, "rb") as f:
                self._chunks = pickle.load(f)

            logger.info(
                f"Loaded persisted index: {len(self._chunks)} chunks"
            )
            return True

        except Exception as e:
            logger.warning(f"Failed to load persisted index: {e}")
            return False

    def _compute_corpus_hash(self) -> str:
        """
        Compute a hash of corpus file names and sizes to detect changes.
        """
        hasher = hashlib.sha256()
        for corpus_dir in sorted(self.corpus_dirs):
            if not corpus_dir.exists():
                continue
            for f in sorted(corpus_dir.iterdir()):
                if f.is_file():
                    hasher.update(f.name.encode())
                    hasher.update(str(f.stat().st_size).encode())
        return hasher.hexdigest()[:16]

    def ingest_clinical_note(
        self,
        text: str,
        source: str = "clinician_feedback",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> int:
        """
        Add a clinician's note or feedback to the FAISS index for future retrieval.

        This enables the RAG knowledge base to grow with usage — clinician
        corrections, session observations, and case notes become retrievable
        context for future LLM prompts.

        Parameters
        ----------
        text : str
            The clinical note text to ingest.
        source : str
            Label for the source (e.g., "clinician_feedback", "case_note").
        metadata : dict, optional
            Additional metadata to attach to chunks.

        Returns
        -------
        int
            Number of chunks added to the index.
        """
        if not text or not text.strip():
            return 0

        if not self.ensure_index_built():
            logger.warning("Cannot ingest note: RAG index not available")
            return 0

        try:
            import faiss
            import numpy as np

            chunks_text = self._chunk_text(text)
            if not chunks_text:
                return 0

            new_chunks = []
            base_idx = len(self._chunks)
            for i, chunk_text in enumerate(chunks_text):
                chunk = DocumentChunk(
                    text=chunk_text,
                    source_file=source,
                    page_number=0,
                    chunk_index=base_idx + i,
                    section="clinical_feedback",
                    metadata=metadata or {},
                )
                new_chunks.append(chunk)

            model = self._get_embedding_model()
            embeddings = model.encode(
                [c.text for c in new_chunks],
                show_progress_bar=False,
                normalize_embeddings=True,
            )
            embeddings = np.array(embeddings, dtype=np.float32)

            self._faiss_index.add(embeddings)
            self._chunks.extend(new_chunks)

            self._query_cache.clear()

            self._persist_index()

            logger.info(
                f"RAG: ingested {len(new_chunks)} chunks from {source} "
                f"(total: {len(self._chunks)} chunks)"
            )
            return len(new_chunks)

        except Exception as e:
            logger.error(f"RAG ingestion failed: {e}")
            return 0
