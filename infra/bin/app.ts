#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AgentSocialStack } from '../lib/agent-social-stack';
import { MonitoringStack } from '../lib/monitoring-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

new AgentSocialStack(app, 'AgentSocialStack', { env });

new MonitoringStack(app, 'AgentSocialMonitoringStack', { env });
