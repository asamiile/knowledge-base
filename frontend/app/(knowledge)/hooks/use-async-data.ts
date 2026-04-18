import { useEffect, useState } from "react";

type AsyncDataState<T> =
  | { loading: true; data: null; error: null }
  | { loading: false; data: T; error: null }
  | { loading: false; data: null; error: string };

/**
 * 非同期データ取得の共通フック。
 * `key` が変わるたびに `fetcher` を再実行する。
 * アンマウント後のstateセットをキャンセルする。
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  key: unknown,
): AsyncDataState<T> {
  const [state, setState] = useState<AsyncDataState<T>>({
    loading: true,
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, data: null, error: null });
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ loading: false, data, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setState({
            loading: false,
            data: null,
            error: e instanceof Error ? e.message : String(e),
          });
      });
    return () => {
      cancelled = true;
    };
    // fetcher は key に依存して呼び出し側で定義されるため deps から省く
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
