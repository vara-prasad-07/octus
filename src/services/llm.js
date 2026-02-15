import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// System prompt for insights generation
const SYSTEM_PROMPT = `You are an AI quality analyst.

Using the provided project planning data, visual QA results, test execution data, and defect distribution, generate a STRICT JSON response that includes:

1. Defect trends across builds (increasing, decreasing, or stable) with a short explanation.
2. Quality hotspots by module with severity levels (low, medium, high, critical).
3. A release readiness score between 0 and 100.
4. A release decision (RELEASE / CAUTION / BLOCK).
5. A short, human-readable recommendation.

Rules:
- Output ONLY valid JSON.
- Do NOT include explanations outside JSON.
- Use realistic engineering judgment.
- Assume unresolved critical defects heavily impact release readiness.

Required JSON format:
{
  "defect_trends": {
    "trend": "increasing" | "decreasing" | "stable",
    "summary": "Brief explanation of the trend"
  },
  "hotspots": [
    {
      "module": "Module name",
      "defect_count": number,
      "severity": "low" | "medium" | "high" | "critical"
    }
  ],
  "release_readiness": {
    "score": number (0-100),
    "decision": "RELEASE" | "CAUTION" | "BLOCK",
    "reasoning": ["reason 1", "reason 2", "reason 3"]
  },
  "recommendation": "Short, actionable recommendation"
}`;

/**
 * Initialize Gemini AI
 */
const initializeGemini = () => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not found. Please add VITE_GEMINI_API_KEY to your .env file');
  }
  
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
};

/**
 * Generate insights using Gemini AI
 * @param {Object} data - Combined data from Firebase collections
 * @returns {Promise<Object>} Insights analysis
 */
export const generateInsightsWithGemini = async (data) => {
  try {
    console.log('=== GENERATING INSIGHTS WITH GEMINI ===');
    console.log('Input data:', {
      testGenerationCount: data.testGenerationHistory?.length || 0,
      uiValidationsCount: data.uiValidations?.length || 0,
      uxValidationsCount: data.uxValidations?.length || 0
    });

    const model = initializeGemini();

    // Prepare the data summary for the LLM
    const dataSummary = {
      testGenerationHistory: data.testGenerationHistory || [],
      uiValidations: data.uiValidations || [],
      uxValidations: data.uxValidations || []
    };

    // Create the prompt
    const userPrompt = `Analyze the following project data and generate insights:

${JSON.stringify(dataSummary, null, 2)}

Generate the insights in the exact JSON format specified.`;

    console.log('Sending request to Gemini...');

    // Generate content
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: userPrompt }
    ]);

    const response = await result.response;
    const text = response.text();

    console.log('Raw Gemini response:', text);

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    // Parse the JSON
    const insights = JSON.parse(jsonText.trim());

    console.log('=== PARSED INSIGHTS ===');
    console.log(JSON.stringify(insights, null, 2));
    console.log('=======================');

    // Validate the response structure
    if (!insights.defect_trends || !insights.hotspots || !insights.release_readiness || !insights.recommendation) {
      throw new Error('Invalid insights format received from Gemini');
    }

    return insights;
  } catch (error) {
    console.error('Error generating insights with Gemini:', error);
    
    // If JSON parsing fails, provide a fallback response
    if (error instanceof SyntaxError) {
      console.error('Failed to parse Gemini response as JSON');
      throw new Error('Failed to parse AI response. Please try again.');
    }
    
    throw new Error('Failed to generate insights: ' + error.message);
  }
};

/**
 * Test function to verify Gemini API connection
 */
export const testGeminiConnection = async () => {
  try {
    const model = initializeGemini();
    const result = await model.generateContent('Say "Hello, Gemini is working!"');
    const response = await result.response;
    console.log('Gemini test response:', response.text());
    return true;
  } catch (error) {
    console.error('Gemini connection test failed:', error);
    return false;
  }
};
