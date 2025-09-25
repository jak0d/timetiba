import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiResponse } from '../types/api';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false, 
      stripUnknown: true 
    });

    if (error) {
      const response: ApiResponse = {
        success: false,
        message: 'Validation failed',
        errors: error.details.map(detail => detail.message),
        timestamp: new Date()
      };
      
      res.status(400).json(response);
      return;
    }

    // Replace request body with validated and sanitized data
    req.body = value;
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, { 
      abortEarly: false, 
      stripUnknown: true 
    });

    if (error) {
      const response: ApiResponse = {
        success: false,
        message: 'Query validation failed',
        errors: error.details.map(detail => detail.message),
        timestamp: new Date()
      };
      
      res.status(400).json(response);
      return;
    }

    // Replace request query with validated and sanitized data
    req.query = value;
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, { 
      abortEarly: false, 
      stripUnknown: true 
    });

    if (error) {
      const response: ApiResponse = {
        success: false,
        message: 'Parameter validation failed',
        errors: error.details.map(detail => detail.message),
        timestamp: new Date()
      };
      
      res.status(400).json(response);
      return;
    }

    // Replace request params with validated and sanitized data
    req.params = value;
    next();
  };
};