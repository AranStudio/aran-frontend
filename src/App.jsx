import { useState, useEffect, useRef } from "react";

const ACCENT = "#059669"; // emerald
const ACCENT_DARK = "#022c22";

// ---------- REUSABLE CARD COMPONENT ----------
function Card({ children, style = {} }) {
  return (
    <div
      style={{
        backgroundImage:
          "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(241,245,249,0.9))",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: "1rem",
        border: "1px solid rgba(255,255,255,0.7)",
        backdropFilter: "blur(18px)",
        boxShadow:
          "0 18px 45px rgba(15,23,42,0.32), 0 6px 18px rgba(15,23,42,0.25), inset 0 1px 0 rgba(255,255,255,0.9)",
        padding: "1rem",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ---------- LOCAL FALLBACK GENERATOR ----------
function generateDeckFromIdea(idea, style = "General") {
  const trimmed = idea.trim();
  if (!trimmed) return null;

  const title = trimmed.split(" ").slice(0, 4).join(" ");

  return {
    title: `[Simple - ${style}] ${title || "Untitled Concept"}`,
    logline: `When ${trimmed.toLowerCase()}, everything changes.`,
    synopsis: `A ${style} story inspired by: "${trimmed}".`,
    beats: [
      {
        label: "Act I – Setup",
        text: `The idea "${trimmed}" enters the world in a ${style.toLowerCase()} context.`,
      },
      {
        label: "Act II – Conflict",
        text: `Challenges arise as "${trimmed}" disrupts expectations.`,
      },
      {
        label: "Act III – Resolution",
        text: `The impact of "${trimmed}" becomes clear in a bold visual moment.`,
      },
    ],
    storyboardFrames: [
      {
        name: "Frame 1 – Opening Image",
        description: `A wide, cinematic shot that immediately sells the ${style.toLowerCase()} world of "${trimmed}".`,
      },
      {
        name: "Frame 2 – Inciting Moment",
        description: `The moment "${trimmed}" kicks in: a gesture, event, or reveal that shifts the tone.`,
      },
      {
        name: "Frame 3 – Escalation",
        description:
          "Stakes rise: dynamic framing, movement, or cutting that shows tension increasing.",
      },
      {
        name: "Frame 4 – Final Image",
        description:
          "A closing image that visually mirrors the opening but shows how everything has changed.",
      },
    ],
  };
}

// ---------- API HELPERS ----------
async function callApiToGenerateDeck(idea, style) {
  const response = await fetch("https://cool-name.loca.lt/api/generate-deck", {

    // ⬆ change this to your Render URL later when backend is deployed
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea, style }),
  });

  if (!response.ok) {
    throw new Error("API request failed");
  }

  return await response.json();
}

async function callApiToGenerateImages(frames, style) {
  const response = await fetch("https://cool-name.loca.lt/api/generate-images", {

    // ⬆ change this to your Render URL later when backend is deployed
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frames, style }),
  });

  if (!response.ok) {
    throw new Error("Image API request failed");
  }

  return await response.json();
}

// ---------- VOICE HOOK ----------
function useVoiceInput(setIdea) {
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setIdea((prev) => (prev ? prev + " " + text : text));
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
  }, [setIdea]);

  const toggle = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return { isListening, supported, toggle };
}

// ---------- MAIN APP ----------
export default function App() {
  const [idea, setIdea] = useState("");
  const [deck, setDeck] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [style, setStyle] = useState("Film / Narrative");
  const [savedDecks, setSavedDecks] = useState([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  // ✅ NEW: mobile layout awareness
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  const { isListening, supported, toggle } = useVoiceInput(setIdea);

  // Watch screen size for responsive layout
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load deck from URL share link or from local storage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("deck");
    if (encoded) {
      try {
        const json = atob(decodeURIComponent(encoded));
        const sharedDeck = JSON.parse(json);
        setDeck(sharedDeck);
      } catch (e) {
        console.log("Failed to load shared deck:", e);
      }
    }

    const stored = localStorage.getItem("aranDecks");
    if (stored) {
      try {
        setSavedDecks(JSON.parse(stored));
      } catch (e) {
        console.log("Failed to parse saved decks:", e);
      }
    }
  }, []);

  const handleGenerate = async () => {
    if (!idea.trim()) return;

    setIsGenerating(true);
    setAiStatus("Talking to AI…");

    try {
      const aiDeck = await callApiToGenerateDeck(idea, style);
      setDeck(aiDeck);
      setAiStatus("✅ AI deck generated");
    } catch (err) {
      console.log("API error, using fallback:", err);
      setAiStatus("⚠️ AI failed, using simple deck instead.");
      const localDeck = generateDeckFromIdea(idea, style);
      setDeck(localDeck);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPdf = () => {
    window.print();
  };

  // ✅ IMPROVED: more robust image mapping so images actually show up
  const handleGenerateImages = async () => {
    if (!deck || !deck.storyboardFrames) return;

    setIsGeneratingImages(true);
    setAiStatus("🎨 Generating storyboard images…");

    try {
      const result = await callApiToGenerateImages(deck.storyboardFrames, style);

      console.log("Image API result:", result);

      // Try several possible response shapes:
      // { frames: [...] }, { images: [...] }, { data: [...] }
      const framesFromApi = result.frames || result.images || result.data || [];

      const newFrames = deck.storyboardFrames.map((f, i) => {
        const match = framesFromApi[i];
        if (!match) return f;

        // Handle objects like:
        // { imageUrl }, { url }, { b64_json }, { image: "..." }
        const url =
          match.imageUrl ||
          match.url ||
          match.image ||
          (match.b64_json
            ? `data:image/png;base64,${match.b64_json}`
            : undefined);

        return url ? { ...f, imageUrl: url } : f;
      });

      setDeck((prev) => ({ ...prev, storyboardFrames: newFrames }));
      setAiStatus("✅ Images generated");
    } catch (err) {
      console.log("Image API error:", err);
      setAiStatus("⚠️ Image generation failed.");
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleDeckFieldChange = (field, value) => {
    setDeck((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleBeatChange = (index, value) => {
    setDeck((prev) => {
      if (!prev) return prev;
      const beats = [...(prev.beats || [])];
      beats[index] = { ...beats[index], text: value };
      return { ...prev, beats };
    });
  };

  const handleFrameDescriptionChange = (index, value) => {
    setDeck((prev) => {
      if (!prev) return prev;
      const frames = [...(prev.storyboardFrames || [])];
      frames[index] = { ...frames[index], description: value };
      return { ...prev, storyboardFrames: frames };
    });
  };

  const handleSaveDeck = () => {
    if (!deck) return;
    const deckWithMeta = {
      ...deck,
      savedAt: new Date().toISOString(),
      style,
    };
    const updated = [...savedDecks, deckWithMeta];
    setSavedDecks(updated);
    localStorage.setItem("aranDecks", JSON.stringify(updated));
    setAiStatus("💾 Deck saved locally.");
  };

  const handleLoadDeck = (index) => {
    const d = savedDecks[index];
    if (!d) return;
    setDeck(d);
    if (d.style) setStyle(d.style);
    setAiStatus("📂 Loaded saved deck.");
  };

  const handleCopyShareLink = async () => {
    if (!deck) return;
    try {
      const json = JSON.stringify(deck);
      const encoded = encodeURIComponent(btoa(json));
      const url = `${window.location.origin}${window.location.pathname}?deck=${encoded}`;

      setShareUrl(url);

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setAiStatus("🔗 Share link copied to clipboard.");
      } else {
        setAiStatus("🔗 Share link ready below — copy it manually.");
      }
    } catch (e) {
      console.log("Share link error:", e);
      setAiStatus("⚠️ Couldn't auto-copy — copy the link below.");
    }
  };

  const canGenerate = idea.trim().length > 0 && !isGenerating;

  // ---------- VIEW 1: INITIAL, MINIMAL (NO DECK YET) ----------
  if (!deck) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? "1rem" : "1.5rem",
          animation: "fadeInUp 0.4s ease-out",
        }}
      >
        <Card
          style={{
            width: "100%",
            maxWidth: isMobile ? "100%" : "520px",
            padding: isMobile ? "1.25rem" : "1.75rem",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: isMobile ? "1.4rem" : "1.6rem",
              fontWeight: 600,
              textAlign: "center",
              color: ACCENT_DARK,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            ARAN
          </h1>
          <p
            style={{
              margin: "0.45rem 0 1.4rem 0",
              fontSize: "0.9rem",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            Say or type a loose idea. Aran turns it into a visual deck.
          </p>

          {/* Project type */}
          <div style={{ marginBottom: "0.9rem" }}>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "#6b7280",
                display: "block",
                marginBottom: "0.25rem",
              }}
            >
              Project type
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              style={{
                width: "100%",
                padding: "0.45rem 0.6rem",
                borderRadius: "999px",
                border: "1px solid #d1d5db",
                background: "#f9fafb",
                fontSize: "0.9rem",
                color: "#111827",
              }}
            >
              <option>Film / Narrative</option>
              <option>Commercial / Advertising</option>
              <option>Music Video</option>
              <option>Brand Campaign</option>
              <option>Documentary</option>
              <option>Fashion Film</option>
            </select>
          </div>

          {/* Idea input */}
          <div>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "#6b7280",
                display: "block",
                marginBottom: "0.25rem",
              }}
            >
              Idea
            </label>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              style={{
                width: "100%",
                minHeight: "100px",
                borderRadius: "0.75rem",
                padding: "0.7rem 0.8rem",
                border: "1px solid #d1d5db",
                fontSize: "0.9rem",
                resize: "vertical",
              }}
              placeholder='Example: "A looping fashion film where time freezes except one person."'
            />
          </div>

          {/* Buttons */}
          <div
            style={{
              marginTop: "0.9rem",
              display: "flex",
              gap: "0.5rem",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{
                flexGrow: 1,
                padding: "0.55rem 1.1rem",
                borderRadius: "999px",
                border: "none",
                background: canGenerate ? ACCENT : "#9ca3af",
                color: "#ffffff",
                fontSize: "0.9rem",
                fontWeight: 500,
                cursor: canGenerate ? "pointer" : "not-allowed",
              }}
            >
              {isGenerating ? "Generating…" : "Generate"}
            </button>

            {supported && (
              <button
                onClick={toggle}
                style={{
                  padding: "0.55rem 0.9rem",
                  borderRadius: "999px",
                  border: "1px solid #d1d5db",
                  background: "rgba(255,255,255,0.9)",
                  fontSize: "0.85rem",
                  color: "#111827",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {isListening ? "Stop" : "🎤 Voice"}
              </button>
            )}
          </div>

          {aiStatus && (
            <p
              style={{
                marginTop: "0.6rem",
                fontSize: "0.85rem",
                color: "#4b5563",
                textAlign: "center",
              }}
            >
              {aiStatus}
            </p>
          )}
        </Card>
      </div>
    );
  }

  // ---------- VIEW 2: FULL DECK UI (AFTER GENERATION) ----------
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "transparent",
        padding: isMobile ? "1rem" : "1.5rem",
        animation: "fadeInUp 0.4s ease-out",
      }}
    >
      <header
        style={{
          maxWidth: "1120px",
          margin: isMobile ? "0 auto 1rem auto" : "0 auto 1.5rem auto",
          display: "flex",
          justifyContent: isMobile ? "center" : "space-between",
          gap: "1rem",
          alignItems: isMobile ? "center" : "flex-end",
          flexWrap: "wrap",
          textAlign: isMobile ? "center" : "left",
          color: "#e5e7eb",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.4rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            ARAN
          </h1>
          <p
            style={{
              margin: "0.35rem 0 0 0",
              fontSize: "0.9rem",
              color: "#d1d5db",
            }}
          >
            Refine, visualize, and save your deck.
          </p>
        </div>
      </header>

      <main
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          display: isMobile ? "flex" : "grid",
          flexDirection: isMobile ? "column" : undefined,
          gridTemplateColumns: isMobile
            ? undefined
            : "minmax(0, 3fr) minmax(0, 1.4fr)",
          gap: isMobile ? "0.9rem" : "1.25rem",
        }}
      >
        {/* LEFT: Controls + deck */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "0.9rem" : "1.25rem",
          }}
        >
          {/* Compact controls (inside a Card) */}
          <Card>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "center",
                marginBottom: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "160px" }}>
                <label
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    color: "#6b7280",
                    display: "block",
                    marginBottom: "0.25rem",
                  }}
                >
                  Project type
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.4rem 0.5rem",
                    borderRadius: "999px",
                    border: "1px solid #d1d5db",
                    background: "#f9fafb",
                    fontSize: "0.9rem",
                    color: "#111827",
                  }}
                >
                  <option>Film / Narrative</option>
                  <option>Commercial / Advertising</option>
                  <option>Music Video</option>
                  <option>Brand Campaign</option>
                  <option>Documentary</option>
                  <option>Fashion Film</option>
                </select>
              </div>

              <div style={{ flex: 2, minWidth: "220px" }}>
                <label
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    color: "#6b7280",
                    display: "block",
                    marginBottom: "0.25rem",
                  }}
                >
                  Idea
                </label>
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  style={{
                    width: "100%",
                    height: isMobile ? "70px" : "60px",
                    borderRadius: "0.5rem",
                    padding: "0.5rem 0.6rem",
                    border: "1px solid #d1d5db",
                    fontSize: "0.85rem",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: "0.25rem",
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                style={{
                  flexGrow: 1,
                  padding: "0.5rem 1.1rem",
                  borderRadius: "999px",
                  border: "none",
                  background: canGenerate ? ACCENT : "#9ca3af",
                  color: "#ffffff",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  cursor: canGenerate ? "pointer" : "not-allowed",
                }}
              >
                {isGenerating ? "Regenerating…" : "Regenerate"}
              </button>

              {supported && (
                <button
                  onClick={toggle}
                  style={{
                    padding: "0.5rem 0.9rem",
                    borderRadius: "999px",
                    border: "1px solid #d1d5db",
                    background: "rgba(255,255,255,0.9)",
                    fontSize: "0.85rem",
                    color: "#111827",
                    cursor: "pointer",
                  }}
                >
                  {isListening ? "Stop" : "🎤 Voice"}
                </button>
              )}

              <button
                onClick={handleExportPdf}
                style={{
                  padding: "0.5rem 0.9rem",
                  borderRadius: "999px",
                  border: "1px solid #d1d5db",
                  background: "rgba(255,255,255,0.9)",
                  fontSize: "0.85rem",
                  color: "#111827",
                  cursor: "pointer",
                }}
              >
                Export as PDF
              </button>

              <button
                onClick={handleCopyShareLink}
                disabled={!deck}
                style={{
                  padding: "0.5rem 0.9rem",
                  borderRadius: "999px",
                  border: "1px solid #d1d5db",
                  background: deck ? "rgba(255,255,255,0.9)" : "#f3f4f6",
                  fontSize: "0.85rem",
                  color: "#111827",
                  cursor: deck ? "pointer" : "not-allowed",
                }}
              >
                Copy share link
              </button>
            </div>

            {aiStatus && (
              <p
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.85rem",
                  color: "#4b5563",
                }}
              >
                {aiStatus}
              </p>
            )}

            {shareUrl && (
              <div
                style={{
                  marginTop: "0.4rem",
                  fontSize: "0.8rem",
                  color: "#4b5563",
                }}
              >
                <div style={{ marginBottom: "0.15rem" }}>Share link:</div>
                <input
                  value={shareUrl}
                  readOnly
                  onClick={(e) => e.target.select()}
                  style={{
                    width: "100%",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #d1d5db",
                    background: "#f9fafb",
                    fontSize: "0.8rem",
                  }}
                />
              </div>
            )}
          </Card>

          {/* Deck card */}
          <Card>
            {/* Editable title, logline, synopsis */}
            <div style={{ marginBottom: "1rem" }}>
              <input
                value={deck.title || ""}
                onChange={(e) => handleDeckFieldChange("title", e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.4rem 0.5rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #d1d5db",
                  marginBottom: "0.4rem",
                  fontWeight: 600,
                  fontSize: "1rem",
                }}
              />
              <textarea
                value={deck.logline || ""}
                onChange={(e) =>
                  handleDeckFieldChange("logline", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "0.4rem 0.5rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #d1d5db",
                  marginBottom: "0.4rem",
                  fontSize: "0.9rem",
                  resize: "vertical",
                }}
              />
              <textarea
                value={deck.synopsis || ""}
                onChange={(e) =>
                  handleDeckFieldChange("synopsis", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "0.4rem 0.5rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #d1d5db",
                  fontSize: "0.9rem",
                  minHeight: "80px",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Beats */}
            <div style={{ marginBottom: "1rem" }}>
              <h3
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "0.95rem",
                  color: ACCENT_DARK,
                }}
              >
                Structure
              </h3>
              {deck.beats?.map((b, i) => (
                <div key={b.label} style={{ marginBottom: "0.5rem" }}>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.2rem",
                      color: "#4b5563",
                    }}
                  >
                    {b.label}
                  </div>
                  <textarea
                    value={b.text || ""}
                    onChange={(e) => handleBeatChange(i, e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.35rem 0.5rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #e5e7eb",
                      fontSize: "0.85rem",
                      minHeight: "50px",
                      resize: "vertical",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Storyboard */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.4rem",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "0.95rem",
                    color: ACCENT_DARK,
                  }}
                >
                  Storyboard (AI image prompts)
                </h3>
                <button
                  onClick={handleGenerateImages}
                  disabled={isGeneratingImages}
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: "999px",
                    border: "none",
                    background: isGeneratingImages ? "#9ca3af" : ACCENT,
                    color: "#ffffff",
                    fontSize: "0.8rem",
                    cursor: isGeneratingImages ? "wait" : "pointer",
                  }}
                >
                  {isGeneratingImages ? "Generating…" : "Generate images"}
                </button>
              </div>

              {deck.storyboardFrames?.map((f, i) => (
                <div
                  key={f.name}
                  style={{
                    borderRadius: "0.75rem",
                    border: "1px solid #e5e7eb",
                    padding: "0.6rem",
                    marginBottom: "0.6rem",
                    display: "grid",
                    gridTemplateColumns: f.imageUrl
                      ? isMobile
                        ? "1fr"
                        : "2fr 1.2fr"
                      : "1fr",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        marginBottom: "0.2rem",
                        color: "#374151",
                      }}
                    >
                      {f.name}
                    </div>
                    <textarea
                      value={f.description || ""}
                      onChange={(e) =>
                        handleFrameDescriptionChange(i, e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "0.35rem 0.5rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #e5e7eb",
                        fontSize: "0.85rem",
                        minHeight: "50px",
                        resize: "vertical",
                      }}
                    />
                  </div>
                  {f.imageUrl && (
                    <div>
                      <img
                        src={f.imageUrl}
                        alt={f.name}
                        style={{
                          width: "100%",
                          borderRadius: "0.5rem",
                          border: "1px solid #e5e7eb",
                          objectFit: "cover",
                          maxHeight: "220px",
                          display: "block",
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: "0.75rem" }}>
              <button
                onClick={handleSaveDeck}
                style={{
                  padding: "0.45rem 0.9rem",
                  borderRadius: "999px",
                  border: "none",
                  background: ACCENT_DARK,
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Save deck
              </button>
            </div>
          </Card>
        </div>

        {/* RIGHT: Saved decks */}
        <Card
          style={{
            alignSelf: "flex-start",
            padding: "1rem",
          }}
        >
          <h3
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "0.95rem",
              color: ACCENT_DARK,
            }}
          >
            Saved decks
          </h3>
          {savedDecks.length === 0 && (
            <p
              style={{
                fontSize: "0.85rem",
                color: "#6b7280",
                marginTop: "0.25rem",
              }}
            >
              No saved decks yet. Generate a deck, then click “Save deck”.
            </p>
          )}
          {savedDecks.map((d, idx) => (
            <button
              key={idx}
              onClick={() => handleLoadDeck(idx)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "0.55rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #e5e7eb",
                marginBottom: "0.4rem",
                background: "#f9fafb",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  color: "#111827",
                }}
              >
                {d.title}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  marginTop: "0.05rem",
                }}
              >
                {d.style || "General"} ·{" "}
                {d.savedAt
                  ? new Date(d.savedAt).toLocaleString()
                  : "Saved deck"}
              </div>
            </button>
          ))}
        </Card>
      </main>

      <footer
        style={{
          maxWidth: "1120px",
          margin: "1rem auto 0",
          fontSize: "0.75rem",
          color: "#d1fae5",
          textAlign: isMobile ? "center" : "right",
          opacity: 0.9,
        }}
      >
        Made with Aran · v0.1
      </footer>
    </div>
  );
}
