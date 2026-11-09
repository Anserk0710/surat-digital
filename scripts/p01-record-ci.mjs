import fs from 'node:fs';
import { readEvidence, recordCiRun, writeEvidence } from './p01-evidence.mjs';

const { GITHUB_EVENT_PATH, GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_API_URL } = process.env;
if (!GITHUB_EVENT_PATH || !GITHUB_TOKEN || !GITHUB_REPOSITORY) {
  throw new Error('This script requires a GitHub Actions workflow_run environment.');
}

const event = JSON.parse(fs.readFileSync(GITHUB_EVENT_PATH, 'utf8'));
const run = event.workflow_run;
if (!run || run.status !== 'completed') {
  throw new Error('Expected a completed workflow_run event.');
}

const fromThisRepository = run.head_repository?.full_name === GITHUB_REPOSITORY;
const positive = run.event === 'push' && run.head_branch === 'main';
const negative =
  ['push', 'pull_request'].includes(run.event) && run.head_branch === 'test/p01-ci-lint-failure';
if (!fromThisRepository || (!positive && !negative)) {
  console.log('No P01 evidence to record for this CI run.');
  process.exit(0);
}

const apiUrl = GITHUB_API_URL ?? 'https://api.github.com';
const response = await fetch(
  `${apiUrl}/repos/${GITHUB_REPOSITORY}/actions/runs/${run.id}/jobs?per_page=100`,
  {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  },
);
if (!response.ok) {
  throw new Error(`Could not read CI jobs for run ${run.id}: HTTP ${response.status}.`);
}

const { jobs } = await response.json();
const root = process.cwd();
const evidence = readEvidence(root);
if (recordCiRun(evidence, run, jobs)) {
  writeEvidence(root, evidence);
  console.log(`Recorded P01 evidence from CI run ${run.id}.`);
} else {
  console.log(`CI run ${run.id} did not prove a P01 test.`);
}
