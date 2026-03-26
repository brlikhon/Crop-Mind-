import { useState, useCallback } from "react";
import { DiagnosticForm } from "@/components/DiagnosticForm";
import { AgentVisualizer } from "@/components/AgentVisualizer";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { streamDiagnose, useSearchCases, type DiagnoseResponse, type AgentTrace, type McpToolCallEntry, type StreamEvent } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";

export default function DiagnosePage() {
  const { toast } = useToast();
  const searchMutation = useSearchCases();

  const [hasStarted, setHasStarted] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveTraces, setLiveTraces] = useState<AgentTrace[]>([]);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [liveMcpCalls, setLiveMcpCalls] = useState<McpToolCallEntry[]>([]);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnoseResponse | null>(null);

  const handleStreamEvent = useCallback((event: StreamEvent) => {
    switch (event.type) {
      case "agent_started":
        setActiveAgents(prev => [...prev, event.agentName]);
        break;
      case "agent_completed":
        setActiveAgents(prev => prev.filter(a => a !== event.agentName));
        setLiveTraces(prev => [...prev, event.trace]);
        break;
      case "mcp_tool_call":
        setLiveMcpCalls(prev => [...prev, event.call]);
        break;
      case "synthesis_started":
        setIsSynthesizing(true);
        break;
      case "complete":
        setDiagnosisResult(event.result);
        setIsStreaming(false);
        setIsSynthesizing(false);
        break;
    }
  }, []);

  const handleDiagnose = async (query: string, image?: File) => {
    setHasStarted(true);
    setIsStreaming(true);
    setLiveTraces([]);
    setActiveAgents([]);
    setLiveMcpCalls([]);
    setIsSynthesizing(false);
    setDiagnosisResult(null);

    searchMutation.reset();
    searchMutation.mutate({ symptomsDescription: query, topK: 3 }, {
      onError: (err) => {
        console.error("Vector search failed:", err);
        toast({
          title: "Historical Search Issue",
          description: "Could not retrieve similar cases.",
          variant: "destructive"
        });
      }
    });

    try {
      await streamDiagnose(query, {
        onEvent: handleStreamEvent,
        onError: (err) => {
          toast({
            title: "Diagnosis Failed",
            description: err.message,
            variant: "destructive",
          });
          setIsStreaming(false);
          setHasStarted(false);
        },
      }, image);
    } catch (err) {
      toast({
        title: "Diagnosis Failed",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
      setIsStreaming(false);
      setHasStarted(false);
    }
  };

  const isPending = isStreaming;
  const showResults = hasStarted && (liveTraces.length > 0 || liveMcpCalls.length > 0 || diagnosisResult != null);

  return (
    <div className="w-full flex flex-col items-center pb-24">
      <div className={`w-full transition-all duration-500 ${hasStarted ? 'mb-8' : 'mt-12 md:mt-24'}`}>
        <DiagnosticForm onSubmit={handleDiagnose} isPending={isPending} />
      </div>

      {hasStarted && (
        <AgentVisualizer
          traces={diagnosisResult?.traces ?? liveTraces}
          activeAgents={diagnosisResult ? [] : activeAgents}
          mcpCalls={diagnosisResult?.mcpToolCalls ?? liveMcpCalls}
          isSynthesizing={diagnosisResult ? false : isSynthesizing}
          isLoading={isPending}
          totalDurationMs={diagnosisResult?.totalDurationMs}
        />
      )}

      {showResults && (
        <ResultsDashboard
          diagnosis={diagnosisResult}
          cases={searchMutation.data}
          liveTraces={liveTraces}
          liveMcpCalls={liveMcpCalls}
          isStreaming={isStreaming}
        />
      )}
    </div>
  );
}
