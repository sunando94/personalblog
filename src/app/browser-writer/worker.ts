import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

/**
 * WebWorkerMLCEngineHandler handles communications between the main thread
 * and the worker thread where the actual LLM computation happens.
 */
let handler: WebWorkerMLCEngineHandler;

self.onmessage = (msg: MessageEvent) => {
  if (!handler) {
    handler = new WebWorkerMLCEngineHandler();
  }
  handler.onmessage(msg);
};
