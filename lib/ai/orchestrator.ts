import { ContextParams } from "./context";
import { runAIPipeline, PipelineParams } from "./pipeline";

export interface OrchestrationResult {
  response: Response;
  modelUsed: string;
}

export async function orchestrateRequest(params: ContextParams, signal?: AbortSignal): Promise<OrchestrationResult> {
  // Construct parameters matching PipelineParams
  const pipelineParams: PipelineParams = {
    chatId: (params as any).chatId || "temporary-session",
    prompt: params.prompt,
    subject: params.subject,
    mode: params.mode,
    profileName: params.profileName,
    profileBio: params.profileBio,
    preferences: params.preferences,
    fileContext: params.fileContext,
    messages: params.messages || []
  };

  const result = await runAIPipeline(pipelineParams, signal);

  return result;
}

