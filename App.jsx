import { useState, useRef, useEffect } from "react";

const T = {
  bg: "#070709",
  surface: "#0f0f14",
  card: "#16161e",
  border: "#1e1e2a",
  text: "#e8e8f0",
  muted: "#44445a",
  blue: "#3d6ff8",
  green: "#2dd4a0",
  purple: "#9d7dfa",
  red: "#f87171",
};

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "12px 16px", background: T.card, borderRadius: "4px 16px 16px 16px", width: "fit-content" }}>
      {[0, 0.2, 0.4].map((d, i) => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: T.muted, display: "inline-block",
          animation: `blink 1.4s ${d}s infinite`
        }} />
      ))}
    </div>
  );
}

function ChatTab() {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedFile({ name: file.name, type: file.type, data: reader.result.split(",")[1] });
      if (file.type.startsWith("image/")) setFilePreview(reader.result);
      else setFilePreview(null);
    };
    reader.readAsDataURL(file);
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && !uploadedFile) || loading) return;
    setInput("");

    let userContent;
    let displayContent = text || "(file uploaded)";

    if (uploadedFile && uploadedFile.type.startsWith("image/")) {
      userContent = [
        { type: "image", source: { type: "base64", media_type: uploadedFile.type, data: uploadedFile.data } },
        { type: "text", text: text || "What's in this image? Describe it in detail." }
      ];
    } else {
      userContent = text;
    }

    const newMsgs = [...msgs, { role: "user", content: userContent, display: displayContent, preview: filePreview }];
    setMsgs(newMsgs);
    setUploadedFile(null);
    setFilePreview(null);
    setLoading(true);

    try {
      const apiMsgs = newMsgs.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are a brilliant, witty AI assistant. You are helpful, thoughtful, and direct. When analyzing images, be thorough and insightful. Format responses with line breaks for readability.",
          messages: apiMsgs,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const reply = data.content?.map(b => b.text || "").join("") || "No response.";
      setMsgs(prev => [...prev, { role: "assistant", content: reply, display: reply }]);
    } catch (err) {
      setMsgs(prev => [...prev, { role: "assistant", content: `⚠️ ${err.message}`, display: `⚠️ ${err.message}` }]);
    }
    setLoading(false);
  };

  const suggestions = ["Explain quantum computing simply", "Write a Python web scraper", "What's the meaning of life?", "Tell me a dark joke"];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {msgs.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, paddingTop: 20 }}>
            <div style={{ fontSize: 44, filter: "drop-shadow(0 0 20px #3d6ff855)" }}>✦</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>What's on your mind?</div>
            <div style={{ fontSize: 13, color: T.muted, textAlign: "center", maxWidth: 260, lineHeight: 1.6 }}>
              Chat, analyze images, write code — powered by Claude
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 4 }}>
              {suggestions.map(s => (
                <button key={s} onClick={() => setInput(s)} style={{
                  padding: "6px 14px", borderRadius: 20, border: `1px solid ${T.border}`,
                  background: T.surface, color: "#666", fontSize: 12, cursor: "pointer",
                  transition: "all 0.15s"
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 4, animation: "fadeUp 0.2s ease" }}>
            {m.preview && (
              <img src={m.preview} alt="upload" style={{ maxWidth: 200, borderRadius: 12, border: `1px solid ${T.border}`, alignSelf: "flex-end" }} />
            )}
            <div style={{
              maxWidth: "80%", padding: "11px 15px",
              borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
              background: m.role === "user" ? T.blue : T.card,
              color: T.text, fontSize: 14, lineHeight: 1.7,
              whiteSpace: "pre-wrap", wordBreak: "break-word"
            }}>
              {m.display}
            </div>
          </div>
        ))}
        {loading && <TypingDots />}
        <div ref={bottomRef} />
      </div>

      {filePreview && (
        <div style={{ padding: "8px 16px 0", display: "flex", alignItems: "center", gap: 10 }}>
          <img src={filePreview} alt="" style={{ height: 48, borderRadius: 8, border: `1px solid ${T.border}` }} />
          <span style={{ fontSize: 12, color: T.muted }}>Image ready to send</span>
          <button onClick={() => { setUploadedFile(null); setFilePreview(null); }} style={{ marginLeft: "auto", background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
      )}

      <div style={{ padding: "10px 14px 16px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: T.surface, borderRadius: 16, padding: "10px 12px", border: `1px solid ${T.border}` }}>
          <button onClick={() => fileRef.current?.click()} style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${T.border}`, background: "transparent", color: T.muted, cursor: "pointer", fontSize: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>📎</button>
          <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} style={{ display: "none" }} />
          <textarea
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message… (Enter to send)" rows={1}
            style={{ flex: 1, background: "transparent", border: "none", color: T.text, fontSize: 14, resize: "none", lineHeight: 1.5, fontFamily: "inherit", maxHeight: 120, outline: "none" }}
          />
          <button onClick={send} disabled={(!input.trim() && !uploadedFile) || loading} style={{
            width: 34, height: 34, borderRadius: 11, border: "none", cursor: "pointer", flexShrink: 0,
            background: (input.trim() || uploadedFile) && !loading ? T.blue : "#1a1a24",
            color: (input.trim() || uploadedFile) && !loading ? "#fff" : "#333",
            fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center"
          }}>↑</button>
        </div>
        {msgs.length > 0 && (
          <div style={{ textAlign: "center", marginTop: 6 }}>
            <button onClick={() => setMsgs([])} style={{ fontSize: 11, color: "#2a2a3c", background: "none", border: "none", cursor: "pointer" }}>Clear chat</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ImageTab() {
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(null);
  const [style, setStyle] = useState("photorealistic");

  const STYLES = ["photorealistic", "anime", "oil painting", "3D render", "watercolor", "cinematic", "pixel art", "sketch"];

  const generate = async () => {
    const p = prompt.trim();
    if (!p || loading) return;
    setLoading(true);
    setCurrent(null);

    const fullPrompt = `${p}, ${style}, high quality, detailed, 4K`;
    const seed = Math.floor(Math.random() * 999999);

    // Try multiple Pollinations endpoints
    const urls = [
      `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=768&height=768&seed=${seed}&nologo=true&enhance=true&model=flux`,
      `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=768&height=768&seed=${seed}&nologo=true`,
    ];

    let loaded = false;
    for (const url of urls) {
      if (loaded) break;
      await new Promise((resolve) => {
        const img = new Image();
        const timer = setTimeout(() => { img.src = ""; resolve(); }, 25000);
        img.onload = () => {
          clearTimeout(timer);
          if (!loaded) {
            loaded = true;
            const item = { url, prompt: p, style };
            setCurrent(item);
            setImages(prev => [item, ...prev].slice(0, 12));
          }
          resolve();
        };
        img.onerror = () => { clearTimeout(timer); resolve(); };
        img.src = url;
      });
    }

    if (!loaded) {
      setCurrent({ error: true, prompt: p });
    }
    setLoading(false);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: T.surface, borderRadius: 14, padding: 16, border: `1px solid ${T.border}` }}>
        <textarea
          value={prompt} onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) generate(); }}
          placeholder='Describe your image… e.g. "a dragon flying over Tokyo at night"'
          rows={3}
          style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 13px", color: T.text, fontSize: 14, resize: "none", lineHeight: 1.6, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }}
        />

        <div style={{ marginTop: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 7, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" }}>Style</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {STYLES.map(s => (
              <button key={s} onClick={() => setStyle(s)} style={{
                padding: "4px 11px", borderRadius: 8, fontSize: 12, cursor: "pointer", border: `1px solid ${style === s ? T.green : T.border}`,
                background: style === s ? "#0d2018" : "transparent", color: style === s ? T.green : T.muted, fontWeight: style === s ? 600 : 400,
              }}>{s}</button>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={!prompt.trim() || loading} style={{
          width: "100%", padding: "11px", borderRadius: 11, border: "none", cursor: "pointer",
          background: prompt.trim() && !loading ? `linear-gradient(135deg, ${T.blue}, ${T.purple})` : "#141420",
          color: prompt.trim() && !loading ? "#fff" : "#333", fontSize: 14, fontWeight: 700,
        }}>
          {loading ? "✦ Generating…" : "✦ Generate Image"}
        </button>
      </div>

      {loading && (
        <div style={{ background: T.surface, borderRadius: 14, height: 220, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: `3px solid ${T.border}`, borderTopColor: T.blue, animation: "spin 0.9s linear infinite" }} />
          <div style={{ fontSize: 13, color: T.muted }}>Creating your masterpiece…</div>
          <div style={{ fontSize: 11, color: "#222232" }}>This may take 15–30 seconds</div>
        </div>
      )}

      {current && !loading && !current.error && (
        <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${T.border}`, animation: "fadeUp 0.3s ease" }}>
          <img src={current.url} alt={current.prompt} style={{ width: "100%", display: "block" }} />
          <div style={{ padding: "11px 15px", background: T.surface, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: 1, fontSize: 12, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current.prompt} · {current.style}</span>
            <a href={current.url} target="_blank" rel="noreferrer" download style={{ fontSize: 12, color: T.blue, textDecoration: "none", fontWeight: 600, flexShrink: 0 }}>Save ↓</a>
          </div>
        </div>
      )}

      {current?.error && !loading && (
        <div style={{ background: "#1a0808", borderRadius: 14, padding: 20, border: `1px solid #3a1010`, textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
          <div style={{ color: T.red, fontSize: 14, marginBottom: 6 }}>Image generation timed out</div>
          <div style={{ color: T.muted, fontSize: 12 }}>Try a simpler prompt or tap Generate again</div>
          <button onClick={generate} style={{ marginTop: 12, padding: "8px 20px", borderRadius: 9, border: `1px solid ${T.border}`, background: "transparent", color: T.text, fontSize: 13, cursor: "pointer" }}>Try Again</button>
        </div>
      )}

      {images.length > 1 && (
        <div>
          <div style={{ fontSize: 11, color: "#1e1e2e", fontWeight: 600, marginBottom: 8, letterSpacing: 0.6, textTransform: "uppercase" }}>History</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {images.slice(1).map((item, i) => (
              <div key={i} onClick={() => setCurrent(item)} style={{ borderRadius: 10, overflow: "hidden", cursor: "pointer", aspectRatio: "1", border: `1px solid ${T.border}` }}>
                <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {images.length === 0 && !loading && (
        <div>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginBottom: 8, letterSpacing: 0.6, textTransform: "uppercase" }}>Inspiration</div>
          {["a cyberpunk samurai in neon rain, cinematic", "adorable robot in a flower garden, 3D render", "ancient library with floating books, fantasy art", "aurora borealis over icy mountains, photorealistic"].map(s => (
            <button key={s} onClick={() => setPrompt(s)} style={{
              display: "block", width: "100%", marginBottom: 7, padding: "11px 14px", borderRadius: 11,
              border: `1px solid ${T.border}`, background: T.surface, color: "#555", fontSize: 13, cursor: "pointer", textAlign: "left",
            }}>🎨 {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function CodeTab() {
  const [code, setCode] = useState("");
  const [lang, setLang] = useState("javascript");
  const [action, setAction] = useState("explain");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [customTask, setCustomTask] = useState("");

  const LANGS = ["javascript", "python", "typescript", "html", "css", "java", "c++", "c#", "rust", "go", "php", "swift", "kotlin", "sql", "bash"];
  const ACTIONS = [
    { id: "explain", label: "Explain", icon: "📖" },
    { id: "fix", label: "Fix Bugs", icon: "🐛" },
    { id: "optimize", label: "Optimize", icon: "⚡" },
    { id: "comments", label: "Comment", icon: "💬" },
    { id: "convert", label: "→ Python", icon: "🔄" },
    { id: "test", label: "Tests", icon: "🧪" },
    { id: "custom", label: "Custom", icon: "✏️" },
  ];

  const TASKS = {
    explain: "Explain what this code does, step by step, in simple terms.",
    fix: "Find and fix all bugs. Show corrected code and explain what was wrong.",
    optimize: "Optimize for performance and readability. Show improved version and explain changes.",
    comments: "Add clear, helpful comments throughout. Return fully commented code.",
    convert: "Convert to Python. Keep same logic, use Python best practices.",
    test: "Write comprehensive unit tests covering edge cases.",
    custom: "",
  };

  const run = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setOutput("");
    const task = action === "custom" ? (customTask.trim() || "Review this code.") : TASKS[action];
    const prompt = `Language: ${lang}\nTask: ${task}\n\nCode:\n\`\`\`${lang}\n${code}\n\`\`\``;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: "You are an expert software engineer. Give precise, actionable responses. Always use code blocks for code.",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setOutput(data.content?.map(b => b.text || "").join("") || "No response.");
    } catch (err) {
      setOutput(`⚠️ Error: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: T.muted }}>Lang:</span>
        <select value={lang} onChange={e => setLang(e.target.value)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 10px", color: T.text, fontSize: 13, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
          {LANGS.map(l => <option key={l} value={l} style={{ background: T.card }}>{l}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {ACTIONS.map(a => (
          <button key={a.id} onClick={() => setAction(a.id)} style={{
            padding: "5px 11px", borderRadius: 8, fontSize: 12, cursor: "pointer",
            border: `1px solid ${action === a.id ? T.purple : T.border}`,
            background: action === a.id ? "#160e28" : "transparent",
            color: action === a.id ? T.purple : T.muted, fontWeight: action === a.id ? 600 : 400,
          }}>{a.icon} {a.label}</button>
        ))}
      </div>

      {action === "custom" && (
        <input value={customTask} onChange={e => setCustomTask(e.target.value)}
          placeholder="Describe your custom task…"
          style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 13px", color: T.text, fontSize: 13, fontFamily: "inherit", outline: "none" }}
        />
      )}

      <textarea value={code} onChange={e => setCode(e.target.value)}
        placeholder={`Paste your ${lang} code here…`} rows={8}
        style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 11, padding: "12px 14px", color: T.text, fontSize: 13, fontFamily: "monospace", resize: "vertical", lineHeight: 1.6, outline: "none" }}
      />

      <button onClick={run} disabled={!code.trim() || loading} style={{
        padding: 11, borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14,
        background: code.trim() && !loading ? T.purple : "#141420",
        color: code.trim() && !loading ? "#fff" : "#333",
      }}>
        {loading ? "Analyzing…" : `✦ ${ACTIONS.find(a => a.id === action)?.label}`}
      </button>

      {output && (
        <div style={{ background: T.surface, borderRadius: 11, padding: "14px 16px", border: `1px solid ${T.border}`, fontSize: 13, lineHeight: 1.75, color: T.text, whiteSpace: "pre-wrap", wordBreak: "break-word", animation: "fadeUp 0.2s ease" }}>
          {output}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("chat");
  const TABS = [
    { id: "chat", icon: "💬", label: "Chat" },
    { id: "image", icon: "🎨", label: "Image" },
    { id: "code", icon: "💻", label: "Code" },
  ];

  return (
    <div style={{
      height: 640, background: T.bg, borderRadius: 18, overflow: "hidden",
      display: "flex", flexDirection: "column",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      border: `1px solid ${T.border}`, color: T.text,
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.9; } }
        button { transition: all 0.15s; }
        button:hover:not(:disabled) { opacity: 0.8; }
        textarea, select, input { outline: none !important; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "14px 18px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11, flexShrink: 0,
            background: `linear-gradient(135deg, ${T.green}, ${T.blue})`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            boxShadow: `0 0 20px ${T.blue}44`
          }}>✦</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: -0.4 }}>AI Studio</div>
            <div style={{ fontSize: 11, color: T.muted }}>Chat · Image · Code</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 5, alignItems: "center" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
            <span style={{ fontSize: 11, color: T.green, fontWeight: 600 }}>Live</span>
          </div>
        </div>
        <div style={{ display: "flex", background: T.surface, borderRadius: 12, padding: 3, gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "8px 0", border: "none", borderRadius: 10, cursor: "pointer",
              fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
              background: tab === t.id ? T.card : "transparent",
              color: tab === t.id ? T.text : T.muted,
              boxShadow: tab === t.id ? `0 1px 8px #00000044` : "none",
            }}>{t.icon}  {t.label}</button>
          ))}
        </div>
      </div>

      {tab === "chat"  && <ChatTab />}
      {tab === "image" && <ImageTab />}
      {tab === "code"  && <CodeTab />}
    </div>
  );
}
