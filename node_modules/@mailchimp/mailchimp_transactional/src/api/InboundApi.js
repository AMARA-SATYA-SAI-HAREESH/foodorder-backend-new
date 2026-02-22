var ApiClient = require('../ApiClient');

module.exports = function (apiClient) {
  this.apiClient = apiClient || ApiClient.instance();

  /**
   * Add inbound domain
   * Add an inbound domain to your account.
   */
  this.addDomain = function (body) {
    return this.apiClient.post('/inbound/add-domain', body);
  };

  /**
   * Add route
   * Add a new route to an inbound domain or SMS program. Provide either domain or phone (not both).
   */
  this.addRoute = function (body) {
    return this.apiClient.post('/inbound/add-route', body);
  };

  /**
   * Check domain settings
   * Check the MX settings for an inbound domain. The domain must have already been added with the add-domain call.
   */
  this.checkDomain = function (body) {
    return this.apiClient.post('/inbound/check-domain', body);
  };

  /**
   * Delete inbound domain
   * Delete an inbound domain from the account. All mail will stop routing for this domain immediately.
   */
  this.deleteDomain = function (body) {
    return this.apiClient.post('/inbound/delete-domain', body);
  };

  /**
   * Delete mailbox route
   * Delete an existing inbound mailbox route.
   */
  this.deleteRoute = function (body) {
    return this.apiClient.post('/inbound/delete-route', body);
  };

  /**
   * List inbound domains
   * List the domains that have been configured for inbound delivery.
   */
  this.domains = function (body) {
    return this.apiClient.post('/inbound/domains', body);
  };

  /**
   * List routes
   * List the routes defined for an inbound domain or SMS program. Provide either domain or phone (not both).
   */
  this.routes = function (body) {
    return this.apiClient.post('/inbound/routes', body);
  };

  /**
   * Send mime document
   * Take a raw MIME document destined for a domain with inbound domains set up, and send it to the inbound hook exactly as if it had been sent over SMTP.
   */
  this.sendRaw = function (body) {
    return this.apiClient.post('/inbound/send-raw', body);
  };

  /**
   * Update mailbox route
   * Update the pattern or webhook of an existing inbound mailbox route. If null is provided for any fields, the values will remain unchanged.
   */
  this.updateRoute = function (body) {
    return this.apiClient.post('/inbound/update-route', body);
  };

};
