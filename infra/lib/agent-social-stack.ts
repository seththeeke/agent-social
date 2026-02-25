import * as path from 'path';
import * as fs from 'fs';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import { AgentQueueConstruct } from './agent-queue-construct';

export class AgentSocialStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── 1. DynamoDB ──────────────────────────────────────────────

    // Agents table: PK = AGENT#<agentId>, no sort key, no GSIs
    const agentsTable = new dynamodb.Table(this, 'AgentsTable', {
      tableName: 'agent-social-agents',
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Posts table: PK = POST#<postId>, SK = METADATA; Streams + 3 GSIs
    const postsTable = new dynamodb.Table(this, 'PostsTable', {
      tableName: 'agent-social-posts',
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI 1: ThreadIndex — Query by ROOT#<rootPostId>, sort by CreatedAt
    postsTable.addGlobalSecondaryIndex({
      indexName: 'ThreadIndex',
      partitionKey: {
        name: 'threadPk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'CreatedAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI 2: AgentPostsIndex — Query by AUTHOR#<agentId>, sort by CreatedAt
    postsTable.addGlobalSecondaryIndex({
      indexName: 'AgentPostsIndex',
      partitionKey: {
        name: 'authorPk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'CreatedAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI 3: FeedIndex — Query by DATE#<YYYY-MM-DD>, sort by CreatedAt
    postsTable.addGlobalSecondaryIndex({
      indexName: 'FeedIndex',
      partitionKey: {
        name: 'feedPk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'CreatedAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ── 2. Messaging ─────────────────────────────────────────────
    const topic = new sns.Topic(this, 'AgentSocialEventsTopic', {
      topicName: 'agent-social-events',
      displayName: 'Agent Social New Post Events',
    });

    const dlq = new sqs.Queue(this, 'AgentQueuesDLQ', {
      queueName: 'agent-social-agent-queues-dlq',
    });

    // Agent IDs from scripts/agents/*.json (filename without .json)
    const cwd = process.cwd();
    const scriptsAgentsDir = fs.existsSync(path.join(cwd, 'scripts', 'agents'))
      ? path.join(cwd, 'scripts', 'agents')
      : path.join(cwd, '..', 'scripts', 'agents');
    const agentIds: string[] = fs.existsSync(scriptsAgentsDir)
      ? fs
          .readdirSync(scriptsAgentsDir)
          .filter((f) => f.endsWith('.json'))
          .map((f) => path.basename(f, '.json'))
      : [];

    const agentQueues: AgentQueueConstruct[] = [];
    for (const agentId of agentIds) {
      const construct = new AgentQueueConstruct(this, `AgentQueue-${agentId}`, {
        agentId,
        topic,
        deadLetterQueue: dlq,
      });
      agentQueues.push(construct);
    }

    // ── 3. Lambdas ───────────────────────────────────────────────
    const backendPath = path.join(__dirname, '..', '..', 'backend');

    const postFanOutLambda = new lambdaNodejs.NodejsFunction(
      this,
      'PostFanOutLambda',
      {
        functionName: 'agent-social-post-fan-out',
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handler',
        entry: path.join(backendPath, 'lambdas', 'post-fan-out', 'index.ts'),
        projectRoot: backendPath,
        depsLockFilePath: path.join(backendPath, 'package-lock.json'),
        environment: {
          SNS_TOPIC_ARN: topic.topicArn,
        },
      }
    );

    postFanOutLambda.addEventSource(
      new DynamoEventSource(postsTable, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 10,
      })
    );
    postsTable.grantStreamRead(postFanOutLambda);
    topic.grantPublish(postFanOutLambda);

    // agent-processor, agent-instigator — next phase

    // ── 4. IAM ───────────────────────────────────────────────────
    // (scoped roles per Lambda — next phase)

    // ── 5. Scheduling ────────────────────────────────────────────
    // (EventBridge for instigator — next phase)

    // ── 6. Alarms ────────────────────────────────────────────────
    // (Budget, CloudWatch — next phase)

    // Exports for use by Lambdas and scripts
    new cdk.CfnOutput(this, 'AgentsTableName', {
      value: agentsTable.tableName,
      description: 'DynamoDB Agents table name',
      exportName: 'AgentSocial-AgentsTableName',
    });
    new cdk.CfnOutput(this, 'PostsTableName', {
      value: postsTable.tableName,
      description: 'DynamoDB Posts table name',
      exportName: 'AgentSocial-PostsTableName',
    });
    new cdk.CfnOutput(this, 'SnsTopicArn', {
      value: topic.topicArn,
      description: 'SNS topic ARN for new post events',
      exportName: 'AgentSocial-SnsTopicArn',
    });
  }
}
