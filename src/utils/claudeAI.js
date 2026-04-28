const Anthropic = require('@anthropic-ai/sdk');
const { env } = require('../config/env');

let client = null;

/**
 * Get or create Anthropic client instance.
 */
function getClient() {
  if (!client) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Verify product freshness using Claude AI vision.
 * Sends the product image URL to Claude and asks for a freshness assessment.
 * @param {string} imageUrl - Cloudinary URL of the product image
 * @returns {Promise<Object>} { fresh: boolean, confidence: number, reason: string }
 */
async function verifyFreshness(imageUrl) {
  try {
    const anthropic = getClient();

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5-20250229',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: `You are a produce freshness inspector for a farm-to-table marketplace called HarvestLink. 
              
Analyze this image of a farm product and assess its freshness.

Respond ONLY with valid JSON in this exact format, no other text:
{
  "fresh": true/false,
  "confidence": <number between 0 and 100>,
  "reason": "<brief explanation of your assessment>"
}

Consider these factors:
- Color vibrancy and uniformity
- Signs of wilting, bruising, or decay
- Overall visual quality
- Whether it appears freshly harvested

If the image is not of a food/produce item, set fresh to false, confidence to 0, and explain in reason.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].text.trim();
    // Parse the JSON response, handling potential markdown code blocks
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      fresh: Boolean(result.fresh),
      confidence: Number(result.confidence),
      reason: String(result.reason),
    };
  } catch (error) {
    console.error('❌ Claude AI freshness verification failed:', error.message);
    // Return a safe default — do not block the product upload
    return {
      fresh: false,
      confidence: 0,
      reason: `AI verification unavailable: ${error.message}`,
    };
  }
}

/**
 * Suggest a retail price based on mandi (wholesale market) data.
 * Uses Claude AI to analyze market data and suggest a fair price.
 * @param {string} productName - Name of the product
 * @param {string} category - Product category
 * @param {Object} mandiData - Mandi price data { commodity, avgPrice, minPrice, maxPrice, market, state }
 * @returns {Promise<number|null>} Suggested retail price or null
 */
async function suggestMandiPrice(productName, category, mandiData) {
  try {
    const anthropic = getClient();

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5-20250229',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `You are a pricing analyst for HarvestLink, a farm-to-table marketplace in India.

Based on the following mandi (wholesale market) data, suggest a fair retail price for the product.

Product: ${productName}
Category: ${category}
Mandi Data:
- Commodity: ${mandiData.commodity || productName}
- Average Mandi Price: ₹${mandiData.avgPrice}/kg
- Min Mandi Price: ₹${mandiData.minPrice}/kg
- Max Mandi Price: ₹${mandiData.maxPrice}/kg
- Market: ${mandiData.market || 'N/A'}
- State: ${mandiData.state || 'N/A'}

Consider:
1. Farm-to-table products typically have a 20-40% markup over mandi prices
2. Quality premium for verified fresh produce
3. Logistics and handling costs

Respond ONLY with a single number representing the suggested retail price per kg in INR. No other text. Example: 85`,
        },
      ],
    });

    const price = parseFloat(response.content[0].text.trim());
    return isNaN(price) ? null : price;
  } catch (error) {
    console.error('❌ Claude AI price suggestion failed:', error.message);
    return null;
  }
}

module.exports = { verifyFreshness, suggestMandiPrice };
