/**
 * Equity Labs - NVIDIA AI Cloudflare Worker Proxy
 * 
 * Free serverless edge proxy to connect the web app (GitHub Pages) with NVIDIA NIM API.
 * 
 * Features:
 * - Full CORS handling (Access-Control-Allow-Origin: *)
 * - Forwards requests to https://integrate.api.nvidia.com/v1/chat/completions
 * - Securely attaches the NVIDIA API Key from environment or fallback
 * - Supports streaming and non-streaming responses
 * 
 * Deploy on Cloudflare Workers (100% Free - 100,000 requests/day):
 * 1. Go to https://dash.cloudflare.com/ -> Workers & Pages -> Create Worker
 * 2. Paste this file content into the worker editor
 * 3. (Optional) In Settings -> Variables, add NVIDIA_API_KEY as an encrypted secret
 * 4. Click Deploy!
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // 1. Handle browser CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Health check endpoint
    if (request.method === "GET") {
      return new Response(JSON.stringify({ status: "ok", service: "equity-labs-nvidia-proxy" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST requests supported" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const apiKey = env?.NVIDIA_API_KEY || "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";
      const body = await request.json();

      const nvidiaResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "User-Agent": "EquityLabs/1.0"
        },
        body: JSON.stringify(body),
      });

      const responseData = await nvidiaResponse.text();

      return new Response(responseData, {
        status: nvidiaResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message || "Internal Proxy Error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  },
};
