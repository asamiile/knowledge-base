"""アプリ全体で共有する定数。スキーマ制約とランタイムの切り詰め上限を一致させる。"""

# 質問テキストの最大長（QuestionHistory.question, AnalyzeRequest の実行時切り詰め）
MAX_QUESTION_LENGTH: int = 8_000

# SavedSearchRunLog フィールド上限（スキーマの max_length と一致）
MAX_RUN_LOG_ERROR_LENGTH: int = 16_000
MAX_RUN_LOG_CONTENT_LENGTH: int = 512_000
