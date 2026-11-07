import type { Request, Response } from "express";
import type {
  CreateReviewInput,
  ListTopicsQuery,
  UpdateTopicInput,
  TopicParams,
} from "./topics.schemas.ts";
import * as topicsService from "./topics.service.ts";

export async function listTopics(req: Request, res: Response) {
  const query = req.query as unknown as ListTopicsQuery;
  res.json({ topics: await topicsService.listTopics(req.userId!, query) });
}

export async function getTopic(req: Request<TopicParams>, res: Response) {
  res.json({ topic: await topicsService.getTopic(req.userId!, req.params.id) });
}

export async function updateTopic(
  req: Request<TopicParams, unknown, UpdateTopicInput>,
  res: Response,
) {
  const topic = await topicsService.updateTopic(
    req.userId!,
    req.params.id,
    req.body,
  );
  res.json({ topic });
}

export async function deleteTopic(req: Request<TopicParams>, res: Response) {
  await topicsService.deleteTopic(req.userId!, req.params.id);
  res.status(204).send();
}

export async function reviewTopic(
  req: Request<TopicParams, unknown, CreateReviewInput>,
  res: Response,
) {
  const result = await topicsService.reviewTopic(
    req.userId!,
    req.params.id,
    req.body,
  );
  res.status(201).json(result);
}
