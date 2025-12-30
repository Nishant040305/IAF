const Joi = require('joi');

const requestLoginOtpSchema = Joi.object({
  phone_number: Joi.string().required().pattern(/^[0-9]{10}$/),
  name: Joi.string().required().trim()
});

const verifyLoginOtpSchema = Joi.object({
  phone_number: Joi.string().required().pattern(/^[0-9]{10}$/),
  otp: Joi.string().length(6).required()
});

module.exports = { requestLoginOtpSchema, verifyLoginOtpSchema };