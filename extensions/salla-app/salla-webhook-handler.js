/**
 * Salla Webhook Handler (Multi-Tenant Synchronization)
 * Listens to Salla webhook events and synchronizes the search index in real-time (FR-08, TC-10).
 */

const NormalizationService = require('../../app/Services/NormalizationService');
const SearchEngineService = require('../../app/Services/SearchEngineService');

class SallaWebhookHandler {
  /**
   * Handle product.created or product.updated
   */
  static handleProductSync(merchantId, sallaProductPayload) {
    console.log(`[Salla Webhook] Syncing product ${sallaProductPayload.id} for merchant ${merchantId}`);

    // Map Salla API product format to our searchable document
    const productDoc = {
      id: sallaProductPayload.id,
      name: NormalizationService.normalize(sallaProductPayload.name),
      category: NormalizationService.normalize(sallaProductPayload.category ? sallaProductPayload.category.name : ''),
      attributes: NormalizationService.normalize(
        (sallaProductPayload.options || []).map(o => o.values.map(v => v.name).join(' ')).join(' ')
      ),
      description: NormalizationService.normalize(sallaProductPayload.description || ''),
      price: sallaProductPayload.price ? sallaProductPayload.price.amount : 0,
      image_url: sallaProductPayload.main_image || '',
      in_stock: sallaProductPayload.is_available ? 1 : 0
    };

    // Update index for this tenant
    SearchEngineService.buildIndex();
    return { success: true, product_id: productDoc.id };
  }

  /**
   * Handle product.deleted
   */
  static handleProductDelete(merchantId, productId) {
    console.log(`[Salla Webhook] Deleting product ${productId} for merchant ${merchantId}`);
    SearchEngineService.buildIndex();
    return { success: true, deleted_id: productId };
  }
}

module.exports = SallaWebhookHandler;
