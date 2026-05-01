import { Page, Route } from '@playwright/test';

const analysisResponse = JSON.stringify({
  role: 'Launch Strategist',
  task: 'Plan a product launch campaign',
  context: 'Startup launch prep',
  format: 'Markdown bullets',
  constraints: 'Include a timeline and KPIs',
  scores: {
    clarity: 82,
    context: 78,
    constraints: 84,
    tone: 80,
    overall: 81,
    feedback: 'Solid structure with clear outcomes.',
  },
  questions: ['Who is the audience?', 'What is the budget?', 'Which channels matter most?'],
});

const variationsResponse = JSON.stringify([
  {
    id: '0',
    type: 'precisionist',
    title: 'Precise Launch Plan',
    description: 'Tight execution with milestones',
    content: 'Create a markdown launch plan for [PRODUCT] with milestones, KPIs, and owners.',
  },
  {
    id: '1',
    type: 'creative',
    title: 'Creative Launch Narrative',
    description: 'Story-led campaign direction',
    content: 'Design a campaign story arc for [PRODUCT] with launch beats and channel ideas.',
  },
  {
    id: '2',
    type: 'mastermind',
    title: 'Executive Launch Brief',
    description: 'Risk-aware strategic plan',
    content: 'Produce an executive brief for [PRODUCT] covering timeline, risks, and success metrics.',
  },
]);

async function fulfillChat(route: Route) {
  const body = route.request().postDataJSON() as {
    messages?: Array<{ content?: string }>;
  };
  const prompt = body.messages?.[0]?.content ?? '';

  let content = 'Mocked Ollama response';

  if (prompt.includes('Analyze this prompt and provide JSON')) {
    content = analysisResponse;
  } else if (prompt.includes('Generate 3 prompt variations. Return JSON array')) {
    content = variationsResponse;
  } else if (prompt.includes('Compress this prompt to minimum length')) {
    content = 'Write concise markdown for [TOPIC] with citations.';
  } else if (prompt.includes('Judge which prompt performed better')) {
    content = JSON.stringify({
      winner: 'A',
      reasoning: 'Prompt A follows the requested output format more closely.',
    });
  } else if (prompt.includes('Integrate these user answers into the prompt')) {
    content = analysisResponse;
  }

  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      message: {
        content,
      },
    }),
  });
}

export async function mockOllama(page: Page) {
  await page.route('http://localhost:11434/api/tags', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        models: [
          { name: 'deepseek-r1:7b' },
          { name: 'tinyllama:latest' },
        ],
      }),
    });
  });

  await page.route('http://localhost:11434/api/chat', fulfillChat);
}
