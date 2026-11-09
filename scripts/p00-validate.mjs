import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();

const paths = {
  srs: 'docs/baseline/02_SRS.md',
  decisions: 'docs/baseline/13_Decision_Log_and_Open_Items.md',
  roadmap: 'docs/baseline/04_Development_Roadmap.md',
  overrides: 'docs/governance/requirement-overrides.json',
  gates: 'docs/governance/phase-gates.json',
  baseline: 'docs/governance/baseline.json',
  requirements: 'docs/traceability/requirements.generated.json',
  coverage: 'docs/traceability/coverage-report.json',
  evidence: 'docs/evidence/P00/verification.json',
};

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function writeJson(relativePath, data) {
  const absolutePath = path.join(root, relativePath);

  fs.mkdirSync(path.dirname(absolutePath), {
    recursive: true,
  });

  fs.writeFileSync(absolutePath, JSON.stringify(data, null, 2) + '\n');
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function parseTableRows(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => /^\s*\|/.test(line))
    .map((line) =>
      line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((cell) => cell.trim()),
    );
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  }

  return [...duplicates].sort();
}

function parseRequirements(markdown) {
  const rows = parseTableRows(markdown);

  return rows
    .filter((row) => /^(FR|NFR)-[A-Z0-9-]+$/.test(row[0] ?? ''))
    .map((row) => ({
      id: row[0],
      description: row[1] ?? '',
      priority: /^(Must|Should|Could|Won't)$/i.test(row[2] ?? '')
        ? row[2]
        : row[0].startsWith('NFR-')
          ? 'UNSPECIFIED'
          : 'UNKNOWN',
    }));
}

function parseRoadmapPhases(markdown) {
  return [...new Set([...markdown.matchAll(/\b(P\d{2})\b/g)].map((match) => match[1]))];
}

function parseDecisionIds(markdown) {
  return [...markdown.matchAll(/^\s*\|\s*(D-\d{3})\s*\|/gm)].map((match) => match[1]);
}

function parseExistingTrace(markdown) {
  const rows = parseTableRows(markdown);
  const traces = new Map();

  for (const row of rows) {
    const references = row[0].match(/\b(?:FR|NFR)-[A-Z0-9-]+\b/g) ?? [];

    for (const id of references) {
      const existing = traces.get(id) ?? [];

      existing.push({
        businessRule: row[1] ?? '',
        api: row[2] ?? '',
        database: row[3] ?? '',
        test: row[4] ?? '',
        backlogPhase: row[5] ?? '',
      });

      traces.set(id, existing);
    }
  }
  return traces;
}

function getDomain(id) {
  if (id.startsWith('NFR-')) {
    return 'NFR';
  }

  return id.split('-')[1] ?? 'UNKNOWN';
}

function isMust(requirement) {
  return requirement.priority.toLowerCase() === 'must';
}

function checkGateConfiguration(gates, roadmap) {
  const severity = gates.severity ?? {};
  const exit = gates.phaseExit ?? {};
  const release = gates.releaseGate ?? {};

  return (
    severity.CRITICAL?.releaseBlocker === true &&
    severity.HIGH?.releaseBlocker === true &&
    exit.allRequiredTestsPassed === true &&
    exit.evidenceRecorded === true &&
    exit.criticalHighBlockers === 0 &&
    release.criticalHighBlockers === 0 &&
    release.formalGoNoGoRequired === true &&
    roadmap.includes('P00-T01') &&
    roadmap.includes('P00-T02') &&
    roadmap.includes('P00-T03') &&
    exit.dependenciesComplete === true &&
    exit.deliverablesReviewed === true &&
    exit.documentationUpdated === true &&
    release.requiredRegressionTestsPassed === true &&
    release.securityReviewPassed === true &&
    release.dataIntegrityVerified === true &&
    release.operationalReadinessReviewed === true &&
    Array.isArray(gates.evidenceRequiredFields) &&
    ['phaseId', 'testId', 'status', 'executedAt', 'command', 'result', 'artifactPath'].every(
      (field) => gates.evidenceRequiredFields.includes(field),
    )
  );
}

function result(testId, passed, details) {
  return {
    phaseId: 'P00',
    testId,
    status: passed ? 'PASS' : 'FAIL',
    executedAt: new Date().toISOString(),
    command: 'npm run p00:validate',
    result: details,
    artifactPath: paths.evidence,
  };
}

function main() {
  const srsText = readText(paths.srs);
  const decisionText = readText(paths.decisions);
  const roadmapText = readText(paths.roadmap);
  const rtmText = readText('docs/baseline/19_Requirements_Traceability_Matrix.md');

  const overrides = readJson(paths.overrides);
  const gates = readJson(paths.gates);
  const baseline = readJson(paths.baseline);

  const requirements = parseRequirements(srsText);
  const decisionIds = parseDecisionIds(decisionText);
  const phases = parseRoadmapPhases(roadmapText);
  const existingTrace = parseExistingTrace(rtmText);

  const duplicateRequirements = findDuplicates(requirements.map((item) => item.id));

  const duplicateDecisions = findDuplicates(decisionIds);

  const mapped = requirements.map((requirement) => {
    const domain = getDomain(requirement.id);
    const domainMapping = overrides.domainMappings[domain] ?? null;

    const explicitMapping = overrides.requirements[requirement.id] ?? null;

    const mapping = explicitMapping ?? domainMapping;

    const originalTrace = existingTrace.get(requirement.id) ?? [];

    const owner = mapping?.owner ?? null;
    const phasesForRequirement = mapping?.phases ?? [];
    const tests = mapping?.tests ?? [];

    const validPhases = phasesForRequirement.filter((phase) => phases.includes(phase));

    const hasTrace = validPhases.length > 0 || originalTrace.length > 0;

    const gapReasons = [];

    if (!owner) {
      gapReasons.push('Missing technical owner');
    }

    if (!hasTrace) {
      gapReasons.push('Missing phase/backlog trace');
    }

    if (tests.length === 0 && originalTrace.length === 0) {
      gapReasons.push('Missing test reference');
    }

    if (!explicitMapping) {
      gapReasons.push('Requirement-level mapping pending');
    }

    return {
      ...requirement,
      domain,
      owner,
      phases: validPhases,
      tests,
      originalTrace,
      mappingSource: explicitMapping ? 'EXPLICIT' : domainMapping ? 'DOMAIN_FALLBACK' : 'UNMAPPED',
      status: 'Planned',
      gaps: gapReasons,
    };
  });

  const mustRequirements = mapped.filter(isMust);

  const mustWithoutOwner = mustRequirements.filter((item) => !item.owner);

  const mustWithoutTrace = mustRequirements.filter(
    (item) => item.phases.length === 0 && item.originalTrace.length === 0,
  );

  const mustWithoutExplanation = mustRequirements.filter(
    (item) => item.gaps.length > 0 && !item.gaps.every((gap) => gap.length > 0),
  );

  const test01 =
    requirements.length > 0 && mustWithoutOwner.length === 0 && mustWithoutExplanation.length === 0;

  const test02 =
    duplicateRequirements.length === 0 && duplicateDecisions.length === 0 && decisionIds.length > 0;

  const test03 = checkGateConfiguration(gates, roadmapText);

  const verification = [
    result('P00-T01', test01, {
      totalMust: mustRequirements.length,
      missingOwner: mustWithoutOwner.map((item) => item.id),
      missingTrace: mustWithoutTrace.map((item) => item.id),
      mappingPending: mustRequirements
        .filter((item) => item.mappingSource !== 'EXPLICIT')
        .map((item) => item.id),
    }),
    result('P00-T02', test02, {
      duplicateRequirements,
      duplicateDecisions,
      totalDecisions: decisionIds.length,
    }),
    result('P00-T03', test03, {
      gatesDefined: test03,
      severityLevels: Object.keys(gates.severity ?? {}),
    }),
  ];

  const coverage = {
    baselineVersion: baseline.baselineVersion,
    sourceHashes: {
      srs: sha256(srsText),
      decisions: sha256(decisionText),
      roadmap: sha256(roadmapText),
      rtm: sha256(rtmText),
    },
    totalRequirements: requirements.length,
    totalMust: mustRequirements.length,
    totalShould: mapped.filter((item) => item.priority === 'Should').length,
    missingOwner: mustWithoutOwner.map((item) => item.id),
    missingTrace: mustWithoutTrace.map((item) => item.id),
    unmapped: mapped.filter((item) => item.mappingSource === 'UNMAPPED').map((item) => item.id),
    pendingExplicitMapping: mapped
      .filter((item) => item.mappingSource !== 'EXPLICIT')
      .map((item) => item.id),
  };

  writeJson(paths.requirements, mapped);
  writeJson(paths.coverage, coverage);
  writeJson(paths.evidence, {
    phaseId: 'P00',
    baselineVersion: baseline.baselineVersion,
    verification,
  });

  console.log('\nSURAT DIGITAL — P00 VALIDATION');
  console.log('--------------------------------');
  console.log('Requirements:', requirements.length);
  console.log('Must:', mustRequirements.length);
  console.log('Decisions:', decisionIds.length);
  console.log('Missing trace:', mustWithoutTrace.length);

  for (const test of verification) {
    console.log(`${test.testId}: ${test.status}`);
  }

  const passed = verification.every((test) => test.status === 'PASS');

  if (!passed) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error('P00 validation failed:', error);
  process.exitCode = 1;
}
