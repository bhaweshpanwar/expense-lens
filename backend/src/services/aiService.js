const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';
const NVIDIA_VISION_MODEL = process.env.NVIDIA_VISION_MODEL || 'meta/llama-3.2-11b-vision-instruct';

/**
 * Checks connection health to AI services.
 */
async function getHealth() {
  const result = {
    python_service: false,
    nvidia_ai: false,
    model: NVIDIA_MODEL,
    vision_model: NVIDIA_VISION_MODEL,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${AI_SERVICE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) result.python_service = true;
  } catch {}

  if (NVIDIA_API_KEY) {
    result.nvidia_ai = true;
  }

  return {
    connected: result.nvidia_ai || result.python_service,
    ...result,
  };
}

/**
 * Calls NVIDIA OpenAI-compatible chat completion endpoint.
 */
async function callNvidiaChat(messages, model = NVIDIA_MODEL, maxTokens = 600, temperature = 0.2) {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`NVIDIA API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * Uses NVIDIA Vision (or Python AI service) to extract receipt fields from an image buffer.
 */
async function analyzeReceipt(fileBuffer, originalname = 'receipt.jpg', mimetype = 'image/jpeg') {
  // 1. Try NVIDIA Llama 3.2 Vision first
  if (NVIDIA_API_KEY && fileBuffer) {
    try {
      const base64Img = `data:${mimetype};base64,${fileBuffer.toString('base64')}`;
      const prompt = `Analyze this receipt image. Extract the business details and return ONLY a valid JSON object with NO markdown formatting, matching this exact shape:
{
  "vendor": "Name of store/vendor or null",
  "amount": numeric total amount or null,
  "date": "YYYY-MM-DD" or null,
  "category": "Suggest closest from: Raw Materials, Electricity & Utilities, Rent, Transportation, Packaging, Maintenance, Office Supplies, Marketing, Labour, Other"
}`;

      const raw = await callNvidiaChat(
        [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: base64Img } },
            ],
          },
        ],
        NVIDIA_VISION_MODEL,
        250,
        0.1
      );

      // Clean JSON
      const jsonText = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonText);
      return {
        success: true,
        provider: 'nvidia-vision',
        data: {
          vendor: parsed.vendor || null,
          amount: parsed.amount ? parseFloat(parsed.amount) : null,
          date: parsed.date || new Date().toISOString().split('T')[0],
          category: parsed.category || 'Other',
          raw_text: raw,
        },
      };
    } catch (err) {
      console.warn('[AI Service] NVIDIA Vision extraction failed, attempting fallback:', err.message);
    }
  }

  // 2. Try Python AI service on port 8000
  try {
    const blob = new Blob([fileBuffer], { type: mimetype });
    const formData = new FormData();
    formData.append('file', blob, originalname);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${AI_SERVICE_URL}/api/analyze-receipt`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        provider: 'python-service',
        data: {
          vendor: data.vendor || null,
          amount: data.amount ? parseFloat(data.amount) : null,
          date: data.date || new Date().toISOString().split('T')[0],
          category: data.category || 'Other',
          raw_text: data.raw_text || '',
        },
      };
    }
  } catch (err) {
    console.warn(`[AI Service] Python AI service receipt error: ${err.message}`);
  }

  // 3. Fallback
  return {
    success: false,
    fallback: true,
    data: {
      vendor: null,
      amount: null,
      date: new Date().toISOString().split('T')[0],
      category: 'Other',
      raw_text: '',
    },
  };
}

/**
 * Generates tailored savings advice using NVIDIA Nemotron AI.
 */
async function generateSavingsAdvice({ targetMonthlySave, categoryBreakdown = [], totalSpend = 0 }) {
  const target = Number(targetMonthlySave) || 10000;
  const catsSummary = categoryBreakdown
    .map((c) => `${c.category || c.name}: current spend ₹${Math.round(c.total || 0)}`)
    .join(', ');

  if (NVIDIA_API_KEY) {
    try {
      const prompt = `You are an elite financial strategist advising an Indian business owner (Sharma Furniture & Hardware).
The business currently spends approximately ₹${Math.round(totalSpend)} monthly.
Category breakdown: ${catsSummary || 'Raw Materials: ₹35,000, Electricity & Utilities: ₹9,000, Transportation: ₹6,000, Packaging: ₹4,000, Maintenance: ₹3,000, Marketing: ₹4,000, Labour: ₹20,000'}.

The owner wants to achieve a monthly savings target of ₹${target}.

Analyze which categories can absorb cuts without damaging core operations.
Provide your response in ONLY valid JSON (no markdown formatting, no backticks) with this structure:
{
  "target_monthly_save": ${target},
  "feasibility": "easy" or "moderate" or "aggressive",
  "summary": "Short encouraging assessment of whether saving ₹${target} is realistic and what the strategy is.",
  "suggestions": [
    {
      "category": "Category Name",
      "current_monthly_avg": number,
      "suggested_cut": number,
      "tip": "Specific, actionable tactic for this category"
    }
  ],
  "action_plan": [
    "High impact tactical action 1",
    "High impact tactical action 2",
    "High impact tactical action 3"
  ]
}`;

      const raw = await callNvidiaChat(
        [
          { role: 'system', content: 'You are a CFO-level financial advisor for Indian MSMEs. Always reply in valid JSON.' },
          { role: 'user', content: prompt },
        ],
        NVIDIA_MODEL,
        700,
        0.2
      );

      const jsonText = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonText);
      return {
        success: true,
        source: 'nemotron-ai',
        ...parsed,
      };
    } catch (err) {
      console.warn('[AI Service] Nemotron savings advice failed, falling back:', err.message);
    }
  }

  // Rule-based fallback
  const nonEssential = ['Marketing', 'Office Supplies', 'Maintenance', 'Packaging', 'Transportation', 'Raw Materials'];
  let remainingTarget = target;
  const suggestions = [];

  categoryBreakdown.forEach((c) => {
    const name = c.category || c.name;
    const spend = Number(c.total) || 0;
    if (nonEssential.includes(name) && spend > 1000 && remainingTarget > 0) {
      const cut = Math.min(Math.round(spend * 0.15), remainingTarget);
      if (cut > 0) {
        remainingTarget -= cut;
        suggestions.push({
          category: name,
          current_monthly_avg: spend,
          suggested_cut: cut,
          tip: `Optimize procurement and reduce ad-hoc orders in ${name}.`,
        });
      }
    }
  });

  return {
    success: true,
    source: 'rule-based',
    target_monthly_save: target,
    feasibility: target <= totalSpend * 0.15 ? 'easy' : target <= totalSpend * 0.25 ? 'moderate' : 'aggressive',
    summary: `Targeting ₹${target} in monthly savings is achievable by curbing discretionary spend across ${suggestions.length} key categories.`,
    suggestions,
    action_plan: [
      'Consolidate vendor orders to negotiate bulk purchase discounts of 5-8%.',
      'Audit monthly utility and maintenance contracts to eliminate redundant costs.',
      'Review ad-hoc transport trips and batch deliveries on fixed weekly routes.',
    ],
  };
}

/**
 * Recommends optimal budget limits per category using Nemotron AI.
 */
async function recommendBudgetLimits({ categoryBreakdown = [], monthlyBudget = 100000 }) {
  const catsSummary = categoryBreakdown
    .map((c) => `${c.category || c.name}: avg spend ₹${Math.round(c.total || 0)}`)
    .join(', ');

  if (NVIDIA_API_KEY) {
    try {
      const prompt = `Based on the following actual spending: ${catsSummary}.
Recommend a disciplined monthly budget limit for each category.
Overall target budget: ₹${monthlyBudget}.
Return ONLY a valid JSON object matching:
{
  "recommended_total": ${monthlyBudget},
  "advice": "1-2 sentence overall guidance",
  "limits": [
    { "category": "Category Name", "recommended_limit": number, "rationale": "Short explanation" }
  ]
}`;

      const raw = await callNvidiaChat(
        [
          { role: 'system', content: 'You are an expense budgeting AI. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        NVIDIA_MODEL,
        600,
        0.2
      );

      const jsonText = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      return { success: true, ...JSON.parse(jsonText) };
    } catch (err) {
      console.warn('[AI Service] Nemotron budget recommendations failed:', err.message);
    }
  }

  // Fallback
  return {
    success: true,
    recommended_total: monthlyBudget,
    advice: 'Budgets calibrated at 90-95% of past average to build a sustainable operating margin.',
    limits: categoryBreakdown.map((c) => ({
      category: c.category || c.name,
      recommended_limit: Math.round((Number(c.total) || 5000) * 0.95),
      rationale: 'Calibrated from historical spending patterns.',
    })),
  };
}

/**
 * Requests an AI explanation for an unusual expense outlier.
 */
async function explainUnusualExpense({ vendor, category, amount, historical_average }) {
  if (NVIDIA_API_KEY) {
    try {
      const prompt = `An expense was flagged as unusual for a small furniture business:
Category: ${category}
Vendor: ${vendor}
Current Amount: ₹${amount}
Historical Average: ₹${historical_average}
Difference: ₹${Number(amount) - Number(historical_average)}

Give a concise, factual 1-sentence explanation of why this deviation matters and what the owner should verify.`;

      const response = await callNvidiaChat(
        [{ role: 'user', content: prompt }],
        NVIDIA_MODEL,
        100,
        0.3
      );
      return {
        flagged: true,
        reason: response.trim(),
        current_amount: amount,
        historical_average,
        difference: Number(amount) - Number(historical_average),
      };
    } catch {}
  }

  const diff = Number(amount) - Number(historical_average);
  return {
    flagged: diff > 0,
    reason: `${category || 'Expense'} of ₹${amount} is significantly higher than historical average of ₹${historical_average}.`,
    current_amount: amount,
    historical_average,
    difference: diff,
  };
}

module.exports = {
  getHealth,
  analyzeReceipt,
  generateSavingsAdvice,
  recommendBudgetLimits,
  explainUnusualExpense,
};

