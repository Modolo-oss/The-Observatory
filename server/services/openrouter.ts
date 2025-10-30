// OpenRouter AI Service for multi-model AI access
export class OpenRouterService {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: { role: string; content: string }[]) {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://observatory.replit.app",
          "X-Title": "The Observatory",
        },
        body: JSON.stringify({
          model: "anthropic/claude-3.5-sonnet",
          messages,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "I apologize, but I couldn't generate a response.";
    } catch (error) {
      console.error("OpenRouter error:", error);
      throw error;
    }
  }

  async analyzePerformance(metrics: any) {
    const systemPrompt = `You are an expert AI assistant for The Observatory, a Solana transaction delivery monitoring platform. 
Analyze transaction routing performance metrics and provide actionable insights, recommendations, and anomaly detection.
Be concise, technical, and focus on cost optimization and delivery success rate improvements.`;

    const userPrompt = `Analyze these transaction metrics and provide insights:

Routes Performance:
${JSON.stringify(metrics, null, 2)}

Please provide:
1. Performance analysis of each route
2. Any anomalies or concerning patterns
3. Specific recommendations for optimization
4. Expected impact of recommendations`;

    const response = await this.chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    return response;
  }

  async generateRecommendations(data: any) {
    const prompt = `Based on this Solana transaction routing data, generate 2-3 actionable recommendations:

${JSON.stringify(data, null, 2)}

Format each recommendation as:
{
  "title": "Brief title",
  "description": "Detailed explanation",
  "severity": "info" | "warning" | "critical",
  "recommendation": {
    "action": "Specific action to take",
    "expectedImpact": "Quantified expected outcome"
  },
  "confidenceScore": 0.XX
}

Return valid JSON array of recommendations.`;

    try {
      const response = await this.chat([
        { role: "system", content: "You are a Solana transaction optimization expert. Return only valid JSON." },
        { role: "user", content: prompt },
      ]);

      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: return mock recommendations
      return [];
    } catch (error) {
      console.error("Failed to generate recommendations:", error);
      return [];
    }
  }
}

// Export singleton instance
export const openRouter = new OpenRouterService(process.env.OPENROUTER_API_KEY || "");
