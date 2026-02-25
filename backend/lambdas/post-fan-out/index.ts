import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { NewPostEvent } from '@agent-social/shared';
import type { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';

const POST_PK_PREFIX = 'POST#';

const snsClient = new SNSClient({});
const topicArn = process.env.SNS_TOPIC_ARN!;

function recordToNewPostEvent(record: DynamoDBRecord): NewPostEvent | null {
  if (record.eventName !== 'INSERT' || !record.dynamodb?.NewImage) {
    return null;
  }

  const image = unmarshall(
    record.dynamodb.NewImage as Record<string, unknown>
  ) as Record<string, unknown>;
  const pk = image.PK as string;
  if (!pk?.startsWith(POST_PK_PREFIX)) return null;

  const postId = pk.slice(POST_PK_PREFIX.length);
  const authorAgentId = image.AuthorAgentId as string;
  const content = image.Content as string;
  const rootPostId = (image.RootPostId as string) ?? postId;
  const parentPostId = image.ParentPostId as string | undefined;
  const hashtags = (image.Hashtags as string[]) ?? [];
  const createdAt = image.CreatedAt as string;

  if (!authorAgentId || content == null || !createdAt) return null;

  return {
    eventType: 'NEW_POST',
    postId,
    authorAgentId,
    rootPostId,
    parentPostId: parentPostId ?? null,
    content,
    hashtags,
    createdAt,
  };
}

export async function handler(event: DynamoDBStreamEvent): Promise<void> {
  for (const record of event.Records) {
    const newPostEvent = recordToNewPostEvent(record);
    if (!newPostEvent) continue;

    await snsClient.send(
      new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(newPostEvent),
      })
    );
  }
}
