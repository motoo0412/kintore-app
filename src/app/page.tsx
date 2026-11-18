"use client";

import React, { useState, useEffect } from "react";

type Condition = {
  sleep: number;
  joint: number;
  focus: number;
  nutrition: number;
};

type ExerciseSet = {
  id: string;
  name: string;
  weight: number;
  reps: number;
  sets: number;
};

type ChatMessage = {
  role: "ai" | "user";
  text: string;
};

export default function TotonouWorkoutApp() {
  const [activeTab, setActiveTab] = useState<"condition" | "myset" | "calendar">("condition");
const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [condition, setCondition] = useState<Condition>({
    sleep: 3,
    joint: 4,
    focus: 3,
    nutrition: 4,
  });

  const [mysets, setMysets] = useState<ExerciseSet[]>([
    { id: "1", name: "ブルガリアンスクワット", weight: 60, reps: 10, sets: 3 },
    { id: "2", name: "ダンベルベンチプレス", weight: 50, reps: 10, sets: 3 },
    { id: "3", name: "ルーマニアンデッドリフト", weight: 45, reps: 12, sets: 3 },
  ]);
  const [isAdjusted, setIsAdjusted] = useState(false);

  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [newReps, setNewReps] = useState("");
  const [newSets, setNewSets] = useState("3");

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: "今日の体調スライダーをもとにメニューを調整できます。「肩が少し重い」「時間がない」など気軽に相談してください。",
    },
  ]);

  const [records, setRecords] = useState<string[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(2);
   const [isLoaded, setIsLoaded] = useState(false);
  const [today, setToday] = useState<Date>(() => new Date(2026, 0, 1));

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;

  useEffect(() => {
    setToday(new Date());
    const savedSets = localStorage.getItem("totonou_ts_sets");
    const savedRecords = localStorage.getItem("totonou_ts_records");
    const savedGoal = localStorage.getItem("totonou_ts_goal");
    if (savedSets) setMysets(JSON.parse(savedSets));
    if (savedRecords) setRecords(JSON.parse(savedRecords));
    if (savedGoal) setWeeklyGoal(Number(savedGoal));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("totonou_ts_sets", JSON.stringify(mysets));
    localStorage.setItem("totonou_ts_records", JSON.stringify(records));
    localStorage.setItem("totonou_ts_goal", String(weeklyGoal));
  }, [mysets, records, weeklyGoal, isLoaded]);
  const avgScore = (condition.sleep + condition.joint + condition.focus + condition.nutrition) / 4;

  const getConditionAdvice = () => {
    if (condition.joint <= 2) {
      return {
        label: "関節ケア優先モード",
        text: "関節に違和感があります。今日は重量を約7割に落とし、痛みのない可動域で丁寧にととのえましょう。",
        ratio: 0.7,
      };
    }
    if (avgScore >= 4.2) {
      return {
        label: "クリア・好調モード",
        text: "心身ともにととのっています。いつものマイセットを美しいフォームでやり切りましょう。",
        ratio: 1.0,
      };
    }
    if (avgScore >= 2.8) {
      return {
        label: "バランス調整モード",
        text: "まずまずの状態です。無理に重量を追わず、8〜9割の負荷で「自分との約束」を果たしましょう。",
        ratio: 0.85,
      };
    }
    return {
      label: "リカバリー重視モード",
      text: "疲労が溜まっています。今日は軽めの重量（7割）で血流を促し、ジムに来た自分を褒めて終えましょう。",
      ratio: 0.7,
    };
  };

  const advice = getConditionAdvice();

  const chartSize = 220;
  const center = chartSize / 2;
  const maxRadius = 72;
  const values = [condition.sleep, condition.joint, condition.focus, condition.nutrition];
  const angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
  const labels = ["昨日の睡眠", "関節の快適さ", "集中力", "栄養状態"];

  const polygonPoints = values
    .map((val, i) => {
      const r = (maxRadius / 5) * val;
      const x = center + r * Math.cos(angles[i]);
      const y = center + r * Math.sin(angles[i]);
      return `${x},${y}`;
    })
    .join(" ");

  const handleAddSet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newWeight || !newReps) return;
    const newItem: ExerciseSet = {
      id: Date.now().toString(),
      name: newName.trim(),
      weight: Number(newWeight),
      reps: Number(newReps),
      sets: Number(newSets) || 3,
    };
    setMysets([...mysets, newItem]);
    setNewName("");
    setNewWeight("");
    setNewReps("");
  };

  const handleDeleteSet = (id: string) => {
    setMysets(mysets.filter((item) => item.id !== id));
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    const prevAiMsg = [...messages].reverse().find((m) => m.role === "ai")?.text || "";
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");

    setTimeout(() => {
      const firstExercise = mysets[0]?.name || "メイン種目";
      const secondExercise = mysets[1]?.name || "サブ種目";
      let reply = "";

      if (userMsg.includes("なぜ") || userMsg.includes("理由") || userMsg.includes("どう") && prevAiMsg.includes("調整")) {
        reply = `今回のスコアでは特に「${
          condition.joint <= 3 ? "関節の快適さ" : condition.sleep <= 3 ? "昨日の睡眠" : "疲労感"
        }」が控えめなため、高重量でのフォーム崩れを防ぐ狙いがあります。まずは${firstExercise}の1セット目の感触を見てから決めても大丈夫ですよ。`;
      } else if (userMsg.includes("いける") || userMsg.includes("上げ") || userMsg.includes("重く") || userMsg.includes("調子いい")) {
        reply = `いいですね！その感覚があるなら、${firstExercise}は通常重量（100%）でしっかり刺激を入れつつ、後半の${secondExercise}以降で余力を残す「メリハリ配分」にしてみましょう。`;
      } else if (userMsg.includes("肩") || userMsg.includes("腰") || userMsg.includes("膝") || userMsg.includes("痛")) {
        const target = mysets.find((m) =>
          (userMsg.includes("肩") && (m.name.includes("プレス") || m.name.includes("懸垂"))) ||
          ((userMsg.includes("腰") || userMsg.includes("膝")) && (m.name.includes("スクワット") || m.name.includes("デッド") || m.name.includes("RDL")))
        );
        reply = target
          ? `違和感があるなら、今日の「${target.name}」は思い切ってパスするか、可動域を浅くして軽めに流しましょう。他の種目だけでも十分約束は果たせます。`
          : `違和感がある部位に負荷が逃げるのを防ぐため、今日は種目数を2つに絞り、丁寧なネガティブ動作（下ろす動き）だけでととのえましょう。`;
      } else if (userMsg.includes("時間") || userMsg.includes("短") || userMsg.includes("サクッと")) {
        reply = `時短モードですね！今日は「${firstExercise}」と「${secondExercise}」の2種目だけに絞り、セット数を各2セットに減らして25分で綺麗に切り上げましょう。`;
      } else {
        reply = `「${userMsg}」ですね。今のマイセット（${mysets.length}種目）をベースにするなら、最初の「${firstExercise}」を一番集中して行い、残りは体調に合わせてセット数を1つ減らす調整が今のコンディション（平均${avgScore.toFixed(1)}）に一番合っています。`;
      }

      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    }, 400);
  };


  const handleCompleteWorkout = () => {
    if (!records.includes(todayStr)) {
      setRecords([...records, todayStr]);
    }
    setActiveTab("calendar");
  };

  const getWeeklyCount = () => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return records.filter((r) => {
      const d = new Date(r + "T00:00:00");
      return d >= startOfWeek && d <= today;
    }).length;
  };

  const weeklyCount = getWeeklyCount();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-50/50 text-slate-800 pb-24 font-sans selection:bg-sky-200">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-sky-100 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_8px_#0ea5e9]" />
            <h1 className="text-lg font-bold tracking-wider text-slate-800">ととのう筋トレ</h1>
          </div>
          <span className="text-xs font-semibold text-sky-600 bg-sky-100/80 px-3 py-1 rounded-full">
            {month + 1}月{today.getDate()}日
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-5">
        {activeTab === "condition" && (
          <div className="space-y-5">
            <div className="bg-white/90 backdrop-blur rounded-3xl p-6 shadow-[0_8px_30px_rgb(14,165,233,0.07)] border border-sky-100 flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-500">
                  Condition Wave
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  {advice.label}
                </span>
              </div>

              <svg width={chartSize} height={chartSize} className="overflow-visible my-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <polygon
                    key={level}
                    points={angles
                      .map((ang) => {
                        const r = (maxRadius / 5) * level;
                        return `${center + r * Math.cos(ang)},${center + r * Math.sin(ang)}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#e0f2fe"
                    strokeWidth="1.2"
                  />
                ))}
                {angles.map((ang, i) => (
                  <g key={i}>
                    <line
                      x1={center}
                      y1={center}
                      x2={center + maxRadius * Math.cos(ang)}
                      y2={center + maxRadius * Math.sin(ang)}
                      stroke="#e0f2fe"
                      strokeWidth="1.2"
                    />
                    <text
                      x={center + (maxRadius + 24) * Math.cos(ang)}
                      y={center + (maxRadius + 20) * Math.sin(ang)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[11px] font-semibold fill-slate-500"
                    >
                      {labels[i]}
                    </text>
                  </g>
                ))}
                <polygon
                  points={polygonPoints}
                  fill="rgba(14, 165, 233, 0.22)"
                  stroke="#0ea5e9"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  className="transition-all duration-200 ease-out"
                />
                {values.map((val, i) => {
                  const r = (maxRadius / 5) * val;
                  const x = center + r * Math.cos(angles[i]);
                  const y = center + r * Math.sin(angles[i]);
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="4.5"
                      fill="#ffffff"
                      stroke="#0284c7"
                      strokeWidth="2.5"
                      className="transition-all duration-200 ease-out"
                    />
                  );
                })}
              </svg>

              <p className="text-xs text-slate-600 bg-sky-50/80 rounded-2xl p-3.5 text-center leading-relaxed border border-sky-100/80">
                {advice.text}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(14,165,233,0.05)] border border-sky-100">
              <button
                onClick={() => setIsSliderOpen(!isSliderOpen)}
                className="w-full flex justify-between items-center text-sm font-bold text-slate-700"
              >
                <span>今日の体調を入力・調整する</span>
                <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-3 py-1 rounded-full">
                  {isSliderOpen ? "閉じる ▲" : "開く ▼"}
                </span>
              </button>

              {isSliderOpen && (
                <div className="space-y-5 mt-5 pt-5 border-t border-sky-100">
                  {[
                    { key: "sleep", label: "昨日の睡眠", low: "寝不足", high: "熟睡" },
                    { key: "joint", label: "関節の怪我・違和感", low: "痛みあり", high: "快適" },
                    { key: "focus", label: "疲労感・集中力", low: "疲労大", high: "冴えている" },
                    { key: "nutrition", label: "栄養状態", low: "不足気味", high: "十分" },
                  ].map((item) => {
                    const val = condition[item.key as keyof Condition];
                    return (
                      <div key={item.key} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-semibold text-slate-700">{item.label}</span>
                          <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full">
                            {val} / 5
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          step={1}
                          value={val}
                          onChange={(e) =>
                            setCondition({ ...condition, [item.key]: Number(e.target.value) })
                          }
                          className="w-full h-2.5 bg-sky-100 rounded-full appearance-none cursor-pointer accent-sky-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>{item.low}</span>
                          <span>{item.high}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveTab("myset")}
              className="w-full py-4 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm shadow-[0_6px_20px_rgba(14,165,233,0.3)] transition active:scale-[0.98]"
            >
              この体調でマイセットを確認する →
            </button>
          </div>
        )}
        {activeTab === "myset" && (
          <div className="space-y-5">
            <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(14,165,233,0.06)] border border-sky-100 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-bold text-slate-800">マイセット</h2>
                <button
                  onClick={() => setIsAdjusted(!isAdjusted)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition border ${
                    isAdjusted
                      ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                      : "bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100"
                  }`}
                >
                  {isAdjusted ? "✨ 体調調整 ON" : "体調に合わせて調整"}
                </button>
              </div>

              <div className="space-y-2.5">
                {mysets.map((item) => {
                  const adjustedWeight =
                    Math.round((item.weight * advice.ratio) / 2.5) * 2.5;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100"
                    >
                      <div>
                        <h3 className="font-bold text-sm text-slate-800">{item.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isAdjusted && advice.ratio < 1 ? (
                            <>
                              <span className="text-sky-600 font-bold text-sm">
                                {adjustedWeight}kg
                              </span>{" "}
                              <span className="line-through text-slate-400">
                                ({item.weight}kg)
                              </span>
                            </>
                          ) : (
                            <span className="font-semibold text-slate-700">{item.weight}kg</span>
                          )}{" "}
                          × {item.reps}回 × {item.sets}セット
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteSet(item.id)}
                        className="text-slate-300 hover:text-rose-400 text-lg px-2 transition"
                        aria-label="削除"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleCompleteWorkout}
                className="w-full py-4 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm shadow-[0_6px_20px_rgba(14,165,233,0.3)] transition active:scale-[0.98]"
              >
                今日の約束を達成した（スタンプを押す）
              </button>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(14,165,233,0.05)] border border-sky-100 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <h3 className="text-xs font-bold text-slate-600">AIメニュー調整相談</h3>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`text-xs p-3 rounded-2xl leading-relaxed ${
                      m.role === "ai"
                        ? "bg-sky-50 text-slate-700 border border-sky-100"
                        : "bg-slate-800 text-white ml-8"
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="例：少し疲労感がある、30分で終えたい"
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 transition"
                >
                  相談
                </button>
              </form>
            </div>

            <form
              onSubmit={handleAddSet}
              className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(14,165,233,0.05)] border border-sky-100 space-y-3"
            >
              <h3 className="text-xs font-bold text-slate-600">定番種目を追加</h3>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="種目名"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="col-span-2 text-xs px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-sky-400"
                />
                <input
                  type="number"
                  placeholder="kg"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="text-xs px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-sky-400"
                />
                <input
                  type="number"
                  placeholder="回数"
                  value={newReps}
                  onChange={(e) => setNewReps(e.target.value)}
                  className="text-xs px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-sky-400"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-sky-50 text-sky-600 font-bold text-xs hover:bg-sky-100 transition"
              >
                ＋ マイセットに登録
              </button>
            </form>
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="space-y-5">
            <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(14,165,233,0.06)] border border-sky-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-800">今週の自分との約束</span>
                <select
                  value={weeklyGoal}
                  onChange={(e) => setWeeklyGoal(Number(e.target.value))}
                  className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-xl px-3 py-1.5 focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      週 {n} 回目標
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-1">
                {Array.from({ length: weeklyGoal }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2.5 flex-1 rounded-full transition-all duration-300 ${
                      i < weeklyCount
                        ? "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.4)]"
                        : "bg-slate-100"
                    }`}
                  />
                ))}
              </div>

              <p className="text-xs font-semibold text-sky-700 pt-1">
                {weeklyCount >= weeklyGoal
                  ? `今週の約束達成（${weeklyCount} / ${weeklyGoal}回）！あとはしっかり休養をとろう。`
                  : `今週 ${weeklyCount} / ${weeklyGoal} 回達成（あと ${
                      weeklyGoal - weeklyCount
                    } 回で約束完了）`}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(14,165,233,0.06)] border border-sky-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold text-slate-800">
                  {year}年 {month + 1}月
                </h2>
                <span className="text-[11px] text-slate-400">淡々と積み上げる記録</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
                {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
                  <div key={d} className="text-[11px] font-semibold text-slate-400">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(
                    day
                  ).padStart(2, "0")}`;
                  const isStamped = records.includes(dateKey);

                  return (
                    <div
                      key={day}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center text-xs transition ${
                        isStamped
                          ? "bg-sky-500 text-white font-bold shadow-[0_4px_12px_rgba(14,165,233,0.35)]"
                          : "bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span>{day}</span>
                      {isStamped && <span className="text-[8px] mt-0.5 opacity-90">済</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
      <nav className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-sky-100 py-2.5 px-6 z-20">
        <div className="max-w-md mx-auto flex justify-around items-center">
          {[
            { id: "condition", label: "体調チェック", icon: "💧" },
            { id: "myset", label: "マイセット", icon: "📋" },
            { id: "calendar", label: "約束カレンダー", icon: "🗓️" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition ${
                  active ? "text-sky-600 font-bold" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-[11px]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
