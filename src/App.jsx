import { useState } from "react";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [deck, setDeck] = useState(null);
  const [error, setError] = useState(null);

  // 🔥 IMPORTANT: Update this ONLY if your backend URL changes
  const API_URL = "https://aran-api-backend.vercel.app/api/generate-deck";

  async function generateDeck() {
    setLoading(true);
    setError(null);
    setDeck(null);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setDeck(data);
    } catch (err) {
      console.error(err);
