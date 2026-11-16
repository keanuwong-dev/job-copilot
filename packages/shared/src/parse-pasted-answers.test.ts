import { describe, expect, it } from 'vitest';
import { answerCategory } from './answer-categories';
import { parsePastedAnswers } from './parse-pasted-answers';

const SAMPLE = `Why are you interested in this company?
I want my first full-time role at a tech company where the product is the business, not a side tool. COMPANY is the kind of SaaS team I want to join: a real user, a real workflow, and room for a new grad to ship. My closest match is Arden, where I scoped an AI knowledge tool for a lean startup instead of trying to build everything.

Why do you want to work at a startup?
Startups force a small team to pick the few things that matter. At Arden I built one searchable workspace for docs, product updates, and customer feedback, and I left out features that did not help engineering, sales, or operations. At Keeshee I worked from product concept through production and the storefront. I like that range, and I want it full time after I graduate in May 2027.

Why are you interested in tech, AI, or SaaS?
SaaS is where I can see a user’s workflow and change it in software. AI is useful when it sits on top of that workflow. Arden did that: Claude plus the team’s Google Drive, so people could ask questions of their own docs. I study economics, so I also care whether the product changes a decision, not just whether the demo looks good.

Where do you see yourself in five years?
In five years I want to be a strong individual contributor who can own a problem from question to ship: talk to users, look at the data, and build the change. I am starting as a new grad in 2027. The first years should be about learning a product deeply and getting good at one of product, data, or software, then growing from there.

Why should we hire you?
I can write, quantify, and ship. Economics trained me to ask what decision a number supports. Arden, Keeshee, and my portfolio are software I designed and built. Project Sentinel trained me to record what actually happened, without spinning it. I graduate in May 2027 and I am ready to start in June.

Anything else you want us to know?
I graduate from Santa Clara University in May 2027 and I am available to start in June 2027. The work I want is product, data, or software at a tech company. The most relevant builds are Arden, an AI knowledge tool for a startup, and Keeshee, a brand and store I co-built from scratch.

By role
Why do you want to be a product analyst?
Product analysts sit between the user and the metric. That is the work I want. I study economics, so I am used to asking what a number means for a decision. At Arden I turned messy startup knowledge into something the team could query. At Project Sentinel I wrote reports that had to stay factual. I want to do that for a product: define the question, pull the data, and tell the team what to do next.

Why do you want to be a data analyst?
I like starting from a question a team actually has, then getting to an answer they can use. Economics gave me the habit of being careful about what a result does and does not say. Arden was the applied version: search and Q&A over a startup’s docs, updates, and customer feedback. I am comfortable in SQL and Python, and I want a new grad analyst seat where the work changes a roadmap or an operation.

Why do you want to be a data scientist?
I want to build models and analyses that a product team will trust. My economics degree is the statistics and decision side. The build side is Python, SQL, and Arden, where I used Claude as an agent over real company documents instead of a demo dataset. I am a new grad, so I am looking for a team that will teach me production modeling while I contribute on analysis, evaluation, and clear writeups.`;

describe('parsePastedAnswers', () => {
  it('splits a pasted list into questions and the paragraph under each one', () => {
    const pairs = parsePastedAnswers(SAMPLE);

    expect(pairs.map((pair) => pair.question)).toEqual([
      'Why are you interested in this company?',
      'Why do you want to work at a startup?',
      'Why are you interested in tech, AI, or SaaS?',
      'Where do you see yourself in five years?',
      'Why should we hire you?',
      'Anything else you want us to know?',
      'Why do you want to be a product analyst?',
      'Why do you want to be a data analyst?',
      'Why do you want to be a data scientist?',
    ]);
    expect(pairs[0]?.answer.startsWith('I want my first full-time role')).toBe(true);
    expect(pairs[6]?.answer.startsWith('Product analysts sit between the user and the metric.')).toBe(
      true,
    );
    expect(pairs.some((pair) => pair.answer.includes('By role'))).toBe(false);
    expect(pairs.map((pair) => answerCategory(pair.question))).toEqual([
      'Why you',
      'Why you',
      'Why you',
      'Why you',
      'Why you',
      'Why you',
      'By role',
      'By role',
      'By role',
    ]);
  });

  it('keeps a second paragraph with the same answer', () => {
    const pairs = parsePastedAnswers(`Why this team?\nFirst paragraph.\n\nSecond paragraph.\n`);
    expect(pairs).toEqual([
      { question: 'Why this team?', answer: 'First paragraph.\n\nSecond paragraph.' },
    ]);
  });

  it('reads prompts that do not end with a question mark', () => {
    const pairs = parsePastedAnswers(`Describe your ideal team
I like a small team that writes decisions down and ships one change at a time.

Tell me about a project you are proud of.
Arden is the project I am proud of. I scoped a search tool over the startup's own docs.

By role
What is your greatest strength
I can write, quantify, and ship.`);

    expect(pairs.map((pair) => pair.question)).toEqual([
      'Describe your ideal team',
      'Tell me about a project you are proud of.',
      'What is your greatest strength',
    ]);
    expect(pairs[0]?.answer.startsWith('I like a small team')).toBe(true);
    expect(pairs.some((pair) => pair.answer.includes('By role'))).toBe(false);
    expect(pairs.map((pair) => answerCategory(pair.question))).toEqual([
      'Behavior',
      'Projects',
      'Behavior',
    ]);
  });

  it('keeps answer sentences that are not prompts', () => {
    const pairs = parsePastedAnswers(`Why this team?
I am ready to start in June.
Describe your ideal team
I like a small team that writes decisions down.

How we shipped it mattered more than the demo.
Tell them what happened, without spinning it.`);

    expect(pairs.map((pair) => pair.question)).toEqual([
      'Why this team?',
      'Describe your ideal team',
    ]);
    expect(pairs[0]?.answer).toBe('I am ready to start in June.');
    expect(pairs[1]?.answer).toBe(
      'I like a small team that writes decisions down.\n\nHow we shipped it mattered more than the demo.\nTell them what happened, without spinning it.',
    );
  });

  it('reads a question prefix and skips a list with no questions', () => {
    expect(parsePastedAnswers('Q: Why this role?\nA: I have shipped the same kind of tool.')).toEqual([
      { question: 'Why this role?', answer: 'I have shipped the same kind of tool.' },
    ]);
    expect(parsePastedAnswers('By role\n\nSome notes without a question.')).toEqual([]);
  });
});
