import { zodToJsonSchema } from 'zod-to-json-schema';
import { writeFileSync } from 'fs';
import { join } from 'path';
import * as schemas from '../src/index';

// Generate JSON schemas for Python consumption
const schemasToGenerate = {
  'JobPayload': schemas.JobPayloadSchema,
  'Transaction': schemas.TransactionSchema,
  'JobResult': schemas.JobResultSchema,
  'FileUploadResponse': schemas.FileUploadResponseSchema,
  'StatusResponse': schemas.StatusResponseSchema,
  'ResultsResponse': schemas.ResultsResponseSchema,
  'ErrorResponse': schemas.ErrorResponseSchema,
  'PythonWorkerRequest': schemas.PythonWorkerRequestSchema,
  'PythonWorkerResponse': schemas.PythonWorkerResponseSchema,
};

const outputDir = join(__dirname, '../schemas');

// Create schemas directory if it doesn't exist
import { mkdirSync } from 'fs';
try {
  mkdirSync(outputDir, { recursive: true });
} catch (error) {
  // Directory might already exist
}

// Generate individual schema files
Object.entries(schemasToGenerate).forEach(([name, schema]) => {
  const jsonSchema = zodToJsonSchema(schema, {
    target: 'openApi3',
    $refStrategy: 'none',
  });
  
  const filePath = join(outputDir, `${name}.json`);
  writeFileSync(filePath, JSON.stringify(jsonSchema, null, 2));
  console.log(`Generated ${name}.json`);
});

// Generate a combined schema file
const combinedSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  definitions: Object.fromEntries(
    Object.entries(schemasToGenerate).map(([name, schema]) => [
      name,
      zodToJsonSchema(schema, {
        target: 'openApi3',
        $refStrategy: 'none',
      })
    ])
  ),
};

writeFileSync(
  join(outputDir, 'all-schemas.json'),
  JSON.stringify(combinedSchema, null, 2)
);

console.log('Generated all-schemas.json');
console.log('JSON schemas generated successfully!');








