import * as vscode from "vscode";
import { MiniMaxProvider } from "./providers/MiniMaxProvider";
import { MiniMaxAuthentication } from "./providers/MiniMaxAuthentication";
import { MiniMaxClient, MiniMaxError } from "./api/MiniMaxClient";
import { TokenCounter } from "./utils/TokenCounter";
import { DEFAULT_TEMPERATURE, TEST_CONNECTION_MODEL } from "./utils/constants";

async function setApiKey(authManager: MiniMaxAuthentication): Promise<void> {
  await authManager.promptForApiKey();
}

async function clearApiKey(authManager: MiniMaxAuthentication): Promise<void> {
  await authManager.deleteApiKey();
  vscode.window.showInformationMessage("MiniMax API key cleared");
}

function describeTestError(error: unknown): string {
  if (error instanceof MiniMaxError) {
    if (error.statusCode === 401) {
      return "Invalid API key. Please set a new key.";
    }
    if (error.statusCode === 429) {
      return "Rate limit exceeded while testing. Please retry shortly.";
    }
    if (error.code === "TIMEOUT") {
      return "MiniMax provider test timed out.";
    }
    return `MiniMax provider test failed: ${error.message}`;
  }
  if (error instanceof Error) {
    return `MiniMax provider test failed: ${error.message}`;
  }
  return `MiniMax provider test failed: ${String(error)}`;
}

async function testConnection(authManager: MiniMaxAuthentication): Promise<void> {
  const key = await authManager.getApiKey();
  if (!key) {
    const shouldSetKey = await vscode.window.showInformationMessage(
      "API key is not set. Would you like to set it now?",
      "Set API Key",
    );
    if (shouldSetKey === "Set API Key") {
      await authManager.promptForApiKey();
    }
    return;
  }

  const client = new MiniMaxClient();

  try {
    const stream = client.streamChat(
      TEST_CONNECTION_MODEL,
      [{ role: "user", content: "Ping" }],
      {
        apiKey: key,
        maxTokens: 1,
        temperature: DEFAULT_TEMPERATURE,
      },
    );

    let receivedAnyChunk = false;
    try {
      for await (const _ of stream) {
        receivedAnyChunk = true;
        break;
      }
    } catch (streamError) {
      vscode.window.showErrorMessage(describeTestError(streamError));
      return;
    }

    if (!receivedAnyChunk) {
      vscode.window.showWarningMessage(
        "MiniMax provider test completed but returned no data. Verify your plan includes the selected model.",
      );
      return;
    }

    vscode.window.showInformationMessage("MiniMax provider test succeeded.");
  } catch (error) {
    vscode.window.showErrorMessage(describeTestError(error));
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const authManager = new MiniMaxAuthentication(context.secrets);
  const apiClient = new MiniMaxClient();
  const tokenCounter = new TokenCounter();
  const provider = new MiniMaxProvider(apiClient, authManager, tokenCounter);

  const manageActions: Record<string, () => Promise<void>> = {
    "Set API Key": () => setApiKey(authManager),
    "Clear API Key": () => clearApiKey(authManager),
    "Test Connection": () => testConnection(authManager),
  };

  context.subscriptions.push(
    provider,
    vscode.lm.registerLanguageModelChatProvider("minimax", provider),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("minimax.visibleModels")) {
        provider.notifyModelsChanged();
      }
    }),
    vscode.commands.registerCommand("minimax-vscode.setApiKey", async () => {
      await setApiKey(authManager);
    }),
    vscode.commands.registerCommand("minimax-vscode.clearApiKey", async () => {
      await clearApiKey(authManager);
    }),
    vscode.commands.registerCommand("minimax-vscode.manage", async () => {
      const choice = await vscode.window.showQuickPick(Object.keys(manageActions), {
        placeHolder: "Manage MiniMax provider",
      });
      const action = choice ? manageActions[choice] : undefined;
      if (!action) {
        return;
      }
      await action();
    }),
  );
}

export function deactivate(): void {}
