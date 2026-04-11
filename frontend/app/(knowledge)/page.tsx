"use client";

import { AskAnalyzePanel } from "./components/ask-analyze-panel";
import { useKnowledgeStudio } from "./knowledge-studio-context";

/** `/` — 質問（RAG 分析） */
export default function AskPage() {
  const {
    error,
    info,
    result,
    statsRows,
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
    applyQuestionHistoryItem,
  } = useKnowledgeStudio();

  return (
    <AskAnalyzePanel
      error={error}
      info={info}
      result={result}
      statsRows={statsRows}
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
      applyQuestionHistoryItem={applyQuestionHistoryItem}
    />
  );
}
