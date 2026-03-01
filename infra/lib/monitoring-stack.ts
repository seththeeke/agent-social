import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const region = this.region;

    // Reference existing resources from the main stack
    const agentsTable = dynamodb.Table.fromTableName(this, 'AgentsTable', 'agent-social-agents');
    const postsTable = dynamodb.Table.fromTableName(this, 'PostsTable', 'agent-social-posts');

    // Lambda function names
    const lambdaNames = {
      instigator: 'agent-social-agent-instigator',
      processor: 'agent-social-agent-processor',
      fanOut: 'agent-social-post-fan-out',
      apiFeed: 'agent-social-api-feed',
      apiAgents: 'agent-social-api-agents',
      apiThread: 'agent-social-api-thread',
      apiLinkPreview: 'agent-social-api-link-preview',
    };

    // Create CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'AgentSocialDashboard', {
      dashboardName: 'AgentSocial-Public-Dashboard',
    });

    // ── Row 1: High-level overview ──
    dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: '# 🤖 Agent Social - Live Metrics\n\nReal-time monitoring of the AI agent social network',
        width: 24,
        height: 2,
      })
    );

    // ── Row 2: API Performance ──
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: '📡 API Requests (All Endpoints)',
        width: 8,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            dimensionsMap: { FunctionName: lambdaNames.apiFeed },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Feed',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            dimensionsMap: { FunctionName: lambdaNames.apiAgents },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Agents',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            dimensionsMap: { FunctionName: lambdaNames.apiThread },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Threads',
          }),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: '⏱️ API Latency (p50 / p99)',
        width: 8,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            dimensionsMap: { FunctionName: lambdaNames.apiFeed },
            statistic: 'p50',
            period: cdk.Duration.minutes(5),
            label: 'Feed p50',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            dimensionsMap: { FunctionName: lambdaNames.apiFeed },
            statistic: 'p99',
            period: cdk.Duration.minutes(5),
            label: 'Feed p99',
          }),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: '❌ API Errors',
        width: 8,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            dimensionsMap: { FunctionName: lambdaNames.apiFeed },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Feed',
            color: '#d62728',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            dimensionsMap: { FunctionName: lambdaNames.apiAgents },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Agents',
            color: '#ff7f0e',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            dimensionsMap: { FunctionName: lambdaNames.apiThread },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Threads',
            color: '#9467bd',
          }),
        ],
      })
    );

    // ── Row 3: Agent Activity ──
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: '🚀 Agent Instigator (New Posts)',
        width: 8,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            dimensionsMap: { FunctionName: lambdaNames.instigator },
            statistic: 'Sum',
            period: cdk.Duration.hours(1),
            label: 'Invocations',
            color: '#2ca02c',
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            dimensionsMap: { FunctionName: lambdaNames.instigator },
            statistic: 'Average',
            period: cdk.Duration.hours(1),
            label: 'Duration (ms)',
            color: '#1f77b4',
          }),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: '💬 Agent Processor (Replies)',
        width: 8,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            dimensionsMap: { FunctionName: lambdaNames.processor },
            statistic: 'Sum',
            period: cdk.Duration.minutes(15),
            label: 'Invocations',
            color: '#9467bd',
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            dimensionsMap: { FunctionName: lambdaNames.processor },
            statistic: 'Sum',
            period: cdk.Duration.minutes(15),
            label: 'Errors',
            color: '#d62728',
          }),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: '📤 Post Fan-Out',
        width: 8,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            dimensionsMap: { FunctionName: lambdaNames.fanOut },
            statistic: 'Sum',
            period: cdk.Duration.minutes(15),
            label: 'Fan-outs',
            color: '#17becf',
          }),
        ],
      })
    );

    // ── Row 4: DynamoDB ──
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: '📊 DynamoDB Read/Write Capacity',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedReadCapacityUnits',
            dimensionsMap: { TableName: 'agent-social-posts' },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Posts Reads',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedWriteCapacityUnits',
            dimensionsMap: { TableName: 'agent-social-posts' },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Posts Writes',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedReadCapacityUnits',
            dimensionsMap: { TableName: 'agent-social-agents' },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Agents Reads',
          }),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: '⚡ DynamoDB Latency',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'SuccessfulRequestLatency',
            dimensionsMap: { TableName: 'agent-social-posts', Operation: 'Query' },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
            label: 'Posts Query',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'SuccessfulRequestLatency',
            dimensionsMap: { TableName: 'agent-social-posts', Operation: 'PutItem' },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
            label: 'Posts Write',
          }),
        ],
      })
    );

    // ── Row 5: SQS & SNS ──
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: '📬 SNS Messages Published',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/SNS',
            metricName: 'NumberOfMessagesPublished',
            dimensionsMap: { TopicName: 'agent-social-events' },
            statistic: 'Sum',
            period: cdk.Duration.minutes(15),
            label: 'Messages',
            color: '#ff7f0e',
          }),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: '☠️ Dead Letter Queue Depth',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/SQS',
            metricName: 'ApproximateNumberOfMessagesVisible',
            dimensionsMap: { QueueName: 'agent-social-dlq' },
            statistic: 'Maximum',
            period: cdk.Duration.minutes(5),
            label: 'DLQ Messages',
            color: '#d62728',
          }),
        ],
      })
    );

    // ── Row 6: CloudFront ──
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: '🌐 CloudFront Requests',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: 'Requests',
            dimensionsMap: { DistributionId: 'E3A3Y2H8QRYAXO', Region: 'Global' },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Requests',
            color: '#2ca02c',
          }),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: '📦 CloudFront Bytes Transferred',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: 'BytesDownloaded',
            dimensionsMap: { DistributionId: 'E3A3Y2H8QRYAXO', Region: 'Global' },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Bytes Downloaded',
            color: '#1f77b4',
          }),
        ],
      })
    );

    // Output the dashboard URL (console view, not embeddable without sharing)
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:name=AgentSocial-Public-Dashboard`,
      description: 'CloudWatch Dashboard URL (requires AWS Console login)',
    });

    new cdk.CfnOutput(this, 'DashboardName', {
      value: 'AgentSocial-Public-Dashboard',
      description: 'Dashboard name for sharing setup',
    });
  }
}
