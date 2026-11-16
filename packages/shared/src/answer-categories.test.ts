import { describe, expect, it } from 'vitest';
import { answerCategory } from './answer-categories';

describe('answerCategory', () => {
  it('groups the standard application questions', () => {
    expect(answerCategory('What are your salary expectations?')).toBe('Logistics');
    expect(answerCategory('Tell me about yourself.')).toBe('Why you');
    expect(answerCategory('Why do you want to be a software engineer?')).toBe('By role');
    expect(answerCategory('Describe a technical project.')).toBe('Projects');
    expect(answerCategory('What is a strength?')).toBe('Behavior');
  });

  it('leaves an unrelated question in Other', () => {
    expect(answerCategory('What is your notice period?')).toBe('Other');
  });
});