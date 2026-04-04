import { KnowledgeStudio } from "@/components/knowledge-studio/knowledge-studio";

export default function KnowledgeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-background flex h-full min-h-0 flex-1 flex-col">
      <KnowledgeStudio />
      {children}
    </div>
  );
}
