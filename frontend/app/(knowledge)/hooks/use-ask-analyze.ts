"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import type { AnalyzeResponse } from "@/lib/api/analyze";
import { postAnalyze } from "@/lib/api/analyze";
import {
  type QuestionHistoryItem,
  getQuestionHistory,
} from "@/lib/api/question-history";

import type { StudioShell } from "./use-studio-shell";

export function useAskAnalyze(shell: StudioShell) {
  const { busy, setBusy, setError, setInfo } = shell;

  const imeComposingRef = useRef(false);
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(5);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [askOptionsOpen, setAskOptionsOpen] = useState(false);
  const askOptionsTriggerRef = useRef<HTMLButtonElement>(null);
  const askOptionsPanelRef = useRef<HTMLDivElement>(null);
  const [askOptionsCoords, setAskOptionsCoords] = useState<{
    left: number;
    bottom: number;
  } | null>(null);
  const [questionHistory, setQuestionHistory] = useState<QuestionHistoryItem[]>(
    [],
  );

  const refreshQuestionHistory = useCallback(async () => {
    try {
      setQuestionHistory(await getQuestionHistory(50));
    } catch {
      setQuestionHistory([]);
    }
  }, []);

  useEffect(() => {
    void refreshQuestionHistory();
  }, [refreshQuestionHistory]);

  const statsRows = useMemo(() => {
    if (!result) return [];
    return [
      { label: "top_k（リクエスト）", value: String(topK) },
      { label: "citations 数", value: String(result.citations.length) },
      { label: "key_points 数", value: String(result.key_points.length) },
      ...(latencyMs != null
        ? [{ label: "レイテンシ（ms）", value: String(latencyMs) }]
        : []),
    ];
  }, [result, topK, latencyMs]);

  useLayoutEffect(() => {
    if (!askOptionsOpen) {
      setAskOptionsCoords(null);
      return;
    }
    const panelW = 320;
    const gap = 8;
    const update = () => {
      const el = askOptionsTriggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const left = Math.min(
        rect.left,
        Math.max(gap, window.innerWidth - panelW - gap),
      );
      setAskOptionsCoords({
        left,
        bottom: window.innerHeight - rect.top + gap,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [askOptionsOpen]);

  useEffect(() => {
    if (!askOptionsOpen) return;
    const onDoc = (e: PointerEvent) => {
      const t = e.target as Node;
      if (askOptionsTriggerRef.current?.contains(t)) return;
      if (askOptionsPanelRef.current?.contains(t)) return;
      setAskOptionsOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAskOptionsOpen(false);
    };
    document.addEventListener("pointerdown", onDoc, true);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onDoc, true);
      document.removeEventListener("keydown", onEsc);
    };
  }, [askOptionsOpen]);

  const onAnalyze = useCallback(async () => {
    setError(null);
    setInfo(null);
    setBusy("analyze");
    setResult(null);
    setLatencyMs(null);
    const t0 = performance.now();
    try {
      const data = await postAnalyze({
        question: question.trim(),
        reindex_sources: false,
        top_k: topK,
        save_question_history: true,
      });
      setResult(data);
      setLatencyMs(Math.round(performance.now() - t0));
      void refreshQuestionHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [question, topK, refreshQuestionHistory, setBusy, setError, setInfo]);

  const applyQuestionHistoryItem = useCallback((item: QuestionHistoryItem) => {
    setQuestion(item.question);
    setResult(item.response);
    setLatencyMs(null);
  }, []);

  const submitAnalyze = useCallback(() => {
    if (busy !== null || !question.trim()) return;
    setAskOptionsOpen(false);
    void onAnalyze();
  }, [busy, question, onAnalyze]);

  const onAskQuestionCompositionStart = useCallback(() => {
    imeComposingRef.current = true;
  }, []);

  const onAskQuestionCompositionEnd = useCallback(() => {
    imeComposingRef.current = false;
  }, []);

  const onAskQuestionTextareaKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      if (imeComposingRef.current || e.nativeEvent.isComposing) {
        return;
      }
      e.preventDefault();
      submitAnalyze();
    },
    [submitAnalyze],
  );

  return {
    question,
    setQuestion,
    topK,
    setTopK,
    result,
    statsRows,
    askOptionsOpen,
    setAskOptionsOpen,
    askOptionsTriggerRef,
    askOptionsPanelRef,
    askOptionsCoords,
    onAskQuestionCompositionStart,
    onAskQuestionCompositionEnd,
    onAskQuestionTextareaKeyDown,
    submitAnalyze,
    questionHistory,
    refreshQuestionHistory,
    applyQuestionHistoryItem,
  };
}
