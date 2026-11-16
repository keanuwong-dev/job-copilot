import { matchAnswer, type Profile, type ProfileField } from '@job-tracker/shared';
import type { AnswerEntry } from './types';

export function profileValue(profile: Profile, field: ProfileField): string {
  switch (field) {
    case 'personal.first_name':
      return profile.personal.first_name;
    case 'personal.last_name':
      return profile.personal.last_name;
    case 'personal.preferred_name':
      return profile.personal.preferred_name;
    case 'personal.email':
      return profile.personal.email;
    case 'personal.phone':
      return profile.personal.phone;
    case 'personal.address_line1':
      return profile.personal.address_line1;
    case 'personal.city':
      return profile.personal.city;
    case 'personal.state':
      return profile.personal.state;
    case 'personal.zip':
      return profile.personal.zip;
    case 'personal.country':
      return profile.personal.country;
    case 'links.linkedin':
      return profile.links.linkedin;
    case 'links.github':
      return profile.links.github;
    case 'links.portfolio':
      return profile.links.portfolio;
    case 'links.website':
      return profile.links.website;
    case 'work_auth.authorized_us':
      return yesNo(profile.work_auth.authorized_us);
    case 'work_auth.needs_sponsorship_now':
      return yesNo(profile.work_auth.needs_sponsorship_now);
    case 'work_auth.needs_sponsorship_future':
      return yesNo(profile.work_auth.needs_sponsorship_future);
    case 'work_auth.needs_sponsorship':
      return yesNo(
        profile.work_auth.needs_sponsorship_now || profile.work_auth.needs_sponsorship_future,
      );
    case 'education.school':
      return profile.education[0]?.school ?? '';
    case 'education.degree':
      return profile.education[0]?.degree ?? '';
    case 'education.major':
      return profile.education[0]?.major ?? '';
    case 'education.gpa':
      return profile.education[0]?.gpa ?? '';
    case 'education.start':
      return profile.education[0]?.start ?? '';
    case 'education.end':
      return profile.education[0]?.end ?? '';
    case 'experience.company':
      return profile.experience[0]?.company ?? '';
    case 'experience.title':
      return profile.experience[0]?.title ?? '';
    case 'experience.location':
      return profile.experience[0]?.location ?? '';
    case 'experience.start':
      return profile.experience[0]?.start ?? '';
    case 'experience.end':
      return profile.experience[0]?.end ?? '';
    case 'preferences.desired_salary':
      return profile.preferences.desired_salary;
    case 'preferences.earliest_start_date':
      return profile.preferences.earliest_start_date;
    case 'preferences.willing_to_relocate':
      return yesNo(profile.preferences.willing_to_relocate);
    case 'preferences.remote_preference':
      return profile.preferences.remote_preference;
    case 'eeo.gender':
      return profile.eeo.gender;
    case 'eeo.race_ethnicity':
      return profile.eeo.race_ethnicity;
    case 'eeo.hispanic_latino':
      return profile.eeo.hispanic_latino;
    case 'eeo.veteran_status':
      return profile.eeo.veteran_status;
    case 'eeo.disability_status':
      return profile.eeo.disability_status;
    case 'common_answers.how_did_you_hear':
      return profile.common_answers.how_did_you_hear;
    case 'common_answers.cover_letter_default':
      return profile.common_answers.cover_letter_default;
    default:
      return '';
  }
}

export function fullName(profile: Profile): string {
  return [profile.personal.first_name, profile.personal.last_name].filter(Boolean).join(' ').trim();
}

export function answerFor(
  label: string,
  answers: readonly AnswerEntry[],
): { answer: string; question_normalized: string } | null {
  const match = matchAnswer(label, answers);
  if (!match) return null;
  return { answer: match.answer, question_normalized: match.question_normalized };
}

function yesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}
