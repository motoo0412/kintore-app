"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Tab = "home" | "record" | "history";
type RecordMode = "workout" | "injury";
type HistoryFilter = "all" | "workout" | "injury";

type Workout = {
  id: string;
  exercise: string;
  weight: number;
  reps: number;
  sets: number;
  createdAt: string;
};

type Injury = {
  id: string;
  part: string;
  pain: number;
  date: string;
  memo: string;
  createdAt: string;
};

type Store = {
  workouts: Workout[];
  injuries: Injury[];
};

const STORAGE_KEY = "nyantore-records-v1";
const EXERCISE_PRESETS = ["ブルガリアンスクワット", "ルーマニアンデッドリフト", "ワンハンドロー", "ダンベルベンチプレス", "サイドレイズ", "リバースフライ", "デッドバグ"];
const BODY_PARTS = ["首", "肩", "ひじ", "手首", "背中", "腰", "股関節", "ひざ", "足首", "ふくらはぎ"];
const PAIN_LABELS = ["", "ほぼ気にならない", "すこし違和感", "ほどほど", "しっかりケア", "お休み優先"];
const STAR_LEVELS = Array.from({ length: 5 }, (_, i) => i + 1);
const EMPTY_STORE: Store = { workouts: [], injuries: [] };

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as Partial<Store>;
    if (!Array.isArray(parsed.workouts) || !Array.isArray(parsed.injuries)) return EMPTY_STORE;
    return { workouts: parsed.workouts.filter(isWorkout), injuries: parsed.injuries.filter(isInjury) };
  } catch {
    return EMPTY_STORE;
  }
}

function isWorkout(v: unknown): v is Workout {
  if (!v || typeof v !== "object") return false;
  const i = v as Workout;
  return typeof i.id === "string" && typeof i.exercise === "string" && typeof i.weight === "number" && typeof i.reps === "number" && typeof i.sets === "number" && typeof i.createdAt === "string";
}

function isInjury(v: unknown): v is Injury {
  if (!v || typeof v !== "object") return false;
  const i = v as Injury;
  return typeof i.id === "string" && typeof i.part === "string" && typeof i.pain === "number" && typeof i.date === "string" && typeof i.memo === "string" && typeof i.createdAt === "string";
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(iso: string, day = todayString()) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` === day;
}

function daysSince(day: string) {
  const start = new Date(`${day}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000));
}

function daysLabel(day: string) {
  const days = daysSince(day);
  return days === 0 ? "今日から" : `${days}日経過`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDay(day: string) {
  const [y, m, d] = day.split("-");
  return `${y}/${m}/${d}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "おはよう";
  if (h < 17) return "こんにちは";
  return "おつかれさま";
}

function currentInjuries(injuries: Injury[]) {
  const latest = new Map<string, Injury>();
  const sorted = [...injuries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  for (const inj of sorted) {
    if (!latest.has(inj.part)) latest.set(inj.part, inj);
  }
  return [...latest.values()].sort((a, b) => b.pain - a.pain || b.date.localeCompare(a.date));
}

function trainerMessage(workouts: Workout[], injuries: Injury[]) {
  const worst = currentInjuries(injuries).at(0);
  const trainedToday = workouts.some((w) => isSameDay(w.createdAt));
  if (worst && worst.pain >= 4) {
    return { title: "今日はお休みも大切なメニュー", body: `${worst.part}のコンディションをいたわろうね。猫みたいに丸くなって、回復を優先しよう。ミケはいつでもそばにいるよ。` };
  }
  if (trainedToday && worst) {
    return { title: "やさしく動けてえらい！", body: `${worst.part}のコンディションに気をつけながら、今日も自分のペースでナイスファイト。無理はしないでね。` };
  }
  if (trainedToday) {
    return { title: "肉球ハイタッチ！🐾", body: "今日のトレーニング、ちゃんと残ってるよ。続けている自分が、一番のごほうびだね。" };
  }
  if (worst) {
    const elapsed = daysSince(worst.date) === 0 ? "今日記録したばかり" : `気になりはじめて${daysSince(worst.date)}日`;
    return { title: "ケアも、りっぱなトレーニング", body: `${worst.part}は${elapsed}。できる範囲で、今日もからだの声を聞いてあげようね。` };
  }
  return { title: "ミケからのひとこと", body: "開いてくれてありがとう！重い日は軽く、軽い日は少し楽しく。今日の1セット、一緒に残そうね。" };
}

function CatFace({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="#eaf8fd" />
      <path d="M27 52 C22 28, 28 18, 48 31 Z" fill="#ffffff" stroke="#8fd0e8" strokeWidth="3" strokeLinejoin="round" />
      <path d="M93 52 C98 28, 92 18, 72 31 Z" fill="#ffffff" stroke="#8fd0e8" strokeWidth="3" strokeLinejoin="round" />
      <path d="M31 46 C29 32, 32 26, 44 34 Z" fill="#ffd6e2" />
      <path d="M89 46 C91 32, 88 26, 76 34 Z" fill="#ffd6e2" />
      <ellipse cx="60" cy="63" rx="36" ry="30" fill="#ffffff" stroke="#8fd0e8" strokeWidth="3" />
      <path d="M56 34 Q60 42 64 34" fill="#a8dff2" />
      <ellipse cx="38" cy="68" rx="6" ry="3.8" fill="#ffc4d6" opacity="0.85" />
      <ellipse cx="82" cy="68" rx="6" ry="3.8" fill="#ffc4d6" opacity="0.85" />
      <circle cx="44" cy="59" r="5" fill="#2c4a56" />
      <circle cx="76" cy="59" r="5" fill="#2c4a56" />
      <circle cx="42.5" cy="57.2" r="1.8" fill="#ffffff" />
      <circle cx="74.5" cy="57.2" r="1.8" fill="#ffffff" />
      <ellipse cx="60" cy="65.5" rx="3" ry="2.2" fill="#ff9eb8" />
      <path d="M53 69 Q56.5 73 60 68.5 Q63.5 73 67 69" fill="none" stroke="#2c4a56" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 60 L30 62 M19 67 L29 67" stroke="#8fd0e8" strokeWidth="2" strokeLinecap="round" />
      <path d="M100 60 L90 62 M101 67 L91 67" stroke="#8fd0e8" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 90 Q60 97 80 90" fill="none" stroke="#6cc3e3" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="60" cy="95" r="5.5" fill="#ffe07d" stroke="#e5b842" strokeWidth="1.5" />
      <circle cx="60" cy="96" r="1.3" fill="#c99524" />
      <ellipse cx="43" cy="102" rx="8" ry="6" fill="#ffffff" stroke="#8fd0e8" strokeWidth="2.5" />
      <ellipse cx="77" cy="102" rx="8" ry="6" fill="#ffffff" stroke="#8fd0e8" strokeWidth="2.5" />
    </svg>
  );
}

function Paw({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <ellipse cx="32" cy="42" rx="14" ry="12" fill="currentColor" />
      <circle cx="16" cy="24" r="6" fill="currentColor" />
      <circle cx="28" cy="16" r="6.2" fill="currentColor" />
      <circle cx="40" cy="16" r="6.2" fill="currentColor" />
      <circle cx="50" cy="26" r="5.6" fill="currentColor" />
    </svg>
  );
}

function Stars({ value, onChange }: { value: number; onChange?: (next: number) => void }) {
  return (
    <div className="flex gap-1" role={onChange ? "radiogroup" : undefined} aria-label="ケア度レベル">
      {STAR_LEVELS.map((star) => {
        const active = star <= value;
        const cls = `text-[1.45rem] leading-none transition ${active ? "text-[#f2be4b]" : "text-[#d5e4ea]"} ${onChange ? "px-0.5 active:scale-95" : ""}`;
        return onChange ? (
          <button key={star} type="button" role="radio" aria-checked={value === star} aria-label={`${star}（${PAIN_LABELS[star]}）`} className={cls} onClick={() => onChange(star)}>★</button>
        ) : (
          <span key={star} className={cls} aria-hidden="true">★</span>
        );
      })}
    </div>
  );
}
export default function Home() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [recordMode, setRecordMode] = useState<RecordMode>("workout");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [toast, setToast] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ kind: "workout" | "injury"; id: string } | null>(null);

  const [exercise, setExercise] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [sets, setSets] = useState("");
  const [workoutError, setWorkoutError] = useState("");

  const [part, setPart] = useState("");
  const [pain, setPain] = useState(2);
  const [injuryDate, setInjuryDate] = useState("");
  const [memo, setMemo] = useState("");
  const [injuryError, setInjuryError] = useState("");

  useEffect(() => {
    const store = loadStore();
    setWorkouts(store.workouts);
    setInjuries(store.injuries);
    setInjuryDate(todayString());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ workouts, injuries }));
  }, [ready, workouts, injuries]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const alerts = useMemo(() => currentInjuries(injuries), [injuries]);
  const recentWorkouts = useMemo(
    () => [...workouts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3),
    [workouts],
  );
  const message = useMemo(() => trainerMessage(workouts, injuries), [workouts, injuries]);
  const todayCount = workouts.filter((w) => isSameDay(w.createdAt)).length;

  const history = useMemo(() => {
    const items = [
      ...workouts.map((workout) => ({ kind: "workout" as const, at: workout.createdAt, workout })),
      ...injuries.map((injury) => ({ kind: "injury" as const, at: injury.createdAt, injury })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    return historyFilter === "all" ? items : items.filter((item) => item.kind === historyFilter);
  }, [workouts, injuries, historyFilter]);

  function submitWorkout(e: FormEvent) {
    e.preventDefault();
    const name = exercise.trim();
    const w = Number(weight);
    const r = Number(reps);
    const s = Number(sets);
    if (!name) return setWorkoutError("種目を入れてね");
    if (weight === "" || Number.isNaN(w) || w < 0) return setWorkoutError("重量は0以上の数字にしてね");
    if (!Number.isInteger(r) || r < 1) return setWorkoutError("回数は1以上の整数にしてね");
    if (!Number.isInteger(s) || s < 1) return setWorkoutError("セット数は1以上の整数にしてね");
    setWorkouts((cur) => [{ id: crypto.randomUUID(), exercise: name, weight: w, reps: r, sets: s, createdAt: new Date().toISOString() }, ...cur]);
    setExercise(""); setWeight(""); setReps(""); setSets(""); setWorkoutError("");
    setToast("筋トレを記録したよ🐾");
  }

  function submitInjury(e: FormEvent) {
    e.preventDefault();
    if (!part) return setInjuryError("気になる部位を選んでね");
    if (!injuryDate) return setInjuryError("日付を選んでね");
    if (pain < 1 || pain > 5) return setInjuryError("レベルを1〜5で選んでね");
    setInjuries((cur) => [{ id: crypto.randomUUID(), part, pain, date: injuryDate, memo: memo.trim(), createdAt: new Date().toISOString() }, ...cur]);
    setPart(""); setPain(2); setMemo(""); setInjuryDate(todayString()); setInjuryError("");
    setToast("コンディションを記録したよ🐾");
  }

  function copyWorkout(w: Workout) {
    setWorkouts((cur) => [{ ...w, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...cur]);
    setToast("同じメニューを登録したよ🐾");
  }

  function deleteRecord(kind: "workout" | "injury", id: string) {
    if (kind === "workout") setWorkouts((cur) => cur.filter((w) => w.id !== id));
    else setInjuries((cur) => cur.filter((inj) => inj.id !== id));
    setPendingDelete(null);
    setToast("記録を消したよ");
  }

  const todayLabel = ready ? new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" }) : "";
  return (
    <div className="flex h-dvh items-stretch justify-center px-3 py-4 text-[#2c4a56] sm:px-0 sm:py-6">
      <div className="relative mx-auto flex h-full max-h-[860px] w-full max-w-[430px] flex-col overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,#ffffff_0%,#f4fbfe_48%,#e7f6fb_100%)] shadow-[0_18px_50px_rgba(94,175,204,0.18)]">
        <div className="pointer-events-none absolute -right-6 top-16 text-[#d5f0f8]" aria-hidden="true"><Paw className="h-24 w-24" /></div>
        <div className="pointer-events-none absolute left-4 top-36 text-[#e5f5fb]" aria-hidden="true"><Paw className="h-10 w-10 rotate-[-18deg]" /></div>

        <header className="relative px-5 pb-2 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-[#7eb4c8]">NYAN TORE</p>
              <h1 className="mt-0.5 text-[1.65rem] font-bold leading-tight text-[#245066]">にゃんトレ</h1>
              <p className="mt-1 text-sm text-[#6d8b98]">{ready ? `${greeting()}。${todayLabel}` : "ミケが準備しているよ"}</p>
            </div>
            <div className="rounded-full bg-white p-1 shadow-[0_8px_20px_rgba(143,208,232,0.35)]">
              <CatFace className="h-[4.75rem] w-[4.75rem]" />
            </div>
          </div>
        </header>

        <main className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
          {!ready ? (
            <section className="mt-10 flex flex-col items-center text-center">
              <CatFace className="h-24 w-24" />
              <p className="mt-3 text-sm text-[#6d8b98]">記録をひらいているよ…</p>
            </section>
          ) : null}

          {ready && tab === "home" ? (
            <div className="space-y-4">
              <section className="rounded-[1.6rem] bg-white/90 p-4 shadow-[0_10px_28px_rgba(143,208,232,0.16)] ring-1 ring-[#d7f1f8]">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-1.5 text-base font-bold"><Paw className="h-4 w-4 text-[#8fd0e8]" />いまのコンディション</h2>
                  <span className="rounded-full bg-[#e7f6fb] px-2.5 py-1 text-xs font-semibold text-[#3f7f99]">{alerts.length > 0 ? `${alerts.length}か所ケア中` : "絶好調！"}</span>
                </div>
                {alerts.length === 0 ? (
                  <p className="rounded-2xl bg-[#f5fbfe] px-4 py-3 text-sm text-[#5b7e8d]">気になる部位の登録はありません。今日も気持ちよく動けそう🐾</p>
                ) : (
                  <ul className="space-y-2.5">
                    {alerts.map((item) => (
                      <li key={item.id} className="rounded-2xl bg-[#f4fbfe] px-3.5 py-3 ring-1 ring-[#dff2f9]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base font-bold text-[#245066]">{item.part}</span>
                          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-[#3f7f99]">{daysLabel(item.date)}</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <Stars value={item.pain} />
                          <span className="text-xs font-medium text-[#6d8b98]">{formatDay(item.date)}〜 ・ {PAIN_LABELS[item.pain]}</span>
                        </div>
                        {item.memo ? <p className="mt-1.5 text-xs text-[#5b7e8d]">{item.memo}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-[1.6rem] bg-[linear-gradient(135deg,#e3f5fc_0%,#f7fcfe_100%)] p-4 shadow-[0_10px_28px_rgba(143,208,232,0.16)] ring-1 ring-[#cfecf7]">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 rounded-2xl bg-white p-1 shadow-sm"><CatFace className="h-12 w-12" /></div>
                  <div>
                    <p className="text-sm font-bold text-[#245066]">{message.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#4f7282]">{message.body}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.6rem] bg-white/90 p-4 shadow-[0_10px_28px_rgba(143,208,232,0.16)] ring-1 ring-[#d7f1f8]">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-1.5 text-base font-bold"><Paw className="h-4 w-4 text-[#8fd0e8]" />さいきんの筋トレ</h2>
                  <span className="rounded-full bg-[#e7f6fb] px-2.5 py-1 text-xs font-semibold text-[#3f7f99]">今日 {todayCount}件</span>
                </div>
                {recentWorkouts.length === 0 ? (
                  <div className="rounded-2xl bg-[#f5fbfe] px-4 py-4 text-center">
                    <p className="text-sm text-[#5b7e8d]">まだ筋トレの記録がありません</p>
                    <button type="button" onClick={() => { setRecordMode("workout"); setTab("record"); }} className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#6cc3e3] px-4 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95">
                      <Paw className="h-3.5 w-3.5" />最初の1回を記録する
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {recentWorkouts.map((item) => (
                      <li key={item.id} className="flex items-center justify-between rounded-2xl bg-[#f5fbfe] px-3.5 py-2.5">
                        <div>
                          <p className="text-sm font-bold text-[#245066]">{item.exercise}</p>
                          <p className="text-xs text-[#6d8b98]">{item.weight}kg × {item.reps}回 × {item.sets}セット</p>
                        </div>
                        <span className="text-xs text-[#7ea0af]">{formatDateTime(item.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : null}
          {ready && tab === "record" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-full bg-white/90 p-1.5 shadow-sm ring-1 ring-[#d7f1f8]">
                <button type="button" onClick={() => setRecordMode("workout")} className={`rounded-full py-2 text-xs font-bold transition ${recordMode === "workout" ? "bg-[#6cc3e3] text-white shadow-sm" : "text-[#5b7e8d]"}`}>筋トレを記録</button>
                <button type="button" onClick={() => setRecordMode("injury")} className={`rounded-full py-2 text-xs font-bold transition ${recordMode === "injury" ? "bg-[#6cc3e3] text-white shadow-sm" : "text-[#5b7e8d]"}`}>コンディション</button>
              </div>

              {recordMode === "workout" ? (
                <form onSubmit={submitWorkout} className="space-y-4 rounded-[1.6rem] bg-white/90 p-4 shadow-[0_10px_28px_rgba(143,208,232,0.16)] ring-1 ring-[#d7f1f8]">
                  <div>
                    <label className="block text-xs font-bold text-[#4f7282]">種目</label>
                    <input type="text" value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="例：スクワット" className="mt-1.5 w-full rounded-2xl border border-[#cde9f4] bg-[#f8fdff] px-3.5 py-2.5 text-sm outline-none focus:border-[#6cc3e3]" />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {EXERCISE_PRESETS.map((preset) => (
                        <button key={preset} type="button" onClick={() => setExercise(preset)} className={`rounded-full px-2.5 py-1 text-xs transition ${exercise === preset ? "bg-[#6cc3e3] font-bold text-white" : "bg-[#ebf7fc] text-[#4f7282]"}`}>{preset}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-[#4f7282]">重量 (kg)</label>
                      <input type="number" step="0.5" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" className="mt-1.5 w-full rounded-2xl border border-[#cde9f4] bg-[#f8fdff] px-3 py-2.5 text-sm outline-none focus:border-[#6cc3e3]" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4f7282]">回数</label>
                      <input type="number" min="1" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="0" className="mt-1.5 w-full rounded-2xl border border-[#cde9f4] bg-[#f8fdff] px-3 py-2.5 text-sm outline-none focus:border-[#6cc3e3]" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4f7282]">セット数</label>
                      <input type="number" min="1" value={sets} onChange={(e) => setSets(e.target.value)} placeholder="0
                      " className="mt-1.5 w-full rounded-2xl border border-[#cde9f4] bg-[#f8fdff] px-3 py-2.5 text-sm outline-none focus:border-[#6cc3e3]" />
                    </div>
                  </div>
                  {workoutError ? <p className="text-xs font-semibold text-[#d96b84]">{workoutError}</p> : null}
                  <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-full bg-[#6cc3e3] py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(108,195,227,0.35)] transition active:scale-98">
                    <Paw className="h-4 w-4" />筋トレを登録する
                  </button>
                </form>
              ) : (
                <form onSubmit={submitInjury} className="space-y-4 rounded-[1.6rem] bg-white/90 p-4 shadow-[0_10px_28px_rgba(143,208,232,0.16)] ring-1 ring-[#d7f1f8]">
                  <div>
                    <label className="block text-xs font-bold text-[#4f7282]">気になる部位</label>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {BODY_PARTS.map((bodyPart) => (
                        <button key={bodyPart} type="button" onClick={() => setPart(bodyPart)} className={`rounded-full px-3 py-1.5 text-xs transition ${part === bodyPart ? "bg-[#6cc3e3] font-bold text-white" : "bg-[#ebf7fc] text-[#4f7282]"}`}>{bodyPart}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#4f7282]">ケア度・違和感レベル</label>
                      <span className="text-xs font-semibold text-[#3f7f99]">{PAIN_LABELS[pain]}</span>
                    </div>
                    <div className="mt-1.5 rounded-2xl bg-[#f8fdff] px-3.5 py-2.5 ring-1 ring-[#cde9f4]"><Stars value={pain} onChange={setPain} /></div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4f7282]">気になりはじめた日</label>
                    <input type="date" value={injuryDate} onChange={(e) => setInjuryDate(e.target.value)} className="mt-1.5 w-full rounded-2xl border border-[#cde9f4] bg-[#f8fdff] px-3.5 py-2.5 text-sm outline-none focus:border-[#6cc3e3]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4f7282]">メモ（任意）</label>
                    <textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="例：深く曲げると少し違和感あり" className="mt-1.5 w-full rounded-2xl border border-[#cde9f4] bg-[#f8fdff] px-3.5 py-2 text-sm outline-none focus:border-[#6cc3e3]" />
                  </div>
                  {injuryError ? <p className="text-xs font-semibold text-[#d96b84]">{injuryError}</p> : null}
                  <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-full bg-[#6cc3e3] py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(108,195,227,0.35)] transition active:scale-98">
                    <Paw className="h-4 w-4" />コンディションを登録する
                  </button>
                </form>
              )}
            </div>
          ) : null}

          {ready && tab === "history" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-1.5 rounded-full bg-white/90 p-1.5 shadow-sm ring-1 ring-[#d7f1f8]">
                {( [["all", "すべて"], ["workout", "筋トレ"], ["injury", "体調・メモ"]] as const ).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setHistoryFilter(key)} className={`rounded-full py-1.5 text-xs font-bold transition ${historyFilter === key ? "bg-[#6cc3e3] text-white shadow-sm" : "text-[#5b7e8d]"}`}>{label}</button>
                ))}
              </div>
              {history.length === 0 ? (
                <div className="rounded-[1.6rem] bg-white/90 px-4 py-8 text-center ring-1 ring-[#d7f1f8]"><p className="text-sm text-[#6d8b98]">まだ記録がありません</p></div>
              ) : (
                <ul className="space-y-2.5">
                  {history.map((item) => {
                    if (item.kind === "workout") {
                      const w = item.workout;
                      const isConfirming = pendingDelete?.kind === "workout" && pendingDelete.id === w.id;
                      return (
                        <li key={w.id} className="rounded-[1.4rem] bg-white/95 p-3.5 shadow-sm ring-1 ring-[#d7f1f8]">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="inline-block rounded-full bg-[#e5f5fb] px-2 py-0.5 text-[10px] font-bold text-[#3f7f99]">筋トレ</span>
                              <p className="mt-1 text-sm font-bold text-[#245066]">{w.exercise}</p>
                              <p className="text-xs text-[#5b7e8d]">{w.weight}kg × {w.reps}回 × {w.sets}セット</p>
                            </div>
                            <span className="text-xs text-[#7ea0af]">{formatDateTime(w.createdAt)}</span>
                          </div>
                          <div className="mt-2.5 flex items-center justify-end gap-2">
                            <button type="button" onClick={() => copyWorkout(w)} className="rounded-full bg-[#ebf7fc] px-3 py-1 text-xs font-semibold text-[#3f7f99] transition active:scale-95">同じメニューを再登録</button>
                            {isConfirming ? (
                              <button type="button" onClick={() => deleteRecord("workout", w.id)} className="rounded-full bg-[#f07d96] px-3 py-1 text-xs font-bold text-white">本当に削除</button>
                            ) : (
                              <button type="button" onClick={() => setPendingDelete({ kind: "workout", id: w.id })} className="rounded-full px-2.5 py-1 text-xs text-[#8aa5b2]">削除</button>
                            )}
                          </div>
                        </li>
                      );
                    }
                    const inj = item.injury;
                    const isConfirming = pendingDelete?.kind === "injury" && pendingDelete.id === inj.id;
                    return (
                      <li key={inj.id} className="rounded-[1.4rem] bg-white/95 p-3.5 shadow-sm ring-1 ring-[#d7f1f8]">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block rounded-full bg-[#eef8fc] px-2 py-0.5 text-[10px] font-bold text-[#4f8ca6]">コンディション</span>
                            <p className="mt-1 text-sm font-bold text-[#245066]">{inj.part}</p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <Stars value={inj.pain} />
                              <span className="text-xs text-[#6d8b98]">{formatDay(inj.date)}〜</span>
                            </div>
                            {inj.memo ? <p className="mt-1 text-xs text-[#5b7e8d]">{inj.memo}</p> : null}
                          </div>
                          <span className="text-xs text-[#7ea0af]">{formatDateTime(inj.createdAt)}</span>
                        </div>
                        <div className="mt-2 flex justify-end">
                          {isConfirming ? (
                            <button type="button" onClick={() => deleteRecord("injury", inj.id)} className="rounded-full bg-[#f07d96] px-3 py-1 text-xs font-bold text-white">本当に削除</button>
                          ) : (
                            <button type="button" onClick={() => setPendingDelete({ kind: "injury", id: inj.id })} className="rounded-full px-2.5 py-1 text-xs text-[#8aa5b2]">削除</button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </main>

        {toast ? <div className="pointer-events-none absolute bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[#245066] px-4 py-2 text-xs font-bold text-white shadow-lg">{toast}</div> : null}

        <nav className="relative grid grid-cols-3 border-t border-[#dcf1f8] bg-white/95 px-3 py-2">
          {( [["home", "ホーム"], ["record", "記録する"], ["history", "履歴"]] as const ).map(([key, label]) => {
            const active = tab === key;
            return (
              <button key={key} type="button" onClick={() => setTab(key)} className={`flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-xs font-bold transition ${active ? "text-[#3d9ec4]" : "text-[#8ca8b5]"}`}>
                <Paw className={`h-5 w-5 ${active ? "scale-110 text-[#6cc3e3]" : ""}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
