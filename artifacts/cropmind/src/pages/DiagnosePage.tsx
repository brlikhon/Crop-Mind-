import { useState } from "react";
import { DiagnosticForm } from "@/components/DiagnosticForm";
import { AgentVisualizer } from "@/components/AgentVisualizer";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { useDiagnoseCrop, useSearchCases } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";

export default function DiagnosePage() {
  const { toast } = useToast();
  const diagnoseMutation = useDiagnoseCrop();
  const searchMutation = useSearchCases();
  
  const [hasStarted, setHasStarted] = useState(false);

  const handleDiagnose = (query: string) => {
    setHasStarted(true);
    
    // Fire both mutations in parallel
    diagnoseMutation.mutate({ query }, {
      onError: (err) => {
        toast({
          title: "Diagnosis Failed",
          description: err.message,
          variant: "destructive",
        });
        setHasStarted(false);
      }
    });

    searchMutation.mutate({ symptomsDescription: query, topK: 3 }, {
      onError: (err) => {
        console.error("Vector search failed:", err);
        // Don't fail the whole UI if just search fails, but log it
        toast({
          title: "Historical Search Issue",
          description: "Could not retrieve similar cases.",
          variant: "destructive"
        });
      }
    });
  };

  const isPending = diagnoseMutation.isPending;

  return (
    <div className="w-full flex flex-col items-center pb-24">
      {/* Show form only if we haven't started OR if we want to allow new queries from the top. 
          Let's keep the form at the top so users can tweak and resubmit. */}
      
      <div className={`w-full transition-all duration-500 ${hasStarted ? 'mb-8' : 'mt-12 md:mt-24'}`}>
        <DiagnosticForm onSubmit={handleDiagnose} isPending={isPending} />
      </div>

      {isPending && <AgentVisualizer />}

      {!isPending && diagnoseMutation.data && (
        <ResultsDashboard 
          diagnosis={diagnoseMutation.data} 
          cases={searchMutation.data} 
        />
      )}
    </div>
  );
}
