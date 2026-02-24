"""
Multimodal RAG Router - Monk OS v4 (Fixed + Enhanced)
??????????????????????????????????????????????????
Fixes:
  [BUG] LangGraph TypedDict cannot pass LocalVectorStore objects between
        nodes - they are silently dropped, resulting in empty context.
  [FIX] Nodes now look up the store from the global `sessions` dict via
        session_id (a plain string, safe in TypedDict state).

Stack:
  * PyMuPDF              - PDF text extraction + page rendering
  * Gemini Vision        - image understanding (fallback)
  * scikit-learn TF-IDF  - local embeddings, zero API calls for text
  * BM25 re-rank         - keyword boosting on top of cosine sim
  * Mistral (Ollama)     - fully local LLM synthesis
  * Gemini 2.5 Flash     - synthesis fallback if Ollama OOMs
  * LangChain            - document splitting
  * LangGraph            - multi-step reasoning (classify->retrieve->synthesise)
"""

import io, os, uuid, math, base64, time
from typing import List, TypedDict

# -- FastAPI ------------------------------------------------------------
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
from PIL import Image as PILImage

# -- PDF ----------------------------------------------------------------
import fitz   # PyMuPDF

# -- LangChain ----------------------------------------------------------
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

# -- LangGraph ----------------------------------------------------------
from langgraph.graph import StateGraph, END

# -- Local retrieval (sklearn + numpy) ---------------------------------
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# -- Ollama (local LLM) ------------------------------------------------
import requests as _req

# -- Groq (text synthesis + vision) --------------------------------------
import groq
# Get a free key at https://console.groq.com -> API Keys
GROQ_KEY   = os.getenv("GROQ_API_KEY")
GROQ_MODEL = "llama-3.1-8b-instant"          # fast reasoning model
GROQ_VISION_MODEL = "meta-llama/llama-4-maverick-17b-128e-instruct" # active multimodal model
# GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions" # handled by SDK now

router = APIRouter()

OLLAMA        = "http://localhost:11434"
MODEL         = "mistral:latest"
MAX_CTX_CHARS = 4000   # safe for Mistral 7B

# ----------------------------------------------------------------------
# Session store - keyed by session_id (string, safe in LangGraph state)
# ----------------------------------------------------------------------
sessions: dict = {}  # session_id -> { store, filename, type, pages, chunks }

# Debug log - ring buffer of last 100 events
_dbg: list = []
def _log(tag: str, msg: str):
    ts = time.strftime("%H:%M:%S")
    entry = f"[{ts}] [{tag}] {msg}"
    print(entry)
    _dbg.append(entry)
    if len(_dbg) > 100: _dbg.pop(0)

# ----------------------------------------------------------------------
# LLM helpers
# ----------------------------------------------------------------------

def _ollama_chat(system: str, question: str) -> tuple[str, float]:
    if len(system) > MAX_CTX_CHARS:
        system = system[:MAX_CTX_CHARS] + "\n...[context trimmed for model safety]..."
        _log("OLLAMA", f"WARN Context trimmed to {MAX_CTX_CHARS} chars")
    t0 = time.perf_counter()
    try:
        r = _req.post(f"{OLLAMA}/api/generate", json={
            "model": MODEL, "prompt": question,
            "system": system, "stream": False,
            "options": {"temperature": 0.2, "num_ctx": 4096}
        }, timeout=3)
        r.raise_for_status()
        elapsed = round(time.perf_counter() - t0, 2)
        _log("OLLAMA", f"OK {elapsed}s - {len(r.json().get('response','').strip())} chars")
        return r.json().get("response", "").strip(), elapsed
    except Exception as e:
        _log("OLLAMA", f"FAIL {e}")
        raise RuntimeError(f"Ollama: {e}")

def _groq_vision(prompt: str, base64_image: str, mime_type: str) -> tuple[str, float]:
    if not GROQ_KEY:
        raise RuntimeError("GROQ_API_KEY not set")
        
    t0 = time.perf_counter()
    image_url = f"data:{mime_type};base64,{base64_image}"
    client = groq.Groq(api_key=GROQ_KEY)
    
    # 3 retry attempts for 429 rate limits
    for attempt in range(3):
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image_url,
                                },
                            },
                        ],
                    }
                ],
                model=GROQ_VISION_MODEL,
                temperature=0.1,
                max_tokens=1024,
            )
            
            text = chat_completion.choices[0].message.content.strip()
            elapsed = round(time.perf_counter() - t0, 2)
            _log("GROQ_VISION", f"OK {elapsed}s - {len(text)} chars (attempt {attempt+1})")
            return text, elapsed
            
        except groq.RateLimitError as e:
            wait_time = 5 # Default wait
            _log("GROQ_VISION", f"WARN rate limit - waiting {wait_time}s (attempt {attempt+1}/3)")
            time.sleep(wait_time)
            continue
        except Exception as e:
            if attempt == 2:
                _log("GROQ_VISION", f"FAIL {e}")
                raise RuntimeError(f"Groq API Error: {e}")
            time.sleep(2)
            
    raise RuntimeError("Groq Vision: exceeded 3 retry attempts")

def _groq_chat(system: str, question: str) -> tuple[str, float]:
    # Groq free-tier synthesis - 14,400 req/day, 250 tok/s.
    if not GROQ_KEY:
        raise RuntimeError("GROQ_API_KEY not set")
    if len(system) > MAX_CTX_CHARS:
        system = system[:MAX_CTX_CHARS] + "\n...[context trimmed]..."
    t0 = time.perf_counter()
    client = groq.Groq(api_key=GROQ_KEY)
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": question},
            ],
            model=GROQ_MODEL,
            temperature=0.2,
            max_tokens=1024,
        )
        text = chat_completion.choices[0].message.content.strip()
        elapsed = round(time.perf_counter() - t0, 2)
        _log("GROQ", f"OK {elapsed}s - {len(text)} chars")
        return text, elapsed
    except Exception as e:
        _log("GROQ", f"FAIL {e}")
        raise RuntimeError(f"Groq: {e}")

def _answer(system: str, question: str) -> tuple[str, str, float]:
    # 2-tier synthesis chain:
    #   1. Ollama/Mistral  - local, private, zero quota
    #   2. Groq/Llama-3.1  - free cloud, extremely fast
    
    # Tier 1: Ollama
    try:
        text, t = _ollama_chat(system, question)
        return text, f"Ollama/{MODEL}", t
    except Exception as e:
        _log("ANSWER", f"Ollama failed ({e}), trying Groq...")

    # Tier 2: Groq
    text, t = _groq_chat(system, question)
    return text, f"Groq/{GROQ_MODEL}", t

# ----------------------------------------------------------------------
# Local TF-IDF + BM25 vector store
# ----------------------------------------------------------------------

class LocalVectorStore:
    def __init__(self, docs: List[Document]):
        self.docs  = docs
        self.texts = [d.page_content for d in docs]
        self.tfidf = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True,
                                      min_df=1, max_features=20_000)
        self.mat   = self.tfidf.fit_transform(self.texts)
        print(f"[RAG] Indexed {len(self.texts)} chunks, {self.mat.shape[1]} features")

    def search(self, query: str, k: int = 4) -> List[Document]:
        if not query.strip():
            return self.docs[:k]
        q_vec  = self.tfidf.transform([query])
        scores = cosine_similarity(q_vec, self.mat).flatten()
        q_words = set(query.lower().split())
        bm25    = np.array([
            sum(t.lower().count(w) for w in q_words) / (1 + math.log1p(len(t.split())))
            for t in self.texts
        ])
        combined = scores + 0.3 * bm25
        topk     = np.argsort(combined)[::-1][:k]
        results  = [self.docs[i] for i in topk if combined[i] > 0.001]
        # fallback: return all docs if nothing scored
        return results if results else self.docs[:k]

# ----------------------------------------------------------------------
# Document extraction
# ----------------------------------------------------------------------

def _extract_pdf(data: bytes) -> List[Document]:
    """
    100% LOCAL - zero Gemini API calls.
    Strategy:
      1. PyMuPDF direct text extraction (fast, accurate for text PDFs)
      2. For image-heavy pages (< 20 chars): try pytesseract OCR (local)
      3. Final fallback: layout blocks text join
    """

    pdf  = fitz.open(stream=data, filetype="pdf")
    docs = []
    for n, page in enumerate(pdf, 1):
        text = page.get_text().strip()

        if len(text) < 20:
            # Try pytesseract first (fully local OCR)
            try:
                import pytesseract
                from PIL import Image as PILImage
                pix    = page.get_pixmap(dpi=150)
                img    = PILImage.frombytes("RGB", [pix.width, pix.height], pix.samples)
                text   = pytesseract.image_to_string(img).strip()
                if text:
                    _log("PDF", f"Page {n}: OCR extracted {len(text)} chars")
            except Exception as ocr_err:
                _log("PDF", f"Page {n}: OCR unavailable ({ocr_err.__class__.__name__}), using layout blocks")
                text = ""

        if len(text) < 10:
            # Layout block fallback - grab any text fragments from the page structure
            blocks = page.get_text("blocks")
            text   = " ".join(
                str(b[4]).strip() for b in blocks
                if len(b) > 4 and str(b[4]).strip()
            ).strip()

        if not text:
            text = f"[Page {n}: image-only - no extractable text. Ask about visible content.]"

        docs.append(Document(
            page_content=f"[PAGE {n}]\n{text}",
            metadata={"page": n, "source": "pdf"}
        ))
    pdf.close()
    _log("PDF", f"Extracted {len(docs)} pages (0 Gemini calls)")
    return docs

def _extract_image(data: bytes, mime: str) -> List[Document]:
    # Image files: compress/resize and then call Groq Vision. Wrapped with 429 retry.
    prompt = "Analyse this image comprehensively. Extract ALL visible text, labels, figures, charts, tables, diagrams, arrows, annotations and structural elements. Structure your analysis clearly."
    
    try:
        # Preprocess image for Groq (Max 4MB, standard jpeg/png works best)
        img = PILImage.open(io.BytesIO(data))
        if img.mode != 'RGB':
             img = img.convert('RGB')
             
        # Resize to max 2048x2048 while preserving aspect ratio
        img.thumbnail((2048, 2048))
        
        # Save back to bytes as JPEG
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=85)
        out.seek(0)
        
        # Encode
        b64  = base64.b64encode(out.read()).decode()
        safe_mime = "image/jpeg"
        
        text, t = _groq_vision(prompt, b64, safe_mime)
        return [Document(page_content=text, metadata={"page": 1, "source": "image"})]
    except Exception as e:
        _log("GROQ_VISION", f"FAIL image vision error: {e}")
        return [Document(
            page_content="[Image uploaded - Groq Vision unavailable. Describe what's in the image to ask questions about it.]",
            metadata={"page": 1, "source": "image"}
        )]

# ----------------------------------------------------------------------
# LangGraph - FIXED: session_id in state (not store object)
# ----------------------------------------------------------------------

class RAGState(TypedDict):
    session_id:  str      # safe string key into global sessions dict
    question:    str
    q_type:      str
    context:     str
    answer:      str
    model_used:  str      # debug: which LLM answered
    chunk_count: int      # debug: how many chunks retrieved
    ctx_chars:   int      # debug: context length sent to LLM
    t_classify:  float    # debug: node timings (seconds)
    t_retrieve:  float
    t_synthesise:float

def _node_classify(state: RAGState) -> RAGState:
    t0 = time.perf_counter()
    q  = state["question"].lower()
    if any(w in q for w in ("code", "script", "program", "function", "write", "debug", "python", "javascript", "react", "html")):
        qt = "coding"
    elif any(w in q for w in ("summar", "overview", "what is", "tldr", "describe", "explain the doc")):
        qt = "summarisation"
    elif any(w in q for w in ("why", "how does", "explain how", "analyse", "compare", "impact", "differ", "opinion", "think")):
        qt = "analytical"
    else:
        qt = "factual"
    elapsed = round(time.perf_counter() - t0, 4)
    _log("CLASSIFY", f"Q: '{state['question'][:60]}' -> {qt} ({elapsed}s)")
    return {**state, "q_type": qt, "t_classify": elapsed}

def _node_retrieve(state: RAGState) -> RAGState:
    # Look up store from global sessions dict - avoids TypedDict object serialization.
    t0      = time.perf_counter()
    session = sessions.get(state["session_id"])
    if not session:
        _log("RETRIEVE", "FAIL Session not found")
        return {**state, "context": "[Session not found - please re-upload the document]",
                "chunk_count": 0, "ctx_chars": 0, "t_retrieve": 0.0}

    store  = session["store"]
    k      = 3 if state["q_type"] == "summarisation" else 4
    chunks = store.search(state["question"], k=k)
    ctx    = "\n\n-----\n\n".join(c.page_content for c in chunks)

    if not ctx.strip():
        _log("RETRIEVE", f"WARN Zero scores - using first {k} raw chunks as fallback")
        ctx = "\n\n-----\n\n".join(d.page_content for d in store.docs[:k])

    if len(ctx) > MAX_CTX_CHARS:
        _log("RETRIEVE", f"WARN Trimming context {len(ctx)} -> {MAX_CTX_CHARS} chars")
        ctx = ctx[:MAX_CTX_CHARS] + "\n?[context trimmed]?"

    elapsed = round(time.perf_counter() - t0, 3)
    _log("RETRIEVE", f"OK {len(chunks)} chunk(s), {len(ctx)} chars ({elapsed}s)")
    return {**state, "context": ctx, "chunk_count": len(chunks),
            "ctx_chars": len(ctx), "t_retrieve": elapsed}

def _node_synthesise(state: RAGState) -> RAGState:
    styles = {
        "factual": (
            "Answer directly based on the document, but add your customized perspective. "
            "Rephrase everything in your own words - NEVER copy verbatim. "
            "If the document doesn't explicitly say, offer your reasoned expert opinion."
        ),
        "analytical": (
            "Think step-by-step and show your reasoning. Draw insights, explain causality and connections. "
            "Provide analytical depth and aggressively insert your own expert opinion where relevant. "
            "Structure your response logically with clear formatting."
        ),
        "summarisation": (
            "Write a clear, structured summary with sections/headings where helpful. "
            "Use flowing prose - absolutely no copy-paste from the source. "
            "Include a brief 'Expert Take' or critical opinion on the summarized content at the end."
        ),
        "coding": (
            "You are an elite software engineer. Provide robust, clean code using modern best practices. "
            "Explain your reasoning for the design choices. Use markdown code blocks. "
            "Offer your opinion on potential optimizations and alternative architectural approaches."
        )
    }
    style  = styles.get(state["q_type"], styles["factual"])
    ctx    = state["context"]

    if not ctx.strip() or "session not found" in ctx.lower():
        return {**state, "answer": "WARN No document context available. Please re-upload the file.",
                "model_used": "none", "t_synthesise": 0.0}

    system = (
        f"You are an expert document analyst and AI assistant. {style}\n\n"
        f"??? DOCUMENT CONTEXT ???\n{ctx}\n???????????????????????"
    )
    t0 = time.perf_counter()
    answer, model_used, _ = _answer(system, state["question"])
    elapsed = round(time.perf_counter() - t0, 2)
    _log("SYNTHESISE", f"OK {model_used} - {len(answer)} chars ({elapsed}s)")
    return {**state, "answer": answer, "model_used": model_used, "t_synthesise": elapsed}

def _build_graph():
    g = StateGraph(RAGState)
    g.add_node("classify",   _node_classify)
    g.add_node("retrieve",   _node_retrieve)
    g.add_node("synthesise", _node_synthesise)
    g.set_entry_point("classify")
    g.add_edge("classify",   "retrieve")
    g.add_edge("retrieve",   "synthesise")
    g.add_edge("synthesise", END)
    return g.compile()

rag_graph = _build_graph()
splitter  = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)

# ----------------------------------------------------------------------
# Upload endpoint
# ----------------------------------------------------------------------

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    data     = await file.read()
    filename = file.filename or "document"
    mime     = file.content_type or ""
    sid      = str(uuid.uuid4())[:12]

    try:
        print(f"[RAG] Upload: {filename} ({mime})")
        if mime == "application/pdf" or filename.lower().endswith(".pdf"):
            pages    = _extract_pdf(data)
            doc_type = "pdf"
        elif mime.startswith("image/"):
            pages    = _extract_image(data, mime)
            doc_type = "image"
        else:
            raise HTTPException(415, detail=f"Unsupported type: {mime}. Use PDF or image.")

        chunks = splitter.split_documents(pages)
        store  = LocalVectorStore(chunks)

        # Store in global dict - NOT in LangGraph state
        sessions[sid] = {
            "store":    store,
            "filename": filename,
            "type":     doc_type,
            "pages":    len(pages),
            "chunks":   len(chunks),
        }

        preview = pages[0].page_content[:500].strip()
        print(f"[RAG] OK {filename} -> {len(pages)} pages, {len(chunks)} chunks indexed")
        return {
            "success":    True,
            "session_id": sid,
            "filename":   filename,
            "type":       doc_type,
            "pages":      len(pages),
            "chunks":     len(chunks),
            "preview":    preview + ("?" if len(preview) >= 500 else "")
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(500, detail=f"Processing failed: {e}")

# ----------------------------------------------------------------------
# Query endpoint
# ----------------------------------------------------------------------

class QueryRequest(BaseModel):
    session_id: str
    question:   str

@router.post("/query")
async def query_document(req: QueryRequest):
    if req.session_id not in sessions:
        raise HTTPException(404, detail="Session expired - please re-upload the document.")
    t_total = time.perf_counter()
    try:
        result = rag_graph.invoke({
            "session_id":  req.session_id,
            "question":    req.question,
            "q_type":      "",
            "context":     "",
            "answer":      "",
            "model_used":  "",
            "chunk_count": 0,
            "ctx_chars":   0,
            "t_classify":  0.0,
            "t_retrieve":  0.0,
            "t_synthesise":0.0,
        })
        total = round(time.perf_counter() - t_total, 2)
        _log("QUERY", f"Done in {total}s - {result.get('model_used','?')} - q_type={result.get('q_type','?')}")
        return {
            "answer":      result["answer"],
            "q_type":      result["q_type"],
            "filename":    sessions[req.session_id]["filename"],
            "debug": {
                "model":      result.get("model_used", "?"),
                "chunks":     result.get("chunk_count", 0),
                "ctx_chars":  result.get("ctx_chars", 0),
                "t_total_s":  total,
                "t_classify": result.get("t_classify", 0),
                "t_retrieve": result.get("t_retrieve", 0),
                "t_synth":    result.get("t_synthesise", 0),
            }
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(500, detail=f"Query failed: {e}")

@router.get("/sessions")
def list_sessions():
    return {
        sid: {"filename": s["filename"], "type": s["type"], "chunks": s["chunks"]}
        for sid, s in sessions.items()
    }

@router.get("/debug/logs")
def debug_logs():
    # Return the last 100 debug log entries.
    return {"logs": list(reversed(_dbg)), "count": len(_dbg)}

@router.get("/debug/session/{sid}")
def debug_session(sid: str):
    # Inspect a specific session metadata.
    session = sessions.get(sid)
    if not session:
        raise HTTPException(404, detail="Session not found")
    store = session["store"]
    return {
        "session_id":  sid,
        "filename":    session["filename"],
        "type":        session["type"],
        "pages":       session["pages"],
        "chunks":      session["chunks"],
        "tfidf_features": int(store.mat.shape[1]),
        "sample_chunks": [c.page_content[:200] for c in store.docs[:3]],
    }
