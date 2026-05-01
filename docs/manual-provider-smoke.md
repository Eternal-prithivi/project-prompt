# Manual Provider Smoke Checklist

Use this outside CI with real credentials whenever provider integrations or credential flows change.

## Preconditions

- Start the app with `npm run dev`
- Have valid credentials for each provider you want to verify
- If testing Ollama, start it with `ollama serve`

## Common flow

1. Open Settings.
2. Enter an encryption password for the current browser session.
3. Select the provider under test.
4. Enter the provider key or Ollama URL/model.
5. Save and apply the provider.
6. Run a simple prompt end to end:
   - Analyze a prompt
   - Generate variations
   - Run `Live Resilience Test` on one variation
7. Confirm the response is non-empty and provider-specific errors are absent.

## Provider-specific notes

- `Gemini`: validate the API key if you changed it, then run one variation.
- `DeepSeek`: validate the API key if you changed it, then run one variation.
- `ChatGPT / OpenAI`: save credentials, reload the app, unlock with the same password, and verify the key is restored before running one variation.
- `Claude`: save credentials, reload the app, unlock, and run one variation.
- `Grok`: save credentials, reload the app, unlock, and run one variation.
- `Ollama`: verify `/api/tags` loads available models, pick a model from the gallery if needed, then run one variation.

## Compression smoke

1. Open the standalone compression modal.
2. Compress a prompt containing bracketed variables like `[TOPIC]`.
3. Confirm the compressed result preserves the variable.
4. Try safe mode with an intentionally lossy response and confirm the UI rejects it.
