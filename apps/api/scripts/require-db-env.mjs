import 'dotenv/config';

const requiredVariables = process.argv.slice(2);

const missingVariables = requiredVariables.filter(
  (variableName) => !process.env[variableName]?.trim(),
);

if (missingVariables.length > 0) {
  console.error(
    ['Missing required database environment variable(s):', missingVariables.join(', ')].join(' '),
  );

  process.exit(1);
}
