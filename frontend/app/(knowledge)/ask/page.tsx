"use client";

import { AskAnalyzePanel } from "../components/ask-analyze-panel";
import { useKnowledgeStudio } from "../knowledge-studio-context";

/** `/ask` — 質問（RAG 分析） */
export default function AskPage() {
  const {
    error,
    info,
    result,
    question,
    setQuestion,
    onAskQuestionCompositionStart,
    onAskQuestionCompositionEnd,
    onAskQuestionTextareaKeyDown,
    busy,
    askOptionsTriggerRef,
    askOptionsPanelRef,
    askOptionsOpen,
    setAskOptionsOpen,
    askOptionsCoords,
    topK,
    setTopK,
    submitAnalyze,
    questionHistory,
    refreshQuestionHistory,
    stats,
    statsLoading,
  } = useKnowledgeStudio();

  return (
    <AskAnalyzePanel
      error={error}
      info={info}
      result={result}
      question={question}
      setQuestion={setQuestion}
      onAskQuestionCompositionStart={onAskQuestionCompositionStart}
      onAskQuestionCompositionEnd={onAskQuestionCompositionEnd}
      onAskQuestionTextareaKeyDown={onAskQuestionTextareaKeyDown}
      busy={busy}
      askOptionsTriggerRef={askOptionsTriggerRef}
      askOptionsPanelRef={askOptionsPanelRef}
      askOptionsOpen={askOptionsOpen}
      setAskOptionsOpen={setAskOptionsOpen}
      askOptionsCoords={askOptionsCoords}
      topK={topK}
      setTopK={setTopK}
      submitAnalyze={submitAnalyze}
      questionHistory={questionHistory}
      refreshQuestionHistory={refreshQuestionHistory}
      isEmpty={!statsLoading && (stats?.document_chunks ?? 0) === 0}
    />
  );
}
