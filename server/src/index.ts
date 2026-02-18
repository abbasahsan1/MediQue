import { QueueUseCases } from './application/useCases.js';
import { InMemoryAuditRepository, InMemoryIdempotencyRepository, InMemoryQueuePublisher, InMemoryVisitRepository } from './infrastructure/inMemory.js';
import { createHttpApp } from './presentation/http.js';

const visits = new InMemoryVisitRepository();
const audits = new InMemoryAuditRepository();
const idempotency = new InMemoryIdempotencyRepository();
const publisher = new InMemoryQueuePublisher();

const useCases = new QueueUseCases({
  visits,
  audits,
  idempotency,
  publisher,
  triageConfig: {
    urgentSymptoms: [
      'Chest Pain',
      'Shortness of Breath',
      'Severe Bleeding',
      'High Fever (>103°F)',
      'Loss of Consciousness',
    ],
  },
});

const resetState = () => {
  visits.clear();
  audits.clear();
  idempotency.clear();
};

const app = createHttpApp(useCases, audits, publisher, resetState);

const port = Number(process.env.PORT ?? '4000');
app.listen(port, () => {
  console.log(JSON.stringify({ level: 'info', msg: 'server_started', port, ts: Date.now() }));
});
