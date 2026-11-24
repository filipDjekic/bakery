import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read = (path: string) => readFileSync(path, 'utf8');
const schema = read('prisma/schema.prisma');
const source = ts.createSourceFile(
  'client.ts',
  read('src/generated/prisma/internal/class.ts'),
  ts.ScriptTarget.Latest,
  true,
);
let inline: string | undefined;
function visit(node: ts.Node) {
  if (
    ts.isPropertyAssignment(node) &&
    node.name.getText(source) === 'inlineSchema' &&
    ts.isStringLiteral(node.initializer)
  )
    inline = node.initializer.text;
  ts.forEachChild(node, visit);
}
visit(source);
const normalize = (value: string) => value.replace(/\s+/g, '');
if (!inline || normalize(inline) !== normalize(schema))
  throw new Error(
    'Auth client is stale. Generate with Prisma 7.10.0 and prisma.auth.config.ts.',
  );
const contract = read('src/prisma/contract.prisma');
function fields(text: string, model: string) {
  const body = new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`).exec(
    text,
  )?.[1];
  if (!body) throw new Error(`Missing auth model ${model}`);
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('@@') && !line.startsWith('//'))
    .map((line) => line.split(/\s+/))
    .filter(
      ([, type]) =>
        !type.includes('[]') && !['User', 'Session', 'Account'].includes(type),
    )
    .map(([name, type]) =>
      [
        name,
        type.startsWith('temporal.')
          ? 'TimestamptzString'
          : type
              .replace('DateTime', 'TimestamptzString')
              .replace('UserRole', 'String'),
      ].join(':'),
    )
    .sort()
    .join('|');
}
for (const model of ['User', 'Session', 'Account', 'Verification', 'RateLimit'])
  if (fields(schema, model) !== fields(contract, model))
    throw new Error(
      `Auth projection differs from migration contract: ${model}`,
    );
console.info(
  'Auth projection and committed Prisma 7 client match the migration owner.',
);
