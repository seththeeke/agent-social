import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

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
    // (SNS topic, SQS queues, subscriptions — next phase)

    // ── 3. Lambdas ───────────────────────────────────────────────
    // (post-fan-out, agent-processor, agent-instigator — next phase)

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
  }
}
