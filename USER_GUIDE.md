# Prompt Architect - User Guide

Welcome to **Prompt Architect**, your professional prompt engineering studio. This guide covers how to set up providers, structure prompts, run tests, and use the advanced tools.

## Core Philosophy

Prompt Architect is built on a **privacy-first, local-only architecture**. 
- API keys are stored only in your browser's local storage (AES-encrypted).
- No telemetry or prompts are ever sent to external databases.
- You have full control over connecting to cloud APIs or running 100% locally with Ollama.

---

## 1. Getting Started: Provider Setup

Before you can run prompts, you need an LLM engine.

### Using Cloud Providers (Gemini, ChatGPT, DeepSeek, Claude, Grok)
1. Click the **SETTINGS** button in the top navigation.
2. If this is your first time, set a local encryption password. This protects your API keys at rest.
3. Select your desired provider and enter your API Key.
4. The system will validate your key. Once successful, you are ready to go.

### Using Local Models (Ollama)
For a completely private, offline workflow:
1. Install [Ollama](https://ollama.com/) on your machine.
2. In your terminal, run: `OLLAMA_ORIGINS="*" ollama serve`
   *(This ensures Prompt Architect can communicate with Ollama across CORS)*.
3. In Prompt Architect, open **SETTINGS** and select the **Local (Ollama)** provider.
4. Click **BROWSE MODELS** to download models like `llama3.1` directly to your machine.

---

## 2. Core Workflow

The typical Prompt Architect workflow consists of four steps.

### Step 1: Initialize
Enter a brief description of your goal (e.g., "Write a marketing email for a new shoe"). The system uses the LLM to structure this request into a standard format.

### Step 2: Component Breakdown
The app breaks your goal into distinct components:
- **Role**: The persona the AI should adopt.
- **Task**: The specific action to take.
- **Context**: Background information.
- **Format**: How the output should look.
- **Constraints**: Rules the AI must follow.

You can manually edit these fields to perfect your baseline prompt.

### Step 3: Variations Generation
Click **Generate Variations**. The LLM will create multiple alternative versions of your prompt (e.g., a "Creative" variation, a "Strict" variation). 

### Step 4: Live Testing
Click the **Play (Test)** button on any variation to send it to the LLM and see the actual output right alongside the prompt. This allows you to rapidly iterate and compare results.

---

## 3. Advanced Features

### ⚔️ The Battle Arena
Not sure which variation is better? 
1. Click **ADD TO ARENA** on exactly two variations.
2. Click **START ARENA BATTLE**.
3. The LLM will execute both prompts, act as an impartial judge, and declare a winner based on how well the outputs met your original constraints.

### 🗜️ Token Compression
Prompts can get long and expensive. 
1. Open the **COMPRESS** tab from the header, or click **Compress** on an individual variation.
2. The AI will rewrite your prompt to use fewer tokens while preserving the core instructions.
3. The UI will display exactly how many tokens were saved and update your estimated cost savings in the Analytics dashboard.

### 📊 Analytics & Telemetry
Click **ANALYTICS** in the header to view your local statistics:
- **Provider Usage**: See which LLMs you rely on most.
- **Cost Savings**: View estimated dollars saved via token compression.
- **Arena Leaderboard**: See which models win the most battles.
*(Note: All data is stored locally on your device).*

### 📚 The Library
Your history is saved automatically. Click **LIBRARY** to review past prompts, variations, and outputs. You can restore any past session to continue editing where you left off.

---

## 4. Troubleshooting

- **"You are currently offline" Error**: Cloud providers require internet. Switch to "Local (Ollama)" to continue working offline.
- **Ollama Connection Failed**: Ensure Ollama is running with the `OLLAMA_ORIGINS="*"` environment variable.
- **Rate Limits (HTTP 429)**: Free API tiers may rate-limit you during Battle Arena runs. The app uses automatic retries, but if it fails, wait a few seconds and try again.
