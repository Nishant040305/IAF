const Joi = require('joi');

const signupSchema = Joi.object({
  name: Joi.string().required().trim(),
  officer_id: Joi.string().required().trim(),
  phone_number: Joi.string().required().pattern(/^[0-9]{10}$/),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  phone_number: Joi.string().required().pattern(/^[0-9]{10}$/),
  password: Joi.string().required()
});

const requestOtpSchema = Joi.object({
  phone_number: Joi.string().required().pattern(/^[0-9]{10}$/),
  name: Joi.string().trim(),
  officer_id: Joi.string().trim()
});

const verifyOtpSchema = Joi.object({
  phone_number: Joi.string().required().pattern(/^[0-9]{10}$/),
  otp: Joi.string().length(6).required()
});

module.exports = { signupSchema, loginSchema, requestOtpSchema, verifyOtpSchema };