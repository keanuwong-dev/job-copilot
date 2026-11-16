import { describe, expect, it } from 'vitest';
import { matchAnswer } from './answers';

const answers = [
  {
    question_normalized: 'why do you want this role',
    answer: 'I like building careful tools.',
  },
  {
    question_normalized: 'tell us about a project you are proud of',
    answer: 'A tracker that never submits the form.',
  },
];

describe('matchAnswer', () => {
  it('matches the normalized question exactly', () => {
    expect(matchAnswer('Why do you want this role?', answers)?.answer).toBe(
      'I like building careful tools.',
    );
  });

  it('matches a very similar question', () => {
    expect(matchAnswer('Why do you want this role now', answers)?.answer).toBe(
      'I like building careful tools.',
    );
  });

  it('leaves a different question empty', () => {
    expect(matchAnswer('What is your favorite programming language', answers)).toBeNull();
    expect(matchAnswer('Phone', answers)).toBeNull();
  });
});
