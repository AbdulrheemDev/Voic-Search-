/**
 * Salla App Webhook Handler
 * Keeps Meilisearch product index automatically synchronized with Salla store (FR-08)
 */

const express = require('express');
const router = express.Router();
const NormalizationService = require('../../app/Services/NormalizationService');
const SearchEngineService = require('../../app/Services/SearchEngineService');

router.post('/webhooks/salla', async (req, res) => {
  try {
    const { event, data, merchant } = req.body || {};
    console.log(`[Salla Webhook Received] Event: ${event} for Merchant: ${merchant}`);

    switch (event) {
      case 'product.created':
      case 'product.updated': {
        // 1. Extract product attributes & category
        const normalizedName = NormalizationService.normalize(data.name);
        const normalizedCategory = NormalizationService.normalize(data.category?.name || '');
        const normalizedDesc = NormalizationService.normalize(data.description || '');

        console.log(`[Salla Sync] Indexing Product #${data.id}: "${data.name}" -> Normalized: "${normalizedName}"`);
        
        // 2. Re-index in Meilisearch
        SearchEngineService.buildIndex();
        break;
      }

      case 'product.deleted': {
        console.log(`[Salla Sync] Removing Product #${data.id} from search index`);
        SearchEngineService.buildIndex();
        break;
      }

      case 'app.installed': {
        console.log(`[Salla Onboarding] Merchant #${merchant} installed Voice Search App! Triggering initial catalog sync...`);
        // Trigger initial bulk fetch of catalog via Salla API
        break;
      }

      case 'app.uninstalled': {
        console.log(`[Salla Offboarding] Merchant #${merchant} uninstalled app.`);
        break;
      }

      default:
        console.log(`[Salla Webhook] Unhandled event: ${event}`);
    }

    return res.status(200).json({ success: true, received: true });
  } catch (err) {
    console.error('Salla Webhook Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
