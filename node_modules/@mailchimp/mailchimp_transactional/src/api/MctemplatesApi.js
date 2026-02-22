var ApiClient = require('../ApiClient');

module.exports = function (apiClient) {
  this.apiClient = apiClient || ApiClient.instance();

  /**
   * Get Mailchimp Template info
   * Get information about a Mailchimp Transactional template in your account.
   */
  this.mcTemplatesInfo = function (body) {
    return this.apiClient.post('/mctemplates/info', body);
  };

  /**
   * List Mailchimp Transactional Templates
   * Return a list of all Mailchimp Transactional templates available to this user.
   */
  this.mcTemplatesList = function (body) {
    return this.apiClient.post('/mctemplates/list', body);
  };

  /**
   * Render Mailchimp Transactional Template
   * Render a Mailchimp Transactional template with optional merge variables.
   */
  this.mcTemplatesRender = function (body) {
    return this.apiClient.post('/mctemplates/render', body);
  };

  /**
   * Get Mailchimp Transactional Template Time Series
   * Return the recent history (hourly stats for the last 30 days) for a Mailchimp Transactional template. Returns an empty array if the template exists but has never been used to send messages.
   */
  this.mcTemplatesTimeSeries = function (body) {
    return this.apiClient.post('/mctemplates/time-series', body);
  };

};
