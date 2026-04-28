const axios = require('axios');
const { env } = require('../config/env');

const AGMARKNET_BASE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

/**
 * Fetch current mandi (wholesale market) prices from Agmarknet (data.gov.in).
 * @param {string} commodity - Commodity name (e.g., 'Tomato', 'Potato')
 * @param {string} state - State name (e.g., 'Maharashtra', 'Karnataka')
 * @returns {Promise<Object|null>} Mandi price data or null on failure
 */
async function fetchMandiPrice(commodity, state) {
  try {
    // In development, return mock data if API key is not set
    if (env.NODE_ENV === 'development' && !env.AGMARKNET_API_KEY) {
      console.log(`📊 [DEV] Mock mandi price for ${commodity} in ${state}`);
      return getMockMandiData(commodity);
    }

    const response = await axios.get(AGMARKNET_BASE_URL, {
      params: {
        'api-key': env.AGMARKNET_API_KEY,
        format: 'json',
        limit: 10,
        'filters[commodity]': commodity,
        'filters[state]': state,
      },
      timeout: 10000,
    });

    if (response.data && response.data.records && response.data.records.length > 0) {
      const records = response.data.records;

      // Calculate averages from available records
      const prices = records.map((r) => ({
        min: parseFloat(r.min_price) || 0,
        max: parseFloat(r.max_price) || 0,
        modal: parseFloat(r.modal_price) || 0,
      }));

      const avgPrice =
        prices.reduce((sum, p) => sum + p.modal, 0) / prices.length;
      const minPrice = Math.min(...prices.map((p) => p.min));
      const maxPrice = Math.max(...prices.map((p) => p.max));

      return {
        commodity: records[0].commodity,
        avgPrice: Math.round(avgPrice * 100) / 100,
        minPrice,
        maxPrice,
        market: records[0].market,
        state: records[0].state,
        date: records[0].arrival_date,
        recordCount: records.length,
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Agmarknet API error:', error.message);
    return null;
  }
}

/**
 * Get mock mandi data for development.
 * @param {string} commodity
 * @returns {Object}
 */
function getMockMandiData(commodity) {
  const mockPrices = {
    tomato: { avgPrice: 25, minPrice: 15, maxPrice: 40 },
    potato: { avgPrice: 18, minPrice: 10, maxPrice: 30 },
    onion: { avgPrice: 22, minPrice: 12, maxPrice: 35 },
    rice: { avgPrice: 35, minPrice: 25, maxPrice: 50 },
    wheat: { avgPrice: 28, minPrice: 20, maxPrice: 38 },
    default: { avgPrice: 30, minPrice: 15, maxPrice: 45 },
  };

  const key = commodity.toLowerCase();
  const prices = mockPrices[key] || mockPrices.default;

  return {
    commodity,
    ...prices,
    market: 'Mock Market',
    state: 'Maharashtra',
    date: new Date().toISOString().split('T')[0],
    recordCount: 1,
  };
}

module.exports = { fetchMandiPrice };
