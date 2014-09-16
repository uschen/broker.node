/**
 * Message Entity
 */
'use strict';
var Promise = require('bluebird');
/**
 * Base class for received messages.
 *
 * @param {[type]} options [description]
 * @param {Object} options.body [description]
 * @param {Channel} options.channel [description]
 * @param {Object} options.headers [description]
 * @param {Object} options.properties [description]
 * @param {String} options.deliveryTag [description]
 * @param {String} options.deliveryInfo [description]
 * @param {String} options.correlationId [description]
 * @param {String} options.replyTo [description]
 * @param {Number} options.expiration [description]
 */
var Message = function (options, rawMessage) {
  this.body = options.body;
  this.channel = options.channel;
  this.headers = options.headers;
  this.properties = options.properties;
  this.deliveryTag = options.deliveryTag;
  this.deliveryInfo = options.deliveryInfo;
  this.deliveryModel = options.deliveryModel;
  this.correlationId = options.correlationId;
  this.replyTo = options.replyTo;
  this.expiration = options.expiration;
  this.rawMessage = rawMessage || {
    fields: {
      deliveryTag: this.deliveryTag
    }
  };
  this._state = 'RECEIVED';
};

Message.fromRawMessage = function (message) {
  var properties = message.properties;
  var headers = message.headers;
  var deliveryTag = message.fields.deliveryTag;
  var deliveryModel = message.fields.deliveryModel;
  var correlationId = message.properties.correlationId;
  var replyTo = message.properties.replyTo;
  return new Message({
    body: message.content.toString(),
    properties: properties,
    headers: headers,
    deliveryTag: deliveryTag,
    deliveryModel: deliveryModel,
    correlationId: correlationId,
    replyTo: replyTo
  }, message);
};

Message.prototype.encode = function () {
  return new Buffer(JSON.stringify(this.body));
};

Message.prototype.getPublishOptions = function () {
  return {
    headers: this.headers,
    correlationId: this.correlationId,
    deliveryModel: this.deliveryModel,
    expiration: this.expiration,
    replyTo: this.replyTo
  };
};

Message.prototype.ACK_STATES = ['ACK', 'REJECTED', 'REQUEUED'];

/**
 * Acknowledge this message as being processed.,
 * This will remove the message from the queue.

 * @throws {MessageStateError} If the message has already been
 * @throws {MessageStateError} If acknowledged/requeued/rejected.
 *
 * @return {[type]} [description]
 */
Message.prototype.ack = function (channel) {
  this._state = 'ACK';
  return Promise.resolve(channel.ack(this.rawMessage));
};

/**
 * Reject this message.
 *
 * The message will be discarded by the server.
 *
 * @throws {MessageStateError} If the message has already been
 *                             acknowledged/requeued/rejected.
 * @param  {[type]} options [description]
 * @param  {Boolean} options.requeue [description]
 * @return {[type]}         [description]
 */
Message.prototype.reject = function (channel, options) {
  options = options || {};
  var requeue = options.requeue;
  this._state = 'REJECTED';
  return Promise.resolve(channel.reject(this.rawMessage, requeue));
};

/**
 * Reject this message and put it back on the queue.
 *
 * You must not use this method as a means of selecting messages to process.
 *
 * @throws {MessageStateError} If the message has already been
 *                             acknowledged/requeued/rejected.
 * @return {[type]} [description]
 */
Message.prototype.requeue = function (channel) {
  if (this.isAcknowledged()) {
    return Promise.reject(new Error('Message already acknowledged with state'));
  }
  this._state = 'REQUEUED';
  var requeue = true;
  return Promise.resolve(channel.reject(this.rawMessage, requeue));
};

/**
 * Set to true if the message has been acknowledged.
 *
 * @return {Boolean} [description]
 */
Message.prototype.isAcknowledged = function () {
  return this.ACK_STATES.indexOf(this._state) !== -1;
};

/**
 * The decoded message body.
 *
 * @return {[type]} [description]
 */
Message.prototype.getPayload = Promise.method(function () {
  return JSON.parse(this.body);
});

module.exports = Message;