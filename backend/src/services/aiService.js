const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
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
 * Calls NVIDIA OpenAI-compatible chat completion endpoint with automatic fallback.
 */
async function callNvidiaChat(messages, model = NVIDIA_MODEL, maxTokens = 600, temperature = 0.2) {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY not configured');
  }

  const tryRequest = async (targetModel) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: targetModel,
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
  };

  try {
    return await tryRequest(model);
  } catch (err) {
    // If primary model failed (e.g. 503 Service Overloaded), fallback to vision/general model
    if (model !== NVIDIA_VISION_MODEL) {
      console.warn(`[AI Service] Model ${model} failed (${err.message}), retrying with fallback model ${NVIDIA_VISION_MODEL}...`);
      try {
        return await tryRequest(NVIDIA_VISION_MODEL);
      } catch (backupErr) {
        throw backupErr;
      }
    }
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
 * Uses NVIDIA Vision to extract multi-item daily ledger / cashbook entries from an image buffer.
 */
async function analyzeLedger(fileBuffer, originalname = 'ledger.jpg', mimetype = 'image/jpeg') {
  if (!NVIDIA_API_KEY || !fileBuffer) {
    return {
      success: false,
      count: 0,
      transactions: [],
      error: 'AI service not configured or missing file',
    };
  }

  try {
    const base64Img = `data:${mimetype};base64,${fileBuffer.toString('base64')}`;
    const prompt = `You are an expert accountant and OCR system specialized in Indian business ledgers, daily expense diaries, and handwritten or printed cashbooks.
Analyze this ledger image carefully. Extract EVERY single transaction or line item present in the image.
For each transaction, extract:
- vendor: payee, merchant, supplier, or person/entity name
- amount: total numeric amount (number only, in INR)
- date: formatted as YYYY-MM-DD (assume year 2026 if only day/month is shown)
- category: closest match from: Raw Materials, Electricity & Utilities, Rent, Transportation, Packaging, Maintenance, Office Supplies, Marketing, Labour, Other
- description: brief note about the item or purpose if mentioned

Return ONLY a valid JSON object with a single key 'transactions' containing the array of all extracted transactions. Do not include markdown formatting or extra text.
Example:
{
  "transactions": [
    { "vendor": "Asian Paints", "amount": 2400, "date": "2026-09-15", "category": "Raw Materials", "description": "Paint supplies" }
  ]
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
      1500,
      0.1
    );

    // Dual-mode parsing: JSON block + Bullet/Line Regex fallback
    let transactions = [];

    // 1. Try parsing JSON directly
    const jsonMatch = raw.match(/\{[\s\S]*"transactions"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
          transactions = parsed.transactions
            .map((t) => ({
              vendor: t.vendor || 'Unknown Payee',
              amount: parseFloat(t.amount) || 0,
              date: t.date || new Date().toISOString().split('T')[0],
              category: t.category || 'Other',
              description: t.description || '',
            }))
            .filter((t) => t.amount > 0);
        }
      } catch {}
    }

    // 2. Fallback to bullet / line parsing
    if (transactions.length === 0) {
      const lines = raw.split('\n');
      const today = new Date().toISOString().split('T')[0];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('The total') || trimmed.startsWith('The image')) continue;

        // Pattern: * Vendor - Item/Desc: ₹Amount (Category)
        const bulletMatch = trimmed.match(/^[\*\-\•\d\.\s]*([A-Za-z0-9\s&]+?)\s*[-–—:]\s*(.*?):\s*₹?\s*([\d,]+(?:\.\d+)?)\s*(?:\((.*?)\))?/i);
        if (bulletMatch) {
          const vendor = bulletMatch[1].trim();
          const desc = bulletMatch[2].trim();
          const amount = parseFloat(bulletMatch[3].replace(/,/g, ''));
          const cat = bulletMatch[4] ? bulletMatch[4].trim() : 'Other';
          if (vendor && !isNaN(amount) && amount > 0) {
            transactions.push({
              vendor,
              description: desc,
              amount,
              category: cat,
              date: today,
            });
            continue;
          }
        }

        // Pattern: * Vendor: ₹Amount (Category)
        const simpleMatch = trimmed.match(/^[\*\-\•\d\.\s]*([A-Za-z0-9\s&]+?):\s*₹?\s*([\d,]+(?:\.\d+)?)\s*(?:\((.*?)\))?/i);
        if (simpleMatch) {
          const vendor = simpleMatch[1].trim();
          const amount = parseFloat(simpleMatch[2].replace(/,/g, ''));
          const cat = simpleMatch[3] ? simpleMatch[3].trim() : 'Other';
          if (vendor && !isNaN(amount) && amount > 0) {
            transactions.push({
              vendor,
              description: '',
              amount,
              category: cat,
              date: today,
            });
          }
        }
      }
    }

    return {
      success: true,
      count: transactions.length,
      transactions,
      raw_text: raw,
    };
  } catch (err) {
    console.error('[AI Service] analyzeLedger failed:', err.message);
    return {
      success: false,
      count: 0,
      transactions: [],
      error: err.message,
    };
  }
}

/**
 * Generates tailored savings advice using NVIDIA Nemotron AI.
 */
async function generateSavingsAdvice({ targetMonthlySave, categoryBreakdown = [], totalSpend = 0, businessName = '' }) {
  const target = Number(targetMonthlySave) || 10000;
  const catsSummary = categoryBreakdown
    .map((c) => `${c.category || c.name}: current spend ₹${Math.round(c.total || 0)}`)
    .join(', ');

  const displayName = businessName ? `${businessName}` : 'a small business';

  if (NVIDIA_API_KEY) {
    try {
      const prompt = `You are an elite financial strategist advising an Indian business owner (${displayName}).
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
  const nonEssential = [
    'Marketing', 'Advertising', 'Office Supplies', 'Maintenance',
    'Packaging', 'Transportation', 'Logistics', 'Raw Materials', 'Miscellaneous'
  ];
  let remainingTarget = target;
  const suggestions = [];

  categoryBreakdown.forEach((c) => {
    const name = c.category || c.name;
    const spend = Number(c.total) || 0;
    if (nonEssential.includes(name) && spend > 500 && remainingTarget > 0) {
      const cut = Math.min(Math.round(spend * 0.15), remainingTarget);
      if (cut > 0) {
        remainingTarget -= cut;
        suggestions.push({
          category: name,
          current_monthly_avg: spend,
          suggested_cut: cut,
          tip: `Audit expenditures and negotiate bulk contracts or eliminate ad-hoc orders in ${name}.`,
        });
      }
    }
  });

  const effectiveSpend = totalSpend > 0 ? totalSpend : target * 4;
  return {
    success: true,
    source: 'rule-based',
    target_monthly_save: target,
    feasibility: target <= effectiveSpend * 0.15 ? 'easy' : target <= effectiveSpend * 0.25 ? 'moderate' : 'aggressive',
    summary: `Targeting ₹${target} in monthly savings is achievable by curbing discretionary spend across ${suggestions.length || 'key'} operational categories.`,
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
  analyzeLedger,
  generateSavingsAdvice,
  recommendBudgetLimits,
  explainUnusualExpense,
};

