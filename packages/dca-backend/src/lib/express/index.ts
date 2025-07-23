import cors from 'cors';
import express, { Express } from 'express';

import { expressAuthHelpers } from '@lit-protocol/vincent-sdk';

import { handleListPurchasesRoute } from './purchases';
import {
  handleListSchedulesRoute,
  handleEnableScheduleRoute,
  handleDisableScheduleRoute,
  handleCreateScheduleRoute,
  handleDeleteScheduleRoute,
  handleEditScheduleRoute,
} from './schedules';
import {
  handleAgentStatusRoute,
  handlePerformanceMetricsRoute,
  handleVincentPolicyStatusRoute,
  handleRecentTradesRoute,
  handleMarketDataRoute
} from './dashboard';
import { env } from '../env';
import { serviceLogger } from '../logger';

const { ALLOWED_AUDIENCE, CORS_ALLOWED_DOMAIN, IS_DEVELOPMENT } = env;

const { authenticatedRequestHandler, getAuthenticateUserExpressHandler } = expressAuthHelpers;

const authenticateUserMiddleware = getAuthenticateUserExpressHandler(ALLOWED_AUDIENCE);

const corsConfig = {
  optionsSuccessStatus: 204,
  origin: IS_DEVELOPMENT ? true : [CORS_ALLOWED_DOMAIN],
};

export const registerRoutes = (app: Express) => {
  app.use(express.json());

  if (IS_DEVELOPMENT) {
    serviceLogger.info(`CORS is disabled for development`);
  } else {
    serviceLogger.info(`Configuring CORS with allowed domain: ${CORS_ALLOWED_DOMAIN}`);
  }
  app.use(cors(corsConfig));

  app.get(
    '/purchases',
    authenticateUserMiddleware,
    authenticatedRequestHandler(handleListPurchasesRoute)
  );
  app.get(
    '/schedules',
    authenticateUserMiddleware,
    authenticatedRequestHandler(handleListSchedulesRoute)
  );
  app.post(
    '/schedule',
    authenticateUserMiddleware,
    authenticatedRequestHandler(handleCreateScheduleRoute)
  );
  app.put(
    '/schedules/:scheduleId',
    authenticateUserMiddleware,
    authenticatedRequestHandler(handleEditScheduleRoute)
  );
  app.put(
    '/schedules/:scheduleId/enable',
    authenticateUserMiddleware,
    authenticatedRequestHandler(handleEnableScheduleRoute)
  );
  app.put(
    '/schedules/:scheduleId/disable',
    authenticateUserMiddleware,
    authenticatedRequestHandler(handleDisableScheduleRoute)
  );
  app.delete(
    '/schedules/:scheduleId',
    authenticateUserMiddleware,
    authenticatedRequestHandler(handleDeleteScheduleRoute)
  );

  // Dashboard API routes - public for demo purposes
  app.get('/api/dashboard/agents', handleAgentStatusRoute);
  app.get('/api/dashboard/performance', handlePerformanceMetricsRoute);
  app.get('/api/dashboard/vincent-policy', handleVincentPolicyStatusRoute);
  app.get('/api/dashboard/trades', handleRecentTradesRoute);
  app.get('/api/dashboard/market-data', handleMarketDataRoute);

  serviceLogger.info(`Routes registered including dashboard API`);
};
