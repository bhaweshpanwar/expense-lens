require('dotenv').config({ override: true });

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

function getNvidiaApiKey() {
  return process.env.NVIDIA_API_KEY || '';
}

function getNvidiaModel() {
  return process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';
}

function getVisionModel() {
  return process.env.NVIDIA_VISION_MODEL || 'meta/llama-3.2-11b-vision-instruct';
}

function normalizeDate(d) {
  if (!d || typeof d !== 'string') return new Date().toISOString().split('T')[0];
  const trimmed = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

function normalizeAmount(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

function extractReceiptJson(raw) {
  if (!raw) return null;
  const text = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Try direct parse
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.length > 0 ? parsed[0] : null;
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch {}

  // Try line-by-line (NDJSON / multiple JSON objects on separate lines)
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const foundObjects = [];
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj && typeof obj === 'object') foundObjects.push(obj);
    } catch {}
  }
  if (foundObjects.length > 0) return foundObjects[0];

  // Try regex search for first { ... } block
  const match = text.match(/\{[\s\S]*?\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      if (obj && typeof obj === 'object') return obj;
    } catch {}
  }

  return null;
}

/**
 * Checks connection health to AI services.
 */
async function getHealth() {
  const apiKey = getNvidiaApiKey();
  const result = {
    python_service: false,
    nvidia_ai: false,
    model: getNvidiaModel(),
    vision_model: getVisionModel(),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${AI_SERVICE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) result.python_service = true;
  } catch {}

  if (apiKey) {
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
async function callNvidiaChat(messages, model = null, maxTokens = 600, temperature = 0.2) {
  const apiKey = getNvidiaApiKey();
  const selectedModel = model || getNvidiaModel();

  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY not configured');
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text();
        if (res.status >= 500 && attempt === 1) {
          console.warn(`[AI Service] NVIDIA API 5xx temporary glitch (${res.status}), retrying in 1s...`);
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        throw new Error(`NVIDIA API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === 2 || err.name === 'AbortError') throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

/**
 * Uses NVIDIA Vision (or Python AI service) to extract receipt fields from an image buffer.
 */
async function analyzeReceipt(fileBuffer, originalname = 'receipt.jpg', mimetype = 'image/jpeg') {
  const apiKey = getNvidiaApiKey();
  const visionModel = getVisionModel();

  // 1. Try NVIDIA Llama 3.2 Vision first
  if (apiKey && fileBuffer) {
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
        visionModel,
        600,
        0.1
      );

      const parsed = extractReceiptJson(raw);
      if (parsed) {
        return {
          success: true,
          provider: 'nvidia-vision',
          data: {
            vendor: parsed.vendor || null,
            amount: normalizeAmount(parsed.amount),
            date: normalizeDate(parsed.date),
            category: parsed.category || 'Other',
            raw_text: raw,
          },
        };
      }
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
      const prompt = `You are an elite financial strategist advising an Indian business owner.
The business currently spends approximately ₹${Math.round(totalSpend)} monthly.
Category breakdown: ${catsSummary || 'No categorized expenses recorded yet'}.

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
      const prompt = `An expense was flagged as unusual for a business:
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

