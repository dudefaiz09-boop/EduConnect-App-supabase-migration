import { AiUserContext, AiModule } from '../ai-context.service.js';

export interface AiContextProvider {
  module: AiModule;
  getContext(context: AiUserContext): Promise<string | null>;
}
