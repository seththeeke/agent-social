import * as path from 'path';
import * as fs from 'fs';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  DynamoEventSource,
  SqsEventSource,
} from 'aws-cdk-lib/aws-lambda-event-sources';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Duration } from 'aws-cdk-lib';
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

    const defaultBedrockModelId = 'amazon.nova-micro-v1:0';

    const agentProcessorLambda = new lambdaNodejs.NodejsFunction(
      this,
      'AgentProcessorLambda',
      {
        functionName: 'agent-social-agent-processor',
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handler',
        entry: path.join(
          backendPath,
          'lambdas',
          'agent-processor',
          'index.ts'
        ),
        projectRoot: backendPath,
        depsLockFilePath: path.join(backendPath, 'package-lock.json'),
        timeout: Duration.seconds(60),
        environment: {
          AGENTS_TABLE_NAME: agentsTable.tableName,
          POSTS_TABLE_NAME: postsTable.tableName,
          BEDROCK_MODEL_ID: defaultBedrockModelId,
          MAX_THREAD_DEPTH: '3',
        },
      }
    );

    agentsTable.grantReadData(agentProcessorLambda);
    postsTable.grantReadData(agentProcessorLambda);
    postsTable.grantWriteData(agentProcessorLambda);
    agentProcessorLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/${defaultBedrockModelId}`,
        ],
      })
    );

    for (const { queue } of agentQueues) {
      agentProcessorLambda.addEventSource(
        new SqsEventSource(queue, { batchSize: 1 })
      );
      queue.grantConsumeMessages(agentProcessorLambda);
    }

    const agentInstigatorLambda = new lambdaNodejs.NodejsFunction(
      this,
      'AgentInstigatorLambda',
      {
        functionName: 'agent-social-agent-instigator',
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handler',
        entry: path.join(
          backendPath,
          'lambdas',
          'agent-instigator',
          'index.ts'
        ),
        projectRoot: backendPath,
        depsLockFilePath: path.join(backendPath, 'package-lock.json'),
        timeout: Duration.minutes(2),
        environment: {
          AGENTS_TABLE_NAME: agentsTable.tableName,
          POSTS_TABLE_NAME: postsTable.tableName,
          BEDROCK_MODEL_ID: defaultBedrockModelId,
        },
      }
    );

    agentsTable.grantReadData(agentInstigatorLambda);
    postsTable.grantWriteData(agentInstigatorLambda);
    agentInstigatorLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/${defaultBedrockModelId}`,
        ],
      })
    );

    // ── 4. IAM ───────────────────────────────────────────────────
    // (scoped per Lambda above)

    // ── 5. Scheduling ────────────────────────────────────────────
    new events.Rule(this, 'InstigatorScheduleRule', {
      ruleName: 'agent-social-instigator-schedule',
      schedule: events.Schedule.rate(Duration.days(1)),
      targets: [new targets.LambdaFunction(agentInstigatorLambda)],
    });

    // ── 6. Alarms ────────────────────────────────────────────────
    const alertEmail = 'seththeeke@gmail.com';

    // AWS Budget — hard cap alert at $10/month
    new budgets.CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: 10, unit: 'USD' },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 80,
          },
          subscribers: [{ subscriptionType: 'EMAIL', address: alertEmail }],
        },
        {
          notification: {
            notificationType: 'FORECASTED',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,
          },
          subscribers: [{ subscriptionType: 'EMAIL', address: alertEmail }],
        },
      ],
    });

    // Lambda invocation rate alarm — catches runaway loops
    new cloudwatch.Alarm(this, 'LambdaInvocationAlarm', {
      alarmName: 'agent-social-processor-high-invocations',
      metric: agentProcessorLambda.metricInvocations({ period: Duration.minutes(5) }),
      threshold: 500,
      evaluationPeriods: 1,
      alarmDescription: 'Agent processor invocations unusually high — possible loop',
    });

    // DLQ depth alarm — catches failed processing
    new cloudwatch.Alarm(this, 'DLQDepthAlarm', {
      alarmName: 'agent-social-dlq-depth',
      metric: dlq.metricApproximateNumberOfMessagesVisible(),
      threshold: 10,
      evaluationPeriods: 1,
      alarmDescription: 'Messages accumulating in DLQ',
    });

    // Bedrock/Lambda error alarm
    new cloudwatch.Alarm(this, 'ProcessorErrorAlarm', {
      alarmName: 'agent-social-processor-errors',
      metric: agentProcessorLambda.metricErrors({ period: Duration.minutes(5) }),
      threshold: 20,
      evaluationPeriods: 2,
      alarmDescription: 'Agent processor errors elevated — possible Bedrock issue',
    });

    // ── 7. API Gateway ───────────────────────────────────────────────

    const api = new apigateway.RestApi(this, 'AgentSocialApi', {
      restApiName: 'agent-social-api',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'OPTIONS'],
        allowHeaders: ['Content-Type'],
      },
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 50,
        throttlingBurstLimit: 100,
      },
    });

    // /feed
    const feedLambda = new lambdaNodejs.NodejsFunction(this, 'ApiFeedLambda', {
      functionName: 'agent-social-api-feed',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(backendPath, 'lambdas', 'api-feed', 'index.ts'),
      projectRoot: backendPath,
      depsLockFilePath: path.join(backendPath, 'package-lock.json'),
      timeout: Duration.seconds(10),
      environment: {
        POSTS_TABLE_NAME: postsTable.tableName,
        AGENTS_TABLE_NAME: agentsTable.tableName,
      },
    });
    postsTable.grantReadData(feedLambda);
    agentsTable.grantReadData(feedLambda);
    api.root.addResource('feed').addMethod('GET', new apigateway.LambdaIntegration(feedLambda));

    // /agents and /agents/{agentId}
    const agentsLambda = new lambdaNodejs.NodejsFunction(this, 'ApiAgentsLambda', {
      functionName: 'agent-social-api-agents',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(backendPath, 'lambdas', 'api-agents', 'index.ts'),
      projectRoot: backendPath,
      depsLockFilePath: path.join(backendPath, 'package-lock.json'),
      timeout: Duration.seconds(10),
      environment: {
        AGENTS_TABLE_NAME: agentsTable.tableName,
      },
    });
    agentsTable.grantReadData(agentsLambda);
    const agentsResource = api.root.addResource('agents');
    agentsResource.addMethod('GET', new apigateway.LambdaIntegration(agentsLambda));
    const agentByIdResource = agentsResource.addResource('{agentId}');
    agentByIdResource.addMethod('GET', new apigateway.LambdaIntegration(agentsLambda));

    // /agents/{agentId}/posts
    const agentPostsLambda = new lambdaNodejs.NodejsFunction(this, 'ApiAgentPostsLambda', {
      functionName: 'agent-social-api-agent-posts',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(backendPath, 'lambdas', 'api-agent-posts', 'index.ts'),
      projectRoot: backendPath,
      depsLockFilePath: path.join(backendPath, 'package-lock.json'),
      timeout: Duration.seconds(10),
      environment: {
        POSTS_TABLE_NAME: postsTable.tableName,
      },
    });
    postsTable.grantReadData(agentPostsLambda);
    agentByIdResource.addResource('posts').addMethod('GET', new apigateway.LambdaIntegration(agentPostsLambda));

    // /threads/{rootPostId}
    const threadLambda = new lambdaNodejs.NodejsFunction(this, 'ApiThreadLambda', {
      functionName: 'agent-social-api-thread',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(backendPath, 'lambdas', 'api-thread', 'index.ts'),
      projectRoot: backendPath,
      depsLockFilePath: path.join(backendPath, 'package-lock.json'),
      timeout: Duration.seconds(10),
      environment: {
        POSTS_TABLE_NAME: postsTable.tableName,
        AGENTS_TABLE_NAME: agentsTable.tableName,
      },
    });
    postsTable.grantReadData(threadLambda);
    agentsTable.grantReadData(threadLambda);
    api.root.addResource('threads').addResource('{rootPostId}').addMethod('GET', new apigateway.LambdaIntegration(threadLambda));

    // /link-preview — fetches Open Graph metadata for URLs
    const linkPreviewLambda = new lambdaNodejs.NodejsFunction(this, 'ApiLinkPreviewLambda', {
      functionName: 'agent-social-api-link-preview',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(backendPath, 'lambdas', 'api-link-preview', 'index.ts'),
      projectRoot: backendPath,
      depsLockFilePath: path.join(backendPath, 'package-lock.json'),
      timeout: Duration.seconds(10),
    });
    api.root.addResource('link-preview').addMethod('GET', new apigateway.LambdaIntegration(linkPreviewLambda));

    // ── 8. Frontend Hosting (S3 + CloudFront) ─────────────────────────

    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `agent-social-website-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5),
        },
      ],
    });

    // Deploy frontend build to S3 (only if dist folder exists)
    const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
    if (fs.existsSync(frontendDistPath)) {
      new s3deploy.BucketDeployment(this, 'DeployWebsite', {
        sources: [s3deploy.Source.asset(frontendDistPath)],
        destinationBucket: websiteBucket,
        distribution,
        distributionPaths: ['/*'],
      });
    }

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
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: 'AgentSocial-ApiUrl',
    });
    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 bucket for frontend assets',
      exportName: 'AgentSocial-WebsiteBucketName',
    });
    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL',
      exportName: 'AgentSocial-CloudFrontUrl',
    });
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID (for cache invalidation)',
      exportName: 'AgentSocial-CloudFrontDistributionId',
    });
  }
}
