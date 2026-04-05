"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type SeparatedResultsProps = {
  className?: string;
  /** 各ブロックのあいだに横罫線を挟む */
  children: React.ReactNode;
};

/**
 * 検索ヒット・引用・セクションなど「縦に並べて線で区切る」レイアウト用。
 * 子はそれぞれ独立したブロック（article / section 等）にしておくとよい。
 */
export function SeparatedResults({
  className,
  children,
}: SeparatedResultsProps) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-col", className)}>
      {items.map((child, i) => {
        const key =
          React.isValidElement(child) && child.key != null
            ? child.key
            : `separated-${i}`;
        return (
          <React.Fragment key={key}>
            {i > 0 && (
              <div className="border-border my-4 border-t" aria-hidden />
            )}
            {child}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export type SeparatedResultsListProps<T> = {
  className?: string;
  items: T[];
  keyExtractor: (item: T, index: number) => React.Key;
  renderItem: (item: T, index: number) => React.ReactNode;
};

/** 配列から同じ区切りレイアウトを組み立てる（キーを安定させやすい） */
export function SeparatedResultsList<T>({
  className,
  items,
  keyExtractor,
  renderItem,
}: SeparatedResultsListProps<T>) {
  if (items.length === 0) return null;
  return (
    <div className={cn("flex flex-col", className)}>
      {items.map((item, index) => (
        <React.Fragment key={keyExtractor(item, index)}>
          {index > 0 && (
            <div className="border-border my-4 border-t" aria-hidden />
          )}
          {renderItem(item, index)}
        </React.Fragment>
      ))}
    </div>
  );
}
