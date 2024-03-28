import GithubSlugger from 'github-slugger';

import {RadioButton} from './transform';

const CUSTOM_ID_REGEXP = /\[?{ ?#(\S+) ?}]?/;

const sluggersStorage = new Map<string, GithubSlugger>();

function parseName(name: string) {
  const parts = name.match(CUSTOM_ID_REGEXP);
  if (!parts) {
    return {
      name,
      customAnchor: null,
    };
  }

  return {
    name: name.replace(parts[0], '').trim(),
    customAnchor: parts[1],
  };
}

export function getRadioButtonId(radioButton: RadioButton, {runId}: {runId: string}) {
  let slugger = sluggersStorage.get(runId);

  if (!slugger) {
    slugger = new GithubSlugger();
    sluggersStorage.set(runId, slugger);
  }

  return slugger.slug(getRawId(radioButton));
}

export function getRadioButtonKey(radioButton: RadioButton) {
  return encodeURIComponent(getRawId(radioButton)).toLocaleLowerCase();
}

export function getName(radioButton: RadioButton) {
  return parseName(radioButton.name).name;
}

function getRawId(radioButton: RadioButton): string {
  return parseName(radioButton.name).customAnchor || radioButton.name;
}
