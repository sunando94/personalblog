export interface Model {
  id: string;
  name: string;
  size: string;
  description: string;
  enabled: boolean;
}

export const AVAILABLE_MODELS: Model[] = [
  {
    id: "SmolLM2-135M-Instruct-q0f16-MLC",
    name: "SmolLM2 135M (Ultra-light)",
    size: "~200MB",
    description: "Fastest. Best for quick chat. May struggle with complex summaries.",
    enabled: true
  },
  {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 0.5B (Tiny)",
    size: "~350MB",
    description: "Compact. Good for basic tasks, limited context reasoning.",
    enabled: true
  },
  {
    id: "SmolLM2-360M-Instruct-q4f16_1-MLC",
    name: "SmolLM2 360M (Efficient)",
    size: "~450MB",
    description: "Lightweight with improved instruction following.",
    enabled: true
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    name: "Llama 3.2 1B (Smart - Recommended)",
    size: "~600MB",
    description: "Excellent reasoning. Recommended for summaries and complex logic.",
    enabled: true
  },
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 1.5B (Expert)",
    size: "~950MB",
    description: "Strong logic and multilingual capabilities.",
    enabled: true
  },
  {
    id: "Gemma-2-2b-it-q4f16_1-MLC",
    name: "Gemma 2 2B (Popular)",
    size: "~1.4GB",
    description: "Google's state-of-the-art small model",
    enabled: true
  },
  {
    id: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
    name: "Llama 3.2 3B (Balanced)",
    size: "~1.8GB",
    description: "Best balance of speed and quality",
    enabled: true
  },
  {
    id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 3B (Advanced)",
    size: "~1.9GB",
    description: "Alibaba's multilingual powerhouse",
    enabled: true
  },
  {
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    name: "Phi 3.5 Mini (Reasoning)",
    size: "~2.3GB",
    description: "Microsoft's efficient reasoning model",
    enabled: true
  },
  {
    id: "Mistral-7B-Instruct-v0.3-q4f16_1-MLC",
    name: "Mistral 7B v0.3 (Pro)",
    size: "~4.2GB",
    description: "Industry-standard mid-size model",
    enabled: true
  },
  {
    id: "Llama-3.1-8B-Instruct-q4f16_1-MLC",
    name: "Llama 3.1 8B (Powerhouse)",
    size: "~4.7GB",
    description: "Meta's flagship small model",
    enabled: false
  },
  {
    id: "Hermes-3-Llama-3.1-8B-q4f16_1-MLC",
    name: "Hermes 3 Llama 8B (Deep)",
    size: "~4.7GB",
    description: "Advanced fine-tune for complex chat",
    enabled: false
  }
];
