import React from "react";

type VisualScene = {
  image: string;
  caption: string;
};

const SCENE_PATTERNS: Array<{ pattern: RegExp; scenes: [VisualScene, VisualScene, VisualScene] }> = [
  {
    pattern: /\b(wash|washing)\s+(your\s+)?hands?\b|\bhandwashing\b/i,
    scenes: [
      { image: "🚰", caption: "Wet hands" },
      { image: "🧼", caption: "Add soap and rub" },
      { image: "👐", caption: "Rinse and dry" },
    ],
  },
  {
    pattern: /\b(brush|brushing)\s+(your\s+)?teeth\b|\btoothbrush\b/i,
    scenes: [
      { image: "🪥", caption: "Pick up the brush" },
      { image: "🦷", caption: "Brush your teeth" },
      { image: "✨", caption: "Finish and rinse" },
    ],
  },
  {
    pattern: /\b(shoes?|foot|feet)\b/i,
    scenes: [
      { image: "👟", caption: "Get a shoe" },
      { image: "🦶", caption: "Put your foot in" },
      { image: "✅", caption: "Shoe is on" },
    ],
  },
  {
    pattern: /\b(drink|drinking|water)\b/i,
    scenes: [
      { image: "🥤", caption: "Pick up the cup" },
      { image: "💧", caption: "Take a small sip" },
      { image: "🙂", caption: "Put the cup down" },
    ],
  },
  {
    pattern: /\b(eat|eating|meal|snack|food)\b/i,
    scenes: [
      { image: "🍽️", caption: "Get ready to eat" },
      { image: "🥄", caption: "Take a small bite" },
      { image: "✅", caption: "Finish your food" },
    ],
  },
  {
    pattern: /\b(bag|backpack|schoolbag|hook)\b/i,
    scenes: [
      { image: "🎒", caption: "Get your bag" },
      { image: "🪝", caption: "Find its place" },
      { image: "✅", caption: "Put the bag away" },
    ],
  },
  {
    pattern: /\b(read|reading|book)\b/i,
    scenes: [
      { image: "📖", caption: "Open the book" },
      { image: "👀", caption: "Look at the page" },
      { image: "💡", caption: "Think about the story" },
    ],
  },
  {
    pattern: /\b(write|writing|draw|drawing|pencil)\b/i,
    scenes: [
      { image: "✏️", caption: "Get a pencil" },
      { image: "📄", caption: "Write or draw" },
      { image: "✅", caption: "Finish the page" },
    ],
  },
  {
    pattern: /\b(tidy|tidying|clean up|put away|toys?)\b/i,
    scenes: [
      { image: "🧸", caption: "Pick up an item" },
      { image: "📦", caption: "Find where it belongs" },
      { image: "✅", caption: "Put it away" },
    ],
  },
  {
    pattern: /\b(greet|greeting|say hello|hello|conversation)\b/i,
    scenes: [
      { image: "👋", caption: "Wave hello" },
      { image: "🙂", caption: "Look toward the person" },
      { image: "💬", caption: "Say hello" },
    ],
  },
  {
    pattern: /\b(match|matching|sort|sorting)\b/i,
    scenes: [
      { image: "🧩", caption: "Choose an item" },
      { image: "🔍", caption: "Look for a match" },
      { image: "✅", caption: "Put matching items together" },
    ],
  },
  {
    pattern: /\b(wait|waiting|take turns|taking turns)\b/i,
    scenes: [
      { image: "⏳", caption: "Wait for your turn" },
      { image: "👀", caption: "Watch for your turn" },
      { image: "🤝", caption: "Take your turn" },
    ],
  },
];

function getVisualScenes(text: string): [VisualScene, VisualScene, VisualScene] {
  return SCENE_PATTERNS.find(({ pattern }) => pattern.test(text))?.scenes ?? [
    { image: "👀", caption: "Look at the example" },
    { image: "👆", caption: "Try this step" },
    { image: "✅", caption: "Finish the step" },
  ];
}

interface TeachingVisualCueProps {
  title: string;
  instruction: string;
  description?: string;
}

export function TeachingVisualCue({ title, instruction, description }: TeachingVisualCueProps) {
  const scenes = getVisualScenes(`${title} ${instruction} ${description ?? ""}`);

  return (
    <section
      aria-label="Built-in visual cue"
      style={{
        margin: "0.65rem 0",
        padding: "0.85rem",
        border: "1px solid #D7E5D7",
        borderRadius: "10px",
        background: "#F2F8F1",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.3rem 0.75rem", marginBottom: "0.65rem" }}>
        <b>Visual cue</b>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Show one picture at a time, from left to right.</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.5rem" }}>
        {scenes.map((scene, index) => (
          <div
            key={scene.caption}
            style={{
              display: "flex",
              minWidth: 0,
              minHeight: "112px",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              padding: "0.6rem 0.35rem",
              border: "1px solid #E1E9E1",
              borderRadius: "8px",
              background: "#FFFFFF",
              textAlign: "center",
            }}
          >
            <span aria-hidden="true" style={{ fontSize: "2rem", lineHeight: 1.2 }}>{scene.image}</span>
            <span style={{ fontSize: "0.78rem", lineHeight: 1.3 }}>
              <b>{index + 1}. </b>{scene.caption}
            </span>
          </div>
        ))}
      </div>
      {description && <p style={{ margin: "0.6rem 0 0", fontSize: "0.82rem" }}><b>What this cue shows:</b> {description}</p>}
    </section>
  );
}
