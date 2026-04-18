"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import type { AnalyzeResponse } from "@/lib/api/analyze";
import { postAnalyzeStream } from "@/lib/api/analyze";
import {
  type QuestionHistoryItem,
  getQuestionHistory,
} from "@/lib/api/question-history";

import type { StudioShell } from "./use-studio-shell";

export function useAskAnalyze(shell: StudioShell) {
  const { busy, setBusy, setError, setInfo } = shell;

  const imeComposingRef = useRef(false);
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [topK, setTopK] = useState(5);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
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
    setSubmittedQuestion(question.trim());
    setQuestion("");

    try {
      let accAnswer = "";

      for await (const event of postAnalyzeStream({
        question: question.trim(),
        reindex_sources: false,
        top_k: topK,
        save_question_history: true,
      })) {
        if (event.type === "token") {
          accAnswer += event.content;
          setResult((prev) => ({
            answer: accAnswer,
            key_points: prev?.key_points ?? [],
            citations: prev?.citations ?? [],
          }));
        } else if (event.type === "done") {
          setResult({
            answer: accAnswer,
            key_points: event.key_points,
            citations: event.citations,
          });
          void refreshQuestionHistory();
        } else if (event.type === "error") {
          setError(event.message);
          setResult(null);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [question, topK, refreshQuestionHistory, setBusy, setError, setInfo]);

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
    submittedQuestion,
    topK,
    setTopK,
    result,
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
  };
}
