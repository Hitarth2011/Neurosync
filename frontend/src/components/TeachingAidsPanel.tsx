import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

type AidType = "first_then" | "token" | "choice";
type FirstThenConfig = {
  firstLabel: string;
  firstActivity: string;
  firstSymbol: string;
  thenLabel: string;
  thenActivity: string;
  thenSymbol: string;
};
type TokenConfig = { goalActivity: string; tokenCount: number; earnedTokens: number };
type ChoiceOption = { id: string; title: string; symbol: string };
type ChoiceConfig = { options: ChoiceOption[] };
type BoardConfig<T> = { enabled: boolean; config: T };
type BoardConfigs = {
  first_then: BoardConfig<FirstThenConfig>;
  token: BoardConfig<TokenConfig>;
  choice: BoardConfig<ChoiceConfig>;
};

const DEFAULT_BOARDS: BoardConfigs = {
  first_then: { enabled: false, config: { firstLabel: "First", firstActivity: "", firstSymbol: "▶️", thenLabel: "Then", thenActivity: "", thenSymbol: "⭐" } },
  token: { enabled: false, config: { goalActivity: "", tokenCount: 5, earnedTokens: 0 } },
  choice: { enabled: false, config: { options: [] } },
};

export function TeachingAidsPanel({ childId }: { childId: number }) {
  const [boards, setBoards] = useState<BoardConfigs>(DEFAULT_BOARDS);
  const [choiceTitle, setChoiceTitle] = useState("");
  const [choiceSymbol, setChoiceSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = async () => {
    const result = await apiGet<{ configs: Partial<BoardConfigs> }>(`/api/children/${childId}/teaching/aids`);
    setBoards((previous) => ({
      first_then: result.configs.first_then ?? previous.first_then,
      token: result.configs.token ?? previous.token,
      choice: result.configs.choice ?? previous.choice,
    }));
  };

  useEffect(() => {
    refresh().catch((cause) => setError(cause.message || "Could not load teaching aids."));
  }, [childId]);

  const run = async (action: () => Promise<void>, successMessage: string) => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await action();
      await refresh();
      setNotice(successMessage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this teaching aid.");
    } finally {
      setLoading(false);
    }
  };

  const saveBoard = (aidType: AidType, enabled: boolean, config: FirstThenConfig | TokenConfig | ChoiceConfig, message: string) =>
    run(async () => {
      await apiPost(`/api/children/${childId}/teaching/aids/${aidType}`, { enabled, config });
    }, message);

  const updateFirstThen = (field: keyof FirstThenConfig, value: string) => {
    setBoards((previous) => ({
      ...previous,
      first_then: { ...previous.first_then, config: { ...previous.first_then.config, [field]: value } },
    }));
  };

  const updateToken = (field: "goalActivity" | "tokenCount", value: string) => {
    setBoards((previous) => ({
      ...previous,
      token: {
        ...previous.token,
        config: {
          ...previous.token.config,
          [field]: field === "tokenCount" ? Number(value) : value,
        },
      },
    }));
  };

  const updateOption = (index: number, field: "title" | "symbol", value: string) => {
    setBoards((previous) => ({
      ...previous,
      choice: {
        ...previous.choice,
        config: {
          options: previous.choice.config.options.map((option, itemIndex) =>
            itemIndex === index ? { ...option, [field]: value } : option,
          ),
        },
      },
    }));
  };

  const addChoice = () => {
    const title = choiceTitle.trim();
    if (!title) return;
    setBoards((previous) => ({
      ...previous,
      choice: {
        ...previous.choice,
        config: {
          options: [...previous.choice.config.options, { id: crypto.randomUUID(), title, symbol: choiceSymbol.trim() }],
        },
      },
    }));
    setChoiceTitle("");
    setChoiceSymbol("");
  };

  const removeChoice = (id: string) => setBoards((previous) => ({
    ...previous,
    choice: { ...previous.choice, config: { options: previous.choice.config.options.filter((option) => option.id !== id) } },
  }));

  const tokenAction = (action: "token_earned" | "token_reset") => run(async () => {
    await apiPost(`/api/children/${childId}/teaching/aids/token/events`, { action });
  }, action === "token_reset" ? "Token count reset." : "One token was recorded.");

  const recordChoice = (option: ChoiceOption) => run(async () => {
    await apiPost(`/api/children/${childId}/teaching/aids/choice/events`, {
      action: "choice_selected",
      optionId: option.id,
    });
  }, `Recorded the optional selection: ${option.title}.`);

  const firstThen = boards.first_then;
  const token = boards.token;
  const choice = boards.choice;

  return (
    <Card style={{ marginTop: "1rem" }}>
      <h3>Optional visual teaching aids</h3>
      <p>Configure, change, or disable these boards at any time. They support teaching and do not determine rewards. Never withhold basic needs, rest, comfort, or communication.</p>
      {error && <Alert type="error">{error}</Alert>}
      {notice && <Alert type="success">{notice}</Alert>}

      <details>
        <summary>First–Then board {firstThen.enabled ? "(enabled)" : "(disabled)"}</summary>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem", margin: "0.75rem 0" }}>
          <label>First label<input maxLength={40} value={firstThen.config.firstLabel} onChange={(event) => updateFirstThen("firstLabel", event.target.value)} /></label>
          <label>First activity<input maxLength={160} value={firstThen.config.firstActivity} onChange={(event) => updateFirstThen("firstActivity", event.target.value)} /></label>
          <label>First symbol<input aria-label="First activity symbol" maxLength={16} value={firstThen.config.firstSymbol} onChange={(event) => updateFirstThen("firstSymbol", event.target.value)} /></label>
          <label>Then label<input maxLength={40} value={firstThen.config.thenLabel} onChange={(event) => updateFirstThen("thenLabel", event.target.value)} /></label>
          <label>Then activity<input maxLength={160} value={firstThen.config.thenActivity} onChange={(event) => updateFirstThen("thenActivity", event.target.value)} /></label>
          <label>Then symbol<input aria-label="Then activity symbol" maxLength={16} value={firstThen.config.thenSymbol} onChange={(event) => updateFirstThen("thenSymbol", event.target.value)} /></label>
        </div>
        {firstThen.enabled && <div role="group" aria-label="First–Then visual preview" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          {[{ label: firstThen.config.firstLabel, activity: firstThen.config.firstActivity, symbol: firstThen.config.firstSymbol },
            { label: firstThen.config.thenLabel, activity: firstThen.config.thenActivity, symbol: firstThen.config.thenSymbol }].map((item) =>
            <div key={item.label} style={{ border: "1px solid var(--border, #ddd)", borderRadius: "0.5rem", padding: "1rem", textAlign: "center" }}>
              <b>{item.label}</b><div aria-hidden="true" style={{ fontSize: "2rem" }}>{item.symbol}</div><span>{item.activity}</span>
            </div>,
          )}
        </div>}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
          <Button loading={loading} onClick={() => saveBoard("first_then", !firstThen.enabled, firstThen.config, firstThen.enabled ? "First–Then board disabled." : "First–Then board saved and enabled.")}>
            {firstThen.enabled ? "Save and disable" : "Save and enable"}
          </Button>
          {firstThen.enabled && <Button variant="outline" loading={loading} onClick={() => saveBoard("first_then", true, firstThen.config, "First–Then board updated.")}>Save changes</Button>}
        </div>
      </details>

      <details style={{ marginTop: "0.75rem" }}>
        <summary>Token board {token.enabled ? "(enabled)" : "(disabled)"}</summary>
        <p>Agree on a learning activity with the child. This board only records tokens; it does not choose a reward.</p>
        <label htmlFor="token-goal">Agreed activity goal</label>
        <input id="token-goal" maxLength={160} value={token.config.goalActivity} onChange={(event) => updateToken("goalActivity", event.target.value)} />
        <label htmlFor="token-count">Tokens in this board (1–20)</label>
        <input id="token-count" type="number" min={1} max={20} value={token.config.tokenCount} onChange={(event) => updateToken("tokenCount", event.target.value)} />
        {token.enabled && <div role="group" aria-label="Token progress" style={{ margin: "0.75rem 0" }}>
          <p>{token.config.goalActivity}: {token.config.earnedTokens} of {token.config.tokenCount} tokens recorded</p>
          <div aria-label={`${token.config.earnedTokens} of ${token.config.tokenCount} tokens`} style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {Array.from({ length: token.config.tokenCount }, (_, index) =>
              <span key={index} aria-hidden="true" style={{ fontSize: "1.5rem", opacity: index < token.config.earnedTokens ? 1 : 0.25 }}>⭐</span>,
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <Button loading={loading} disabled={token.config.earnedTokens >= token.config.tokenCount} onClick={() => tokenAction("token_earned")}>Record earned token</Button>
            <Button variant="outline" loading={loading} onClick={() => tokenAction("token_reset")}>Reset tokens</Button>
          </div>
        </div>}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
          <Button loading={loading} onClick={() => saveBoard("token", !token.enabled, token.config, token.enabled ? "Token board disabled." : "Token board saved and enabled.")}>
            {token.enabled ? "Save and disable" : "Save and enable"}
          </Button>
          {token.enabled && <Button variant="outline" loading={loading} onClick={() => saveBoard("token", true, token.config, "Token board updated.")}>Save changes</Button>}
        </div>
      </details>

      <details style={{ marginTop: "0.75rem" }}>
        <summary>Choice board {choice.enabled ? "(enabled)" : "(disabled)"}</summary>
        <p>Offer choices without pressure. A child may decline or not choose; selecting an option here is optional.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "end" }}>
          <label>Activity or material<input maxLength={120} value={choiceTitle} onChange={(event) => setChoiceTitle(event.target.value)} /></label>
          <label>Symbol<input aria-label="Choice symbol" maxLength={16} value={choiceSymbol} onChange={(event) => setChoiceSymbol(event.target.value)} /></label>
          <Button variant="outline" type="button" onClick={addChoice} disabled={choice.config.options.length >= 12 || !choiceTitle.trim()}>Add choice</Button>
        </div>
        {choice.enabled && <div role="group" aria-label="Choice board options" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.5rem", marginTop: "0.75rem" }}>
          {choice.config.options.map((option) =>
            <Button key={option.id} variant="outline" type="button" loading={loading} onClick={() => recordChoice(option)} aria-label={`Option: ${option.title}`}>
              <span aria-hidden="true" style={{ display: "block", fontSize: "1.5rem" }}>{option.symbol || "□"}</span>
              {option.title}
            </Button>,
          )}
        </div>}
        {choice.config.options.map((option, index) =>
          <div key={option.id} style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "end", marginTop: "0.5rem" }}>
            <label>Choice {index + 1}<input maxLength={120} value={option.title} onChange={(event) => updateOption(index, "title", event.target.value)} /></label>
            <label>Symbol<input aria-label={`Symbol for choice ${index + 1}`} maxLength={16} value={option.symbol} onChange={(event) => updateOption(index, "symbol", event.target.value)} /></label>
            <Button variant="outline" type="button" onClick={() => removeChoice(option.id)}>Remove choice</Button>
          </div>,
        )}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
          <Button loading={loading} disabled={!choice.enabled && choice.config.options.length < 2} onClick={() => saveBoard("choice", !choice.enabled, choice.config, choice.enabled ? "Choice board disabled." : "Choice board saved and enabled.")}>
            {choice.enabled ? "Save and disable" : "Save and enable"}
          </Button>
          {choice.enabled && <Button variant="outline" loading={loading} onClick={() => saveBoard("choice", true, choice.config, "Choice board updated.")}>Save changes</Button>}
        </div>
      </details>
    </Card>
  );
}
