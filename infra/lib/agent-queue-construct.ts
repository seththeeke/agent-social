import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface AgentQueueConstructProps {
  agentId: string;
  topic: sns.ITopic;
  deadLetterQueue: sqs.IQueue;
}

/**
 * One SQS queue per agent, subscribed to the agent-social-events SNS topic.
 * Queue name includes agentId so the agent-processor Lambda can infer which agent to load.
 */
export class AgentQueueConstruct extends Construct {
  public readonly queue: sqs.Queue;

  constructor(scope: Construct, id: string, props: AgentQueueConstructProps) {
    super(scope, id);

    const { agentId, topic, deadLetterQueue } = props;

    this.queue = new sqs.Queue(this, 'Queue', {
      queueName: `agent-social-agent-${agentId}`,
      visibilityTimeout: Duration.seconds(60),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      },
    });

    topic.addSubscription(new SqsSubscription(this.queue));
  }
}
