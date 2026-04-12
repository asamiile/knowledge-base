import { KnowledgeAuthGuard } from "./auth-guard";
import { KnowledgeStudioProvider } from "./knowledge-studio-context";

export default function KnowledgeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-background flex h-full min-h-0 flex-1 flex-col">
      <KnowledgeAuthGuard>
        <KnowledgeStudioProvider>{children}</KnowledgeStudioProvider>
      </KnowledgeAuthGuard>
    </div>
  );
}
