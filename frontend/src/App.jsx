import { useState } from "react";

export default function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState(null);
  const [tone, setTone] = useState("Breaking");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateNews = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/generate-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: input, tone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate news");
      setOutput(data);
    } catch (err) {
      setError(err.message);
      setOutput(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="mb-4 text-4xl font-bold">NEWSROOM AI</h1>

      <textarea
        className="w-full p-3 text-black"
        rows="6"
        placeholder="Paste news input..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <div className="mt-3 flex gap-3">
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="p-2 text-black"
        >
          <option>Breaking</option>
          <option>Neutral</option>
          <option>Analytical</option>
        </select>

        <button
          onClick={generateNews}
          className="rounded bg-red-600 px-5 py-2"
          disabled={loading}
        >
          {loading ? "Processing..." : "Generate News"}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {output && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Object.entries(output).map(([lang, data]) => (
            <div key={lang} className="rounded-xl bg-gray-900 p-4 shadow">
              <h2 className="text-xl font-bold uppercase">{lang}</h2>
              <h3 className="mt-2 text-lg font-semibold">{data.headline}</h3>
              <p className="mt-2 whitespace-pre-line text-sm">{data.description}</p>

              <button
                className="mt-3 text-xs text-blue-400"
                onClick={() =>
                  navigator.clipboard.writeText(`${data.headline}\n${data.description}`)
                }
              >
                Copy
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
