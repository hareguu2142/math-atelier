"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, CircleDashed, Copy, Download, Grid2X2, LayoutList, Loader2, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import { Markdown } from "./markdown";
import type { Problem, ProblemInput, Solution } from "@/lib/types";

type EditorState =
  | { kind: "problem"; value: ProblemInput; id?: string }
  | { kind: "solution"; title: string; contentMarkdown: string; problemId: string; id?: string };

const blank: ProblemInput = { title: "", problemMarkdown: "", difficulty: 2, tags: [] };
const FAVORITES_KEY = "math-atelier-favorites";
const LEGACY_SOLVED_KEY = "math-atelier-solved";
const PROBLEMS_PER_PAGE = 12;
type SolutionStatusFilter = "all" | "unsolved" | "solved";

export default function MathLibrary() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selected, setSelected] = useState<Problem | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Problem | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<Set<string>>(new Set());
  const [pendingSolvedIds, setPendingSolvedIds] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [solutionStatusFilter, setSolutionStatusFilter] = useState<SolutionStatusFilter>("all");
  const [page, setPage] = useState(1);
  const libraryRef = useRef<HTMLElement>(null);
  const migratedLegacyFavorites = useRef(false);
  const migratedLegacySolved = useRef(false);

  const refresh = useCallback(async (q: string, selectedId?: string) => {
    setLoading(true);
    const res = await fetch(`/api/problems?q=${encodeURIComponent(q)}`, { cache: "no-store" });
    const data: Problem[] = await res.json();
    setProblems(data);
    if (selectedId) setSelected(data.find((p) => p.id === selectedId) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/problems?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      setProblems(await res.json());
      setLoading(false);
    }, query ? 220 : 0);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const syncFromDatabase = () => void refresh(query, selected?.id);
    window.addEventListener("focus", syncFromDatabase);
    return () => window.removeEventListener("focus", syncFromDatabase);
  }, [query, refresh, selected?.id]);

  useEffect(() => {
    if (loading || migratedLegacySolved.current) return;
    migratedLegacySolved.current = true;

    let legacyIds: string[] = [];
    try {
      const stored = JSON.parse(localStorage.getItem(LEGACY_SOLVED_KEY) ?? "[]");
      legacyIds = Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
    } catch {
      localStorage.removeItem(LEGACY_SOLVED_KEY);
      return;
    }
    if (legacyIds.length === 0) {
      localStorage.removeItem(LEGACY_SOLVED_KEY);
      return;
    }

    void Promise.all(legacyIds.map(async (id) => {
      const res = await fetch("/api/problems", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, solved: true }),
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed to migrate solved state");
    })).then(() => {
      localStorage.removeItem(LEGACY_SOLVED_KEY);
      return refresh(query, selected?.id);
    }).catch(() => {
      migratedLegacySolved.current = false;
    });
  }, [loading, query, refresh, selected?.id]);

  useEffect(() => {
    if (loading || migratedLegacyFavorites.current) return;
    migratedLegacyFavorites.current = true;

    let legacyIds: string[] = [];
    try {
      const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
      legacyIds = Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
    } catch {
      localStorage.removeItem(FAVORITES_KEY);
      return;
    }
    if (legacyIds.length === 0) {
      localStorage.removeItem(FAVORITES_KEY);
      return;
    }

    void Promise.all(legacyIds.map(async (id) => {
      const res = await fetch("/api/problems", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, favorite: true }),
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed to migrate favorite state");
    })).then(() => {
      localStorage.removeItem(FAVORITES_KEY);
      return refresh(query, selected?.id);
    }).catch(() => {
      migratedLegacyFavorites.current = false;
    });
  }, [loading, query, refresh, selected?.id]);

  const stats = useMemo(() => ({
    problems: problems.length,
    solutions: problems.reduce((n, p) => n + p.solutions.length, 0),
    solved: problems.reduce((count, problem) => count + Number(problem.solved), 0),
    favorites: problems.reduce((count, problem) => count + Number(problem.favorite), 0),
  }), [problems]);
  const visibleProblems = useMemo(
    () => problems.filter((problem) =>
      (!showFavoritesOnly || problem.favorite) &&
      (solutionStatusFilter === "all" ||
        (solutionStatusFilter === "solved" ? problem.solved : !problem.solved))
    ),
    [problems, showFavoritesOnly, solutionStatusFilter],
  );
  const totalPages = Math.max(1, Math.ceil(visibleProblems.length / PROBLEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PROBLEMS_PER_PAGE;
  const paginatedProblems = visibleProblems.slice(pageStart, pageStart + PROBLEMS_PER_PAGE);
  const emptyMessage = showFavoritesOnly
    ? solutionStatusFilter === "solved"
      ? "즐겨찾기한 해결 문제가 없습니다."
      : solutionStatusFilter === "unsolved"
        ? "즐겨찾기한 미해결 문제가 없습니다."
        : "즐겨찾기한 문제가 없습니다."
    : solutionStatusFilter === "solved"
      ? "해결한 문제가 없습니다."
      : solutionStatusFilter === "unsolved"
        ? "해결하지 못한 문제가 없습니다."
        : "검색 결과가 없습니다.";

  function selectSolutionStatus(value: SolutionStatusFilter) {
    setSolutionStatusFilter(value);
    setPage(1);
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    requestAnimationFrame(() => {
      const top = libraryRef.current?.offsetTop;
      if (top !== undefined) window.scrollTo({ top: Math.max(0, top - 92), behavior: "smooth" });
    });
  }

  function openProblem(problem: Problem) {
    setSelected(problem);
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" })));
  }

  async function toggleFavorite(problem: Problem) {
    if (pendingFavoriteIds.has(problem.id)) return;
    const favorite = !problem.favorite;
    const updateLocalState = (value: boolean) => {
      setProblems((current) => current.map((item) => item.id === problem.id ? { ...item, favorite: value } : item));
      setSelected((current) => current?.id === problem.id ? { ...current, favorite: value } : current);
    };

    setPendingFavoriteIds((current) => new Set(current).add(problem.id));
    updateLocalState(favorite);
    try {
      const res = await fetch("/api/problems", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: problem.id, favorite }),
      });
      if (!res.ok) throw new Error("Failed to save favorite state");
    } catch {
      updateLocalState(problem.favorite);
    } finally {
      setPendingFavoriteIds((current) => {
        const next = new Set(current);
        next.delete(problem.id);
        return next;
      });
    }
  }

  async function toggleSolved(problem: Problem) {
    if (pendingSolvedIds.has(problem.id)) return;
    const solved = !problem.solved;
    const updateLocalState = (value: boolean) => {
      setProblems((current) => current.map((item) => item.id === problem.id ? { ...item, solved: value } : item));
      setSelected((current) => current?.id === problem.id ? { ...current, solved: value } : current);
    };

    setPendingSolvedIds((current) => new Set(current).add(problem.id));
    updateLocalState(solved);
    try {
      const res = await fetch("/api/problems", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: problem.id, solved }),
      });
      if (!res.ok) throw new Error("Failed to save solved state");
    } catch {
      updateLocalState(problem.solved);
    } finally {
      setPendingSolvedIds((current) => {
        const next = new Set(current);
        next.delete(problem.id);
        return next;
      });
    }
  }

  async function save() {
    if (!editor) return;
    setError("");
    const isProblem = editor.kind === "problem";
    const res = await fetch(isProblem ? "/api/problems" : "/api/solutions", {
      method: editor.id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(isProblem ? { ...editor.value, id: editor.id } : { id: editor.id, problemId: editor.problemId, title: editor.title, contentMarkdown: editor.contentMarkdown }),
    });
    if (!res.ok) { const data = await res.json(); setError(data.error ?? "저장하지 못했습니다."); return; }
    const selectedId = selected?.id;
    setEditor(null);
    await refresh(query, selectedId);
  }

  async function removeProblem() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/problems", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "문제를 삭제하지 못했습니다.");
      }
      setProblems((current) => current.filter((problem) => problem.id !== deleteTarget.id));
      setSelected(null);
      setDeleteTarget(null);
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "문제를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  return <main>
    <header className="topbar">
      <button className="brand" onClick={() => setSelected(null)} aria-label="문제 목록으로"><span className="brand-mark" aria-hidden="true">∑</span><span className="brand-copy"><strong>SOS 수학서재</strong><small>Mathematical curiosities · since 2026</small></span></button>
      <div className="header-actions"><button className="primary" onClick={() => setEditor({ kind: "problem", value: blank })}><Plus size={18}/> 문제 추가</button></div>
    </header>

    {!selected ? <>
      <section className="hero" aria-label="수학서재 통계">
        <div className="hero-copy">
          <p className="hero-kicker">ARCHIVE OF UNLIKELY QUESTIONS · VOL. 01</p>
        </div>
        <div className="stats" aria-label="서재 현황">
          <span><strong>{String(stats.problems).padStart(2, "0")}</strong><small>문제</small></span>
          <span><strong>{String(stats.solutions).padStart(2, "0")}</strong><small>풀이</small></span>
          <span><strong>{String(stats.solved).padStart(2, "0")}</strong><small>해결</small></span>
        </div>
      </section>
      <section className="library" ref={libraryRef}>
        <div className="toolbar">
          <label className="search"><Search size={19}/><input aria-label="문제 검색" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="제목, 태그, 수식, 풀이 검색"/>{query && <button onClick={() => { setQuery(""); setPage(1); }} aria-label="검색 지우기"><X size={16}/></button>}</label>
          <div className="toolbar-actions">
            <div className="status-filter" role="group" aria-label="해결 상태 필터">
              <button className={solutionStatusFilter === "all" ? "active" : ""} onClick={() => selectSolutionStatus("all")} aria-pressed={solutionStatusFilter === "all"}>전체 <span>{stats.problems}</span></button>
              <button className={solutionStatusFilter === "unsolved" ? "active" : ""} onClick={() => selectSolutionStatus("unsolved")} aria-pressed={solutionStatusFilter === "unsolved"}><CircleDashed size={16}/> 미해결 <span>{stats.problems - stats.solved}</span></button>
              <button className={solutionStatusFilter === "solved" ? "active" : ""} onClick={() => selectSolutionStatus("solved")} aria-pressed={solutionStatusFilter === "solved"}><Check size={16}/> 해결 <span>{stats.solved}</span></button>
            </div>
            <button className={`favorite-filter ${showFavoritesOnly ? "active" : ""}`} onClick={() => { setShowFavoritesOnly((value) => !value); setPage(1); }} aria-pressed={showFavoritesOnly}><Star size={17} fill={showFavoritesOnly ? "currentColor" : "none"}/> 즐겨찾기 <span>{stats.favorites}</span></button>
            <div className="view-switch"><button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="그리드 보기"><Grid2X2 size={18}/></button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="리스트 보기"><LayoutList size={19}/></button></div>
          </div>
        </div>
        <div className={`problem-${view}`}>
          {loading ? <p className="empty">문제를 펼치는 중…</p> : visibleProblems.length === 0 ? <p className="empty">{emptyMessage}</p> : paginatedProblems.map((problem, index) => <article className={`problem-card ${problem.solved ? "is-solved" : ""}`} key={problem.id}>
            <button className="problem-card-main" onClick={() => openProblem(problem)}>
              <div className="card-top"><span className="number">{String(pageStart + index + 1).padStart(2, "0")}</span><span className="difficulty">{"●".repeat(problem.difficulty)}{"○".repeat(5 - problem.difficulty)}</span></div>
              <h2>{problem.title}</h2><p>{problem.problemMarkdown.replace(/[$#*`>\\]/g, " ").replace(/\s+/g, " ").slice(0, 112)}…</p>
              <div className="tag-row">{problem.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
              <div className="card-foot"><span><BookOpen size={15}/>{problem.solutions.length}개 풀이</span><span>열어보기 →</span></div>
            </button>
            <SolvedButton active={problem.solved} pending={pendingSolvedIds.has(problem.id)} onClick={() => toggleSolved(problem)} label={problem.title}/>
            <FavoriteButton active={problem.favorite} pending={pendingFavoriteIds.has(problem.id)} onClick={() => toggleFavorite(problem)} label={problem.title}/>
          </article>)}
        </div>
        {!loading && totalPages > 1 && <nav className="pagination" aria-label="문제 목록 페이지" aria-live="polite">
          <button onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1} aria-label="이전 페이지"><ChevronLeft size={18}/><span>이전</span></button>
          <span className="page-status"><strong>{currentPage}</strong> / {totalPages}</span>
          <button onClick={() => changePage(currentPage + 1)} disabled={currentPage === totalPages} aria-label="다음 페이지"><span>다음</span><ChevronRight size={18}/></button>
        </nav>}
      </section>
    </> : <article className="detail">
      <button className="back" onClick={() => setSelected(null)}><ChevronLeft size={18}/> 모든 문제</button>
      <div className="detail-head"><div><div className="tag-row">{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><h1>{selected.title}</h1></div><div className="detail-actions"><SolvedButton active={selected.solved} pending={pendingSolvedIds.has(selected.id)} onClick={() => toggleSolved(selected)} label={selected.title} detail/><FavoriteButton active={selected.favorite} pending={pendingFavoriteIds.has(selected.id)} onClick={() => toggleFavorite(selected)} label={selected.title} detail/><button className="ghost" onClick={() => setEditor({ kind: "problem", id: selected.id, value: { title: selected.title, problemMarkdown: selected.problemMarkdown, tags: selected.tags, difficulty: selected.difficulty } })}><Pencil size={16}/> 문제 수정</button><button className="danger" onClick={() => { setDeleteError(""); setDeleteTarget(selected); }}><Trash2 size={16}/> 문제 삭제</button></div></div>
      <section className="paper"><div className="paper-top"><div className="section-label">PROBLEM</div><div className="paper-actions"><CopyKatexButton content={selected.problemMarkdown} label="문제 KaTeX 복사"/><PngExportButton filename={`문항-${selected.title}`} label="문항 PNG 저장"><ExportCard kind="problem" problem={selected}/></PngExportButton></div></div><Markdown>{selected.problemMarkdown}</Markdown></section>
      <div className="solution-title"><div><p className="eyebrow">SOLUTIONS</p><h2>풀이 {selected.solutions.length}개</h2></div><button className="primary" onClick={() => setEditor({ kind: "solution", problemId: selected.id, title: `풀이 ${selected.solutions.length + 1}`, contentMarkdown: "" })}><Plus size={18}/> 풀이 추가</button></div>
      {selected.solutions.map((solution, i) => <SolutionBlock key={solution.id} solution={solution} index={i} problem={selected} onEdit={() => setEditor({ kind: "solution", id: solution.id, problemId: selected.id, title: solution.title, contentMarkdown: solution.contentMarkdown })}/>)}
      {selected.solutions.length === 0 && <div className="empty solution-empty">아직 풀이가 없습니다. 첫 번째 풀이를 남겨보세요.</div>}
    </article>}
    {editor && <EditorModal editor={editor} setEditor={setEditor} save={save} error={error}/>}
    {deleteTarget && <DeleteProblemModal problem={deleteTarget} deleting={deleting} error={deleteError} onCancel={() => setDeleteTarget(null)} onDelete={removeProblem}/>}
    <footer>SOS 수학서재 · 한 문제, 여러 시선</footer>
  </main>;
}

function DeleteProblemModal({ problem, deleting, error, onCancel, onDelete }: { problem: Problem; deleting: boolean; error: string; onCancel: () => void; onDelete: () => void }) {
  return <div className="modal-backdrop"><div className="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
    <div className="delete-icon" aria-hidden="true"><Trash2 size={24}/></div>
    <h2 id="delete-title">문제를 삭제할까요?</h2>
    <p id="delete-description"><strong>“{problem.title}”</strong> 문제와 등록된 풀이 {problem.solutions.length}개가 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="modal-actions"><button className="ghost" onClick={onCancel} disabled={deleting}>취소</button><button className="danger danger-solid" onClick={onDelete} disabled={deleting}>{deleting ? "삭제 중…" : "삭제하기"}</button></div>
  </div></div>;
}

function SolvedButton({ active, pending, onClick, label, detail = false }: { active: boolean; pending: boolean; onClick: () => void; label: string; detail?: boolean }) {
  return <button className={`${detail ? "solved-detail" : "solved-card"} ${active ? "active" : ""}`} onClick={onClick} disabled={pending} aria-pressed={active} aria-label={`${label} ${pending ? "해결 상태 저장 중" : active ? "해결 표시 해제" : "해결한 문제로 표시"}`} title={pending ? "저장 중…" : active ? "해결 표시 해제" : "해결한 문제로 표시"}>
    <span className="check-box" aria-hidden="true">{active && <Check size={14}/>}</span>{detail && (active ? "해결함" : "해결 체크")}
  </button>;
}

function FavoriteButton({ active, pending, onClick, label, detail = false }: { active: boolean; pending: boolean; onClick: () => void; label: string; detail?: boolean }) {
  return <button className={`${detail ? "favorite-detail" : "favorite-card"} ${active ? "active" : ""}`} onClick={onClick} disabled={pending} aria-pressed={active} aria-label={`${label} ${pending ? "즐겨찾기 저장 중" : active ? "즐겨찾기 해제" : "즐겨찾기 추가"}`} title={pending ? "저장 중…" : active ? "즐겨찾기 해제" : "즐겨찾기 추가"}>
    <Star size={detail ? 17 : 19} fill={active ? "currentColor" : "none"}/>{detail && (active ? "즐겨찾는 문제" : "즐겨찾기")}
  </button>;
}

function SolutionBlock({ solution, index, problem, onEdit }: { solution: Solution; index: number; problem: Problem; onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  return <section className={`paper solution ${open ? "is-open" : ""}`}>
    <div className="solution-bar">
      <div><span className="section-label">SOLUTION {String(index + 1).padStart(2, "0")}</span><h3>{solution.title}</h3></div>
      <div className="solution-actions"><button className="reveal" onClick={() => setOpen((value) => !value)} aria-expanded={open}><ChevronDown size={18}/>{open ? "풀이 닫기" : "풀이 보기"}</button><CopyKatexButton content={solution.contentMarkdown} label="풀이 KaTeX 복사"/><PngExportButton filename={`풀이-${problem.title}-${solution.title}`} label="풀이 PNG 저장"><ExportCard kind="solution" problem={problem} solution={solution}/></PngExportButton><button className="ghost" onClick={onEdit}><Pencil size={15}/> 수정</button></div>
    </div>
    {open && <Markdown>{solution.contentMarkdown}</Markdown>}
  </section>;
}

function ExportCard({ kind, problem, solution }: { kind: "problem" | "solution"; problem: Problem; solution?: Solution }) {
  return <article className="export-card">
    <div className="export-card-body">
      {kind === "problem" ? <>
        <h1>{problem.title}</h1>
        <Markdown>{problem.problemMarkdown}</Markdown>
      </> : <>
        <p className="export-problem-title">문항 · {problem.title}</p>
        <h1>{solution?.title}</h1>
        {solution && <Markdown>{solution.contentMarkdown}</Markdown>}
      </>}
    </div>
  </article>;
}

function PngExportButton({ children, filename, label }: { children: React.ReactNode; filename: string; label: string }) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "exporting" | "saved" | "error">("idle");

  async function savePng() {
    if (!exportRef.current || status === "exporting") return;
    setStatus("exporting");
    try {
      await document.fonts.ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(exportRef.current, {
        backgroundColor: "#0d1422",
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      const safeFilename = filename.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
      link.download = `${safeFilename || "SOS-수학서재"}.png`;
      link.href = dataUrl;
      link.click();
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      window.setTimeout(() => setStatus("idle"), 2200);
    }
  }

  const buttonLabel = status === "exporting" ? "PNG 만드는 중" : status === "saved" ? "PNG 저장됨" : status === "error" ? "저장 실패 · 다시 시도" : label;
  return <>
    <button className={`export-png ${status}`} type="button" onClick={savePng} disabled={status === "exporting"} aria-label={buttonLabel} title="2400px 너비의 고화질 PNG로 저장">
      {status === "exporting" ? <Loader2 className="spin" size={15}/> : status === "saved" ? <Check size={15}/> : <Download size={15}/>}<span>{buttonLabel}</span>
    </button>
    <div className="export-stage" aria-hidden="true"><div className="export-capture" ref={exportRef}>{children}</div></div>
  </>;
}

function CopyKatexButton({ content, label }: { content: string; label: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 1800);
    }
  }

  const message = status === "copied" ? "복사됨" : status === "error" ? "복사 실패" : label;
  return <button className={`copy-katex ${status}`} onClick={copy} type="button" aria-label={label} title={label}>
    {status === "copied" ? <Check size={15}/> : <Copy size={15}/>}<span>{message}</span>
  </button>;
}

function EditorModal({ editor, setEditor, save, error }: { editor: EditorState; setEditor: (value: EditorState | null) => void; save: () => void; error: string }) {
  const problem = editor.kind === "problem";
  return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-label={problem ? "문제 편집" : "풀이 편집"}>
    <div className="modal-head"><div><p className="eyebrow">KATEX MARKDOWN EDITOR</p><h2>{editor.id ? "내용 수정" : problem ? "새 문제" : "새 풀이"}</h2></div><button className="icon" onClick={() => setEditor(null)} aria-label="닫기"><X/></button></div>
    {editor.kind === "problem" ? <>
      <label>제목<input value={editor.value.title} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, title: e.target.value } })}/></label>
      <div className="form-row"><label>난이도<select value={editor.value.difficulty} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, difficulty: Number(e.target.value) } })}>{[1,2,3,4,5].map(n => <option value={n} key={n}>{n}</option>)}</select></label><label className="grow">태그 (쉼표로 구분)<input value={editor.value.tags.join(", ")} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) } })}/></label></div>
      <label>문제 Markdown<textarea value={editor.value.problemMarkdown} onChange={(e) => setEditor({ ...editor, value: { ...editor.value, problemMarkdown: e.target.value } })}/></label>
    </> : <><label>풀이 제목<input value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })}/></label><label>풀이 Markdown<textarea value={editor.contentMarkdown} onChange={(e) => setEditor({ ...editor, contentMarkdown: e.target.value })}/></label></>}
    <p className="syntax-help">인라인 수식은 <code>$x^2$</code>, 블록 수식은 <code>$$x^2$$</code> 형식을 사용하세요.</p>{error && <p className="error">{error}</p>}
    <div className="modal-actions"><button className="ghost" onClick={() => setEditor(null)}>취소</button><button className="primary" onClick={save}>저장하기</button></div>
  </div></div>;
}
