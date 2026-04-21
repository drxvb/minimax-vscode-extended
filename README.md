# MiniMax AI Extended — VSCode Extension

A community fork of [zelosleone/minimax-vscode](https://github.com/zelosleone/minimax-vscode) that adds the newer MiniMax Token Plan models (M2.5 High-Speed, M2.7, M2.7 High-Speed) to VS Code's Language Model Chat Provider API.

> **Attribution:** This is a fork. Core architecture, provider implementation, and authentication code were written by [zelosleone](https://github.com/zelosleone) and are used here under the original MIT license. See `LICENSE`.

## What this fork adds over upstream 1.0.2

- `MiniMax-M2.7` — current default model
- `MiniMax-M2.7-highspeed` — 2× request quota, faster throughput
- `MiniMax-M2.5-highspeed` — 2× request quota, faster throughput
- Live-tested against `https://api.minimax.io/v1` — every model ID in the list responds successfully on a valid Token Plan account

## Supported Models

| Model ID | Context | Request Quota |
|---|---|---|
| `MiniMax-M2.7` | ~200K tokens | 1× per call |
| `MiniMax-M2.7-highspeed` | ~200K tokens | 2× per call |
| `MiniMax-M2.5` | ~200K tokens | 1× per call |
| `MiniMax-M2.5-highspeed` | ~200K tokens | 2× per call |
| `MiniMax-M2.1` | ~200K tokens | 1× per call |
| `MiniMax-M2` | ~200K tokens | 1× per call |

## Capabilities

- **Tool calling**: yes (all models)
- **Reasoning / thinking blocks**: yes (`<think>…</think>` in text mode, or `LanguageModelThinkingPart` under proposed API)
- **Vision / image input**: **no** — MiniMax's M2.x family is text-only. Attached images are silently dropped by the API, so this extension does not declare vision capability.

## Requirements

- VS Code 1.109.0 or later
- A MiniMax API key with Token Plan access. High-speed variants require a plan that includes them — get one at the [MiniMax Token Plan page](https://platform.minimax.io/subscribe/token-plan).

## Setup

1. Install the extension.
2. Open the Command Palette → `MiniMax: Set API Key`.
3. Paste your key (stored in VS Code's SecretStorage).
4. Open the Chat view and pick a `MiniMax AI` model from the model picker.

### Controlling which models appear

Set `minimax.visibleModels` in settings. Default is all six.

### Proposed thinking-part API (optional)

```bash
code-insiders --enable-proposed-api xikey.minimax-vscode-extended
```

## Security

- API key stored in VS Code SecretStorage
- No sensitive data logged
- All calls HTTPS to `https://api.minimax.io/v1`

## License

MIT — original copyright retained. See `LICENSE`.
