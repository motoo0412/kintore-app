"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Tab = "home" | "record" | "history";
type RecordMode = "workout" | "injury";
type HistoryFilter = "all" | "workout" | "injury";

type Workout = { id: string; exercise: string; weight: number; reps: number; sets: number; createdAt: string };
type Injury = { id: string; part: string; pain: number; date: string; memo: string; createdAt: string };
type Condition = { sleep: number; jointPain: number; focus: number };
type Store = { workouts: Workout[]; injuries: Injury[]; condition?: Condition };

const STORAGE_KEY = "nyantore-records-v1";
const EXERCISE_PRESETS = ["ブルガリアンスクワット", "ルーマニアンデッドリフト", "ワンハンドロー", "ダンベルベンチプレス", "サイドレイズ", "リバースフライ", "デッドバグ"];
const BODY_PARTS = ["首", "肩", "ひじ", "手首", "背中", "腰", "股関節", "ひざ", "足首", "ふくらはぎ"];
const PAIN_LABELS = ["", "ほぼ気にならない", "すこし違和感", "ほどほど", "しっかりケア", "お休み優先"];
const SLEEP_LABELS = ["", "寝不足", "やや浅い", "ふつう", "よく寝た", "バッチリ"];
const JOINT_LABELS = ["", "痛みなし", "すこし違和感", "やや気になる", "痛みあり", "強い痛み"];
const FOCUS_LABELS = ["", "ぼんやり", "低め", "ふつう", "集中できる", "絶好調"];
const STAR_LEVELS =;
const DEFAULT_CONDITION: Condition = { sleep: 3, jointPain: 1, focus: 3 };
const EMPTY_STORE: Store = { workouts: [], injuries: [], condition: DEFAULT_CONDITION };

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

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as Partial<Store>;
    const cond = parsed.condition;
    const validCond = cond && typeof cond.sleep === "number" && typeof cond.jointPain === "number" && typeof cond.focus === "number" ? cond : DEFAULT_CONDITION;
    return {
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts.filter(isWorkout) : [],
      injuries: Array.isArray(parsed.injuries) ? parsed.injuries.filter(isInjury) : [],
      condition: validCond,
    };
  } catch {
    return EMPTY_STORE;
  }
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

function getDynamicAdvice(condition: Condition, workouts: Workout[], injuries: Injury[]) {
  const { sleep, jointPain, focus } = condition;
  const worst = currentInjuries(injuries);
  const trainedToday = workouts.some((w) => isSameDay(w.createdAt));

  if (jointPain >= 4 || (worst && worst.pain >= 4)) {
    const partText = worst ? `${worst.part}や関節` : "関節";
    return { badge: "お休み・ケア優先", title: "今日は無理せず回復に専念しよう", body: `${partText}の痛みが強めだね。重りを使うトレーニングはお休みして、軽いストレッチや入浴でゆっくり体をいたわろう。` };
  }
  if (sleep <= 2 && focus <= 2) {
    return { badge: "軽めメニュー推奨", title: "睡眠と集中力が低め。フォーム重視で軽く！", body: "寝不足と集中力低下が重なるとケガをしやすいよ。いつもの6〜7割の重さで、1〜2セットだけ丁寧に動かせば十分合格！" };
  }
  if (sleep <= 2) {
    return { badge: "ボリューム控えめ", title: "睡眠が浅めだからセット数を減らそう", body: "体の回復が追いついていないかも。種目数をしぼって短時間で切り上げ、今日は早めに休むのが一番のトレーニングだよ。" };
  }
  if (jointPain === 3) {
    return { badge: "部位を選んで実行", title: "違和感がある関節を避けてメニューを組もう", body: "痛みが出る動きはストップ。痛みのない部位（上半身や体幹など）を中心にして、ウォーミングアップを長めにとろうね。" };
  }
  if (focus <= 2) {
    return { badge: "気分転換モード", title: "集中しにくい日は好きな種目だけでOK", body: "無理に追い込まなくて大丈夫。得意な種目を1つだけやって、体が温まったらスッキリ終了しよう！" };
  }
  if (sleep >= 4 && focus >= 4 && jointPain <= 2) {
    return { badge: "ベストコンディション", title: "心も体も絶好調！記録更新のチャンス", body: "睡眠バッチリ、集中力も最高！しっかりウォームアップしてから、メイン種目の重量や回数アップに挑戦してみよう。" };
  }
  if (trainedToday) {
    return { badge: "ナイスファイト", title: "今日のトレーニング完了！しっかり栄養補給を", body: "今日も自分のペースで積み上げられたね。水分とタンパク質をとって、ゆっくり体を休めよう。" };
  }
  return { badge: "通常メニューOK", title: "安定したコンディション！マイペースにいこう", body: "体調のバランスは良好。まずは軽いセットから始めて、体の動きを確かめながら進めていこうね。" };
}

function CatFace({ className = "h-14 w-14" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="#e0f2fe" />
      <path d="M27 52 C22 28, 28 18, 48 31 Z" fill="#ffffff" stroke="#38bdf8" strokeWidth="3" strokeLinejoin="round" />
      <path d="M93 52 C98 28, 92 18, 72 31 Z" fill="#ffffff" stroke="#38bdf8" strokeWidth="3" strokeLinejoin="round" />
      <path d="M31 46 C29 32, 32 26, 44 34 Z" fill="#bae6fd" />
      <path d="M89 46 C91 32, 88 26, 76 34 Z" fill="#bae6fd" />
      <ellipse cx="60" cy="63" rx="36" ry="30" fill="#ffffff" stroke="#38bdf8" strokeWidth="3" />
      <path d="M56 34 Q60 42 64 34" fill="#2dd4bf" />
      <ellipse cx="38" cy="68" rx="6" ry="3.8" fill="#99f6e4" opacity="0.9" />
      <ellipse cx="82" cy="68" rx="6" ry="3.8" fill="#99f6e4" opacity="0.9" />
      <circle cx="44" cy="59" r="5" fill="#0f172a" />
      <circle cx="76" cy="59" r="5" fill="#0f172a" />
      <circle cx="42.5" cy="57.2" r="1.8" fill="#ffffff" />
      <circle cx="74.5" cy="57.2" r="1.8" fill="#ffffff" />
      <ellipse cx="60" cy="65.5" rx="3" ry="2.2" fill="#38bdf8" />
      <path d="M53 69 Q56.5 73 60 68.5 Q63.5 73 67 69" fill="none" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 60 L30 62 M19 67 L29 67" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <path d="M100 60 L90 62 M101 67 L91 67" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 90 Q60 97 80 90" fill="none" stroke="#14b8a6" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="60" cy="95" r="5.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
    </svg>
  );
}

function Stars({ value, onChange }: { value: number; onChange?: (next: number) => void }) {
  return (
    <div className="flex gap-1" role={onChange ? "radiogroup" : undefined} aria-label="ケア度レベル">
      {STAR_LEVELS.map((star) => {
        const active = star <= value;
        const cls = `text-[1.35rem] leading-none transition ${active ? "text-[#14b8a6]" : "text-slate-200"} ${onChange ? "px-0.5 active:scale-95" : ""}`;
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
  const [condition, setCondition] = useState<Condition>(DEFAULT_CONDITION);
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
    if (store.condition) setCondition(store.condition);
    setInjuryDate(todayString());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ workouts, injuries, condition }));
  }, [ready, workouts, injuries, condition]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const alerts = useMemo(() => currentInjuries(injuries), [injuries]);
