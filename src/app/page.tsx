"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Tab = "home" | "record" | "history";
type RecordMode = "workout" | "injury";
type HistoryFilter = "all" | "workout" | "injury";

type Workout = { id: string; exercise: string; weight: number; reps: number; sets: number; createdAt: string };
type Injury = { id: string; part: string; pain: number; date: string; memo: string; createdAt: string };
type Condition = { sleep: number; muscleSoreness: number; jointPain: number; focus: number };
type Store = { workouts: Workout[]; injuries: Injury[]; condition: Condition };

const STORAGE_KEY = "baron-kintore-records-v1";
const EXERCISE_PRESETS = ["ブルガリアンスクワット", "ルーマニアンデッドリフト", "ワンハンドロー", "ダンベルベンチプレス", "サイドレイズ", "デッドバグ"];
const BODY_PARTS = ["首", "肩", "ひじ", "手首", "背中", "腰", "股関節", "ひざ", "足首"];

const SLEEP_LABELS = ["", "寝不足", "やや浅い", "ふつう", "よく寝た", "バッチリ"];
const MUSCLE_LABELS = ["", "強い筋肉痛", "けっこう張る", "少し張りあり", "ほぼ回復", "絶好調"];
const JOINT_LABELS = ["", "強い痛み", "痛みあり", "少し違和感", "ほぼなし", "痛みゼロ"];
const FOCUS_LABELS = ["", "ぼんやり", "低め", "ふつう", "集中できる", "研ぎ澄まされてる"];
const CARE_LABELS = ["", "経過観察", "すこし違和感", "ほどほど", "しっかりケア", "お休み優先"];

const STAR_LEVELS = Array.from({ length: 5 }, (_, i) => i + 1);
const DEFAULT_CONDITION: Condition = { sleep: 4, muscleSoreness: 4, jointPain: 5, focus: 4 };
const EMPTY_STORE: Store = { workouts: [], injuries: [], condition: DEFAULT_CONDITION };

function todayString() {
  return "2026-11-18";
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getSliderTheme(val: number) {
  if (val >= 4) return { accent: "#0ea5e9", badgeBg: "bg-sky-50 text-sky-700 border-sky-200", barColor: "from-teal-400 to-sky-500" };
  if (val === 3) return { accent: "#14b8a6", badgeBg: "bg-teal-50 text-teal-700 border-teal-200", barColor: "from-emerald-400 to-teal-500" };
  return { accent: "#f59e0b", badgeBg: "bg-amber-50 text-amber-800 border-amber-200", barColor: "from-rose-400 to-amber-500" };
}

function getBaronAdvice(condition: Condition, workouts: Workout[]) {
  const { sleep, muscleSoreness, jointPain, focus } = condition;
  const latest = workouts.at(0);

  if (sleep >= 4 && muscleSoreness >= 4 && jointPain >= 4 && focus >= 4) {
    const hint = latest ? `前回の「${latest.exercise}（${latest.weight}kg）」から少しだけ回数か重さを伸ばしてみよう！` : "まずはフォームを意識して、前回より1回でも多く挑戦してみよう！";
    return { status: "絶好調モード", statusStyle: "bg-sky-100 text-sky-800", message: `今日も漸進性過負荷で頑張ろうね！${hint}` };
  }
  if (jointPain <= 2) {
    return { status: "関節ケア優先", statusStyle: "bg-amber-100 text-amber-800", message: "関節に痛みがあるみたいだね。今日は無理せずお休みするか、痛みが出ない種目だけに絞ってストレッチ中心にしようね。" };
  }
  if (muscleSoreness <= 2 || sleep <= 2) {
    if (latest && latest.weight > 0) {
      const cutKg = Math.max(1, Math.round(latest.weight * 0.2 * 2) / 2);
      const targetKg = Math.max(0, latest.weight - cutKg);
      return { status: "負荷コントロール", statusStyle: "bg-teal-100 text-teal-800", message: `今日は疲れや筋肉痛が残っているね。いつもより${cutKg}kg軽くしてみよう（${latest.exercise}なら${targetKg}kgくらいがおすすめだよ）！` };
    }
    return { status: "負荷コントロール", statusStyle: "bg-teal-100 text-teal-800", message: "今日は疲れや筋肉痛が残っているね。いつもより2〜5kg軽くして、フォームの確認メインで動こうね！" };
  }
  if (focus <= 2) {
    return { status: "マイペース調整", statusStyle: "bg-teal-100 text-teal-800", message: "集中しにくい日は無理しなくて大丈夫。今日はセット数を1〜2セット減らしてもいいかも！短時間でスッキリ終わらせよう。" };
  }
  return { status: "バランス調整", statusStyle: "bg-cyan-100 text-cyan-800", message: "まずまずの体調だね！様子を見ながら進めて、きつかったらセット数を1セット減らしてもいいかも。無理なくいこう！" };
}
function BaronCat({ className = "h-20 w-20" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 140" className={className} aria-label="キジトラ長毛種のバロン君">
      <defs>
        <radialGradient id="baronAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#ccfbf1" />
        </radialGradient>
      </defs>
      <circle cx="70" cy="70" r="66" fill="url(#baronAura)" />
      <path d="M32 86 Q24 98 36 108 Q48 122 70 122 Q92 122 104 108 Q116 98 108 86 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
      <path d="M46 102 L52 114 L58 104 L64 116 L70 105 L76 116 L82 104 L88 114 L94 102" fill="none" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 62 L24 24 L56 42 Z" fill="#85684a" stroke="#5c452e" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M110 62 L116 24 L84 42 Z" fill="#85684a" stroke="#5c452e" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M34 56 L30 33 L50 44 Z" fill="#fed7aa" />
      <path d="M106 56 L110 33 L90 44 Z" fill="#fed7aa" />
      <path d="M36 48 Q44 46 46 54 M104 48 Q96 46 94 54" stroke="#fff7ed" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M30 66 Q22 76 30 85 Q26 93 42 97 Q56 103 70 103 Q84 103 98 97 Q114 93 110 85 Q118 76 110 66 Q110 40 70 40 Q30 40 30 66 Z" fill="#a3825e" stroke="#5c452e" strokeWidth="2.5" />
      <path d="M55 46 L60 54 L65 48 L70 55 L75 48 L80 54 L85 46" fill="none" stroke="#473320" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M33 70 L43 72 M32 78 L42 78" stroke="#473320" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M107 70 L97 72 M108 78 L98 78" stroke="#473320" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="70" cy="86" rx="18" ry="13" fill="#fffbeb" />
      <ellipse cx="52" cy="69" rx="7" ry="7.5" fill="#0d9488" stroke="#3b2818" strokeWidth="1.8" />
      <ellipse cx="88" cy="69" rx="7" ry="7.5" fill="#0d9488" stroke="#3b2818" strokeWidth="1.8" />
      <circle cx="52" cy="69" r="3.8" fill="#1e293b" />
      <circle cx="88" cy="69" r="3.8" fill="#1e293b" />
      <circle cx="49.5" cy="66.5" r="2.2" fill="#ffffff" />
      <circle cx="85.5" cy="66.5" r="2.2" fill="#ffffff" />
      <path d="M66 80 L74 80 L70 84.5 Z" fill="#f472b6" />
      <path d="M62 88 Q66 92 70 87.5 Q74 92 78 88" fill="none" stroke="#473320" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 78 L36 81 M14 86 L35 86 M18 94 L37 90" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M124 78 L104 81 M126 86 L105 86 M122 94 L103 90" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M48 103 Q70 110 92 103" fill="none" stroke="#06b6d4" strokeWidth="5" strokeLinecap="round" />
      <circle cx="70" cy="108" r="4.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
    </svg>
  );
}

function ConditionSlider({ label, value, statusText, leftHint, rightHint, onChange }: { label: string; value: number; statusText: string; leftHint: string; rightHint: string; onChange: (next: number) => void }) {
  const theme = getSliderTheme(value);
  const percent = ((value - 1) / 4) * 100;
  return (
    <div className="rounded-2xl border border-cyan-100/80 bg-white/90 p-3.5 shadow-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-700">{label}</span>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${theme.badgeBg}`}>{value} / 5・{statusText}</span>
      </div>
      <div className="relative flex items-center py-1">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full bg-gradient-to-r transition-all duration-200 ${theme.barColor}`} style={{ width: `${percent}%` }} />
        </div>
        <input type="range" min={1} max={5} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ accentColor: theme.accent }} className="absolute inset-0 h-full w-full cursor-pointer opacity-90" aria-label={label} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>{leftHint}</span>
        <span>{rightHint}</span>
      </div>
    </div>
  );
}
export default function KintoreApp() {
  const [tab, setTab] = useState<Tab>("home");
  const [store, setStore] = useState<Store>(EMPTY_STORE);
  const [loaded, setLoaded] = useState(false);
  const [recordMode, setRecordMode] = useState<RecordMode>("workout");
  const [exercise, setExercise] = useState(EXERCISE_PRESETS.at(0)??"");
  const [weight, setWeight] = useState("20");
  const [reps, setReps] = useState("10");
  const [sets, setSets] = useState("3");
  const [part, setPart] = useState(BODY_PARTS.at(0)??"");
  const [pain, setPain] = useState(2);
  const [memo, setMemo] = useState("");
  const [savedToast, setSavedToast] = useState("");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Store>;
        setStore({ workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [], injuries: Array.isArray(parsed.injuries) ? parsed.injuries : [], condition: parsed.condition ?? DEFAULT_CONDITION });
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch {}
  }, [store, loaded]);

  const advice = useMemo(() => getBaronAdvice(store.condition, store.workouts), [store.condition, store.workouts]);
  const updateCondition = (key: keyof Condition, val: number) => setStore((prev) => ({ ...prev, condition: { ...prev.condition, [key]: val } }));
  const showToast = (msg: string) => { setSavedToast(msg); setTimeout(() => setSavedToast(""), 2500); };

  const handleAddWorkout = (e: FormEvent) => {
    e.preventDefault();
    if (!exercise.trim()) return;
    setStore((prev) => ({ ...prev, workouts: [{ id: crypto.randomUUID(), exercise: exercise.trim(), weight: Math.max(0, Number(weight) || 0), reps: Math.max(1, Number(reps) || 1), sets: Math.max(1, Number(sets) || 1), createdAt: new Date().toISOString() }, ...prev.workouts] }));
    showToast("トレーニングを記録したよ！");
  };

  const handleAddInjury = (e: FormEvent) => {
    e.preventDefault();
    setStore((prev) => ({ ...prev, injuries: [{ id: crypto.randomUUID(), part, pain, date: todayString(), memo: memo.trim(), createdAt: new Date().toISOString() }, ...prev.injuries] }));
    setMemo("");
    showToast("ケアメモを記録したよ！");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-cyan-50/50 to-teal-50/40 pb-24 text-slate-800">
      <header className="sticky top-0 z-20 border-b border-cyan-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-gradient-to-tr from-teal-400 to-sky-400" />
            <h1 className="bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-lg font-extrabold tracking-tight text-transparent">BARON FIT</h1>
          </div>
<span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-teal-700">TODAY</span>

        </div>
      </header>

      {savedToast && <div className="fixed top-16 left-1/2 z-30 -translate-x-1/2 rounded-full bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-lg">{savedToast}</div>}

      <main className="mx-auto max-w-md space-y-5 px-4 pt-5">
        {tab === "home" && (
          <>
            <section className="relative overflow-hidden rounded-3xl border border-cyan-200/70 bg-gradient-to-br from-white via-sky-50/70 to-teal-50/80 p-4 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="shrink-0">
                  <BaronCat className="h-20 w-20 drop-shadow-xs" />
                  <p className="mt-1 text-center text-[11px] font-bold text-teal-700">コーチ・バロン</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${advice.statusStyle}`}>{advice.status}</span>
                  <div className="rounded-2xl rounded-tl-xs border border-cyan-100 bg-white/95 p-3 text-sm leading-relaxed text-slate-700 shadow-2xs">{advice.message}</div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-slate-700">今日のコンディションチェック</h2>
                <span className="text-[11px] text-teal-600">右に動かすほど絶好調！</span>
              </div>
              <ConditionSlider label="睡眠の質" value={store.condition.sleep} statusText={SLEEP_LABELS[store.condition.sleep]} leftHint="寝不足" rightHint="バッチリ" onChange={(v) => updateCondition("sleep", v)} />
              <ConditionSlider label="筋肉の張り・筋肉痛" value={store.condition.muscleSoreness} statusText={MUSCLE_LABELS[store.condition.muscleSoreness]} leftHint="強い筋肉痛" rightHint="回復バッチリ" onChange={(v) => updateCondition("muscleSoreness", v)} />
              <ConditionSlider label="関節の痛み" value={store.condition.jointPain} statusText={JOINT_LABELS[store.condition.jointPain]} leftHint="痛みあり" rightHint="痛みゼロ" onChange={(v) => updateCondition("jointPain", v)} />
              <ConditionSlider label="集中力・やる気" value={store.condition.focus} statusText={FOCUS_LABELS[store.condition.focus]} leftHint="ぼんやり" rightHint="絶好調" onChange={(v) => updateCondition("focus", v)} />
            </section>

            <button type="button" onClick={() => setTab("record")} className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99]">今日の筋トレを記録する →</button>
          </>
        )}
        {tab === "record" && (
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-cyan-100/60 p-1">
              <button type="button" onClick={() => setRecordMode("workout")} className={`rounded-xl py-2 text-xs font-bold transition ${recordMode === "workout" ? "bg-white text-sky-700 shadow-xs" : "text-slate-600 hover:text-slate-800"}`}>筋トレメニュー記録</button>
              <button type="button" onClick={() => setRecordMode("injury")} className={`rounded-xl py-2 text-xs font-bold transition ${recordMode === "injury" ? "bg-white text-teal-700 shadow-xs" : "text-slate-600 hover:text-slate-800"}`}>部位別の違和感・ケア</button>
            </div>

            {recordMode === "workout" ? (
              <form onSubmit={handleAddWorkout} className="space-y-4 rounded-3xl border border-cyan-100 bg-white p-5 shadow-xs">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">種目を選ぶ・入力する</label>
                  <input type="text" value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="例：ベンチプレス" className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm focus:border-sky-400 focus:bg-white focus:outline-none" required />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {EXERCISE_PRESETS.map((preset) => (
                      <button key={preset} type="button" onClick={() => setExercise(preset)} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${exercise === preset ? "bg-sky-500 text-white" : "bg-sky-50 text-sky-700 hover:bg-sky-100"}`}>{preset}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">重量 (kg)</label>
                    <input type="number" step="0.5" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-center text-sm font-bold focus:border-sky-400 focus:bg-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">回数 (reps)</label>
                    <input type="number" min="1" value={reps} onChange={(e) => setReps(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-center text-sm font-bold focus:border-sky-400 focus:bg-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">セット数</label>
                    <input type="number" min="1" value={sets} onChange={(e) => setSets(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-center text-sm font-bold focus:border-sky-400 focus:bg-white focus:outline-none" />
                  </div>
                </div>
                <button type="submit" className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 py-3 text-sm font-bold text-white shadow-xs transition hover:opacity-95">この内容で保存する</button>
              </form>
            ) : (
              <form onSubmit={handleAddInjury} className="space-y-4 rounded-3xl border border-cyan-100 bg-white p-5 shadow-xs">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">気になる部位</label>
                  <div className="flex flex-wrap gap-1.5">
                    {BODY_PARTS.map((p) => (
                      <button key={p} type="button" onClick={() => setPart(p)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${part === p ? "bg-teal-500 text-white" : "bg-teal-50 text-teal-800 hover:bg-teal-100"}`}>{p}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600">ケア必要度</label>
                    <span className="text-xs font-semibold text-teal-700">{CARE_LABELS[pain]}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {STAR_LEVELS.map((star) => (
                      <button key={star} type="button" onClick={() => setPain(star)} className={`text-2xl transition ${star <= pain ? "text-teal-500" : "text-slate-200"}`}>★</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">メモ（任意）</label>
                  <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="例：ベンチプレス中に少し張りを感じた" className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm focus:border-teal-400 focus:bg-white focus:outline-none" />
                </div>
                <button type="submit" className="w-full rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 py-3 text-sm font-bold text-white shadow-xs transition hover:opacity-95">ケア記録を保存する</button>
              </form>
            )}
          </section>
        )}

        {tab === "history" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">これまでの記録</h2>
              <div className="flex gap-1 rounded-xl bg-cyan-100/60 p-1 text-xs">
                {([["all", "すべて"], ["workout", "筋トレ"], ["injury", "ケア"]] as const).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setHistoryFilter(key)} className={`rounded-lg px-2.5 py-1 font-semibold transition ${historyFilter === key ? "bg-white text-sky-700 shadow-2xs" : "text-slate-600"}`}>{label}</button>
                ))}
              </div>
            </div>

            {(historyFilter === "all" || historyFilter === "workout") && (
              <div className="space-y-2.5">
                {store.workouts.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-cyan-200 bg-white/60 p-6 text-center text-xs text-slate-400">まだ筋トレの記録がありません。「記録」タブから追加してみよう！</p>
                ) : (
                  store.workouts.map((w) => (
                    <div key={w.id} className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white p-3.5 shadow-2xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">筋トレ</span>
                          <span className="text-xs text-slate-400">{formatDateTime(w.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm font-bold text-slate-800">{w.exercise}</p>
                        <p className="text-xs font-medium text-teal-700">{w.weight}kg × {w.reps}回 × {w.sets}セット</p>
                      </div>
                      <button type="button" onClick={() => setStore((prev) => ({ ...prev, workouts: prev.workouts.filter((item) => item.id !== w.id) }))} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-500">削除</button>
                    </div>
                  ))
                )}
              </div>
            )}

            {(historyFilter === "all" || historyFilter === "injury") && store.injuries.length > 0 && (
              <div className="space-y-2.5 pt-2">
                {store.injuries.map((inj) => (
                  <div key={inj.id} className="flex items-center justify-between rounded-2xl border border-teal-100 bg-white p-3.5 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">ケアメモ</span>
                        <span className="text-xs text-slate-400">{formatDateTime(inj.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-slate-800">{inj.part}（{CARE_LABELS[inj.pain]}）</p>
                      {inj.memo && <p className="mt-0.5 text-xs text-slate-500">{inj.memo}</p>}
                    </div>
                    <button type="button" onClick={() => setStore((prev) => ({ ...prev, injuries: prev.injuries.filter((item) => item.id !== inj.id) }))} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-500">削除</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <nav className="fixed right-0 bottom-0 left-0 z-20 border-t border-cyan-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {([["home", "メイン", "🐱"], ["record", "記録", "✏️"], ["history", "履歴", "📊"]] as const).map(([key, label, icon]) => {
            const active = tab === key;
            return (
              <button key={key} type="button" onClick={() => setTab(key)} className={`flex flex-col items-center justify-center py-2.5 text-xs font-bold transition ${active ? "text-sky-600" : "text-slate-400 hover:text-slate-600"}`}>
                <span className="text-base">{icon}</span>
                <span className="mt-0.5">{label}</span>
                {active && <span className="mt-1 h-1 w-5 rounded-full bg-gradient-to-r from-sky-400 to-teal-400" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
