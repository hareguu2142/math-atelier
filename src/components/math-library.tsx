"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, ChevronDown, ChevronLeft, CircleDashed, Grid2X2, LayoutList, Pencil, Plus, Search, Sparkles, Star, X } from "lucide-react";
import { Markdown } from "./markdown";
import type { Problem, ProblemInput, Solution } from "@/lib/types";

type EditorState =
  | { kind: "problem"; value: ProblemInput; id?: string }
  | { kind: "solution"; title: string; contentMarkdown: string; problemId: string; id?: string };

const blank: ProblemInput = { title: "", problemMarkdown: "", difficulty: 2, tags: [] };
const FAVORITES_KEY = "math-atelier-favorites";
const LEGACY_SOLVED_KEY = "math-atelier-solved";

export default function MathLibrary() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selected, setSelected] = useState<Problem | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [pendingSolvedIds, setPendingSolvedIds] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showUnsolvedOnly, setShowUnsolvedOnly] = useState(false);
  const migratedLegacySolved = useRef(false);

  useEffect(() => {
    function readFavorites() {
      try {
        const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
        setFavoriteIds(new Set(Array.isArray(favorites) ? favorites.filter((id): id is string => typeof id === "string") : []));
      } catch {
        setFavoriteIds(new Set());
      }
    }

    readFavorites();
    window.addEventListener("storage", readFavorites);
    return () => window.removeEventListener("storage", readFavorites);
  }, []);

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

  const stats = useMemo(() => ({
    problems: problems.length,
    solutions: problems.reduce((n, p) => n + p.solutions.length, 0),
    solved: problems.reduce((count, problem) => count + Number(problem.solved), 0),
  }), [problems]);
  const visibleProblems = useMemo(
    () => problems.filter((problem) =>
      (!showFavoritesOnly || favoriteIds.has(problem.id)) &&
      (!showUnsolvedOnly || !problem.solved)
    ),
    [favoriteIds, problems, showFavoritesOnly, showUnsolvedOnly],
  );
  const emptyMessage = showFavoritesOnly && showUnsolvedOnly
    ? "즐겨찾기한 미해결 문제가 없습니다."
    : showFavoritesOnly
      ? "즐겨찾기한 문제가 없습니다."
      : showUnsolvedOnly
        ? "해결하지 못한 문제가 없습니다."
        : "검색 결과가 없습니다.";

  function toggleFavorite(id: string) {
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      } catch {
        // Storage can be unavailable in private or restricted browser contexts.
      }
      return next;
    });
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

  return <main>
    <header className="topbar">
      <button className="brand" onClick={() => setSelected(null)} aria-label="문제 목록으로"><span className="brand-mark">∑</span><span>수학의 서재</span></button>
      <div className="header-actions"><button className="primary" onClick={() => setEditor({ kind: "problem", value: blank })}><Plus size={18}/> 문제 추가</button></div>
    </header>

    {!selected ? <>
      <section className="hero">
        <p className="eyebrow"><Sparkles size={14}/> 생각을 여는 문제들</p>
        <h1>답보다 오래 남는<br/><em>좋은 질문</em>을 모읍니다.</h1>
        <p className="hero-copy">계산보다 논리, 공식보다 발견. 직접 고른 수학 문제와 여러 가지 풀이를 한곳에서 탐색하세요.</p>
        <div className="stats"><span><strong>{stats.problems}</strong> 문제</span><i/><span><strong>{stats.solutions}</strong> 풀이</span><i/><span><strong>{stats.solved}</strong> 해결</span></div>
      </section>
      <section className="library">
        <div className="toolbar">
          <label className="search"><Search size={19}/><input aria-label="문제 검색" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="제목, 태그, 수식, 풀이 검색"/>{query && <button onClick={() => setQuery("")} aria-label="검색 지우기"><X size={16}/></button>}</label>
          <div className="toolbar-actions">
            <button className={`unsolved-filter ${showUnsolvedOnly ? "active" : ""}`} onClick={() => setShowUnsolvedOnly((value) => !value)} aria-pressed={showUnsolvedOnly}><CircleDashed size={17}/> 미해결 <span>{stats.problems - stats.solved}</span></button>
            <button className={`favorite-filter ${showFavoritesOnly ? "active" : ""}`} onClick={() => setShowFavoritesOnly((value) => !value)} aria-pressed={showFavoritesOnly}><Star size={17} fill={showFavoritesOnly ? "currentColor" : "none"}/> 즐겨찾기 <span>{favoriteIds.size}</span></button>
            <div className="view-switch"><button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="그리드 보기"><Grid2X2 size={18}/></button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="리스트 보기"><LayoutList size={19}/></button></div>
          </div>
        </div>
        <div className={`problem-${view}`}>
          {loading ? <p className="empty">문제를 펼치는 중…</p> : visibleProblems.length === 0 ? <p className="empty">{emptyMessage}</p> : visibleProblems.map((problem, index) => <article className={`problem-card ${problem.solved ? "is-solved" : ""}`} key={problem.id}>
            <button className="problem-card-main" onClick={() => setSelected(problem)}>
              <div className="card-top"><span className="number">{String(index + 1).padStart(2, "0")}</span><span className="difficulty">{"●".repeat(problem.difficulty)}{"○".repeat(5 - problem.difficulty)}</span></div>
              <h2>{problem.title}</h2><p>{problem.problemMarkdown.replace(/[$#*`>\\]/g, " ").replace(/\s+/g, " ").slice(0, 112)}…</p>
              <div className="tag-row">{problem.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
              <div className="card-foot"><span><BookOpen size={15}/>{problem.solutions.length}개 풀이</span><span>열어보기 →</span></div>
            </button>
            <SolvedButton active={problem.solved} pending={pendingSolvedIds.has(problem.id)} onClick={() => toggleSolved(problem)} label={problem.title}/>
            <FavoriteButton active={favoriteIds.has(problem.id)} onClick={() => toggleFavorite(problem.id)} label={problem.title}/>
          </article>)}
        </div>
      </section>
    </> : <article className="detail">
      <button className="back" onClick={() => setSelected(null)}><ChevronLeft size={18}/> 모든 문제</button>
      <div className="detail-head"><div><div className="tag-row">{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><h1>{selected.title}</h1></div><div className="detail-actions"><SolvedButton active={selected.solved} pending={pendingSolvedIds.has(selected.id)} onClick={() => toggleSolved(selected)} label={selected.title} detail/><FavoriteButton active={favoriteIds.has(selected.id)} onClick={() => toggleFavorite(selected.id)} label={selected.title} detail/><button className="ghost" onClick={() => setEditor({ kind: "problem", id: selected.id, value: { title: selected.title, problemMarkdown: selected.problemMarkdown, tags: selected.tags, difficulty: selected.difficulty } })}><Pencil size={16}/> 문제 수정</button></div></div>
      <section className="paper"><div className="section-label">PROBLEM</div><Markdown>{selected.problemMarkdown}</Markdown></section>
      <div className="solution-title"><div><p className="eyebrow">SOLUTIONS</p><h2>풀이 {selected.solutions.length}개</h2></div><button className="primary" onClick={() => setEditor({ kind: "solution", problemId: selected.id, title: `풀이 ${selected.solutions.length + 1}`, contentMarkdown: "" })}><Plus size={18}/> 풀이 추가</button></div>
      {selected.solutions.map((solution, i) => <SolutionBlock key={solution.id} solution={solution} index={i} onEdit={() => setEditor({ kind: "solution", id: solution.id, problemId: selected.id, title: solution.title, contentMarkdown: solution.contentMarkdown })}/>)}
      {selected.solutions.length === 0 && <div className="empty solution-empty">아직 풀이가 없습니다. 첫 번째 풀이를 남겨보세요.</div>}
    </article>}
    {editor && <EditorModal editor={editor} setEditor={setEditor} save={save} error={error}/>}
    <footer>Math Atelier · 한 문제, 여러 시선</footer>
  </main>;
}

function SolvedButton({ active, pending, onClick, label, detail = false }: { active: boolean; pending: boolean; onClick: () => void; label: string; detail?: boolean }) {
  return <button className={`${detail ? "solved-detail" : "solved-card"} ${active ? "active" : ""}`} onClick={onClick} disabled={pending} aria-pressed={active} aria-label={`${label} ${pending ? "해결 상태 저장 중" : active ? "해결 표시 해제" : "해결한 문제로 표시"}`} title={pending ? "저장 중…" : active ? "해결 표시 해제" : "해결한 문제로 표시"}>
    <span className="check-box" aria-hidden="true">{active && <Check size={14}/>}</span>{detail && (active ? "해결함" : "해결 체크")}
  </button>;
}

function FavoriteButton({ active, onClick, label, detail = false }: { active: boolean; onClick: () => void; label: string; detail?: boolean }) {
  return <button className={`${detail ? "favorite-detail" : "favorite-card"} ${active ? "active" : ""}`} onClick={onClick} aria-pressed={active} aria-label={`${label} ${active ? "즐겨찾기 해제" : "즐겨찾기 추가"}`} title={active ? "즐겨찾기 해제" : "즐겨찾기 추가"}>
    <Star size={detail ? 17 : 19} fill={active ? "currentColor" : "none"}/>{detail && (active ? "즐겨찾는 문제" : "즐겨찾기")}
  </button>;
}

function SolutionBlock({ solution, index, onEdit }: { solution: Solution; index: number; onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  return <section className={`paper solution ${open ? "is-open" : ""}`}>
    <div className="solution-bar">
      <div><span className="section-label">SOLUTION {String(index + 1).padStart(2, "0")}</span><h3>{solution.title}</h3></div>
      <div className="solution-actions"><button className="reveal" onClick={() => setOpen((value) => !value)} aria-expanded={open}><ChevronDown size={18}/>{open ? "풀이 닫기" : "풀이 보기"}</button><button className="ghost" onClick={onEdit}><Pencil size={15}/> 수정</button></div>
    </div>
    {open && <Markdown>{solution.contentMarkdown}</Markdown>}
  </section>;
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
