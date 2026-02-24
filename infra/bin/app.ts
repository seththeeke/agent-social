#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AgentSocialStack } from '../lib/agent-social-stack';

const app = new cdk.App();
new AgentSocialStack(app, 'AgentSocialStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
