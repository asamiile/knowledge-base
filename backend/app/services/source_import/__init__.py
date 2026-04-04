"""外部ソースから DATA_DIR へ文書を取り込む（拡張用パッケージ）。"""

from app.services.source_import.arxiv import import_arxiv_to_data_dir

__all__ = ["import_arxiv_to_data_dir"]
