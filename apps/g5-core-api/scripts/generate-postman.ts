import fs from 'fs';

async function main() {
  const raw = fs.readFileSync('openapi/openapi.json', 'utf-8');
  const swagger = JSON.parse(raw);
  const collection = swaggerToPostman(swagger);
  fs.mkdirSync('postman', { recursive: true });
  fs.writeFileSync('postman/g5-core-api.postman_collection.json', JSON.stringify(collection, null, 2));
  console.log('Postman collection written to postman/g5-core-api.postman_collection.json');
}

function swaggerToPostman(sw: any) {
  const items: any[] = [];
  for (const [path, methods] of Object.entries<any>(sw.paths || {})) {
    for (const [method, op] of Object.entries<any>(methods)) {
      const name = op.summary || op.operationId || `${method.toUpperCase()} ${path}`;
      const headers: any[] = [];
      if (op.security) {
        headers.push({ key: 'Authorization', value: 'Bearer {{accessToken}}', type: 'text' });
      }
      if (!headers.find(h => h.key === 'X-Tenant-Id')) {
        headers.push({ key: 'X-Tenant-Id', value: '{{tenantId}}', type: 'text' });
      }
      items.push({
        name,
        request: {
          method: method.toUpperCase(),
          header: headers,
          url: {
            raw: '{{baseUrl}}' + path,
            host: ['{{baseUrl}}'],
            path: path.split('/').filter(Boolean),
          },
        },
      });
    }
  }
  return {
    info: {
      name: 'G5 Core API',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      description: sw.info?.description || 'Generated from Swagger',
    },
    variable: [
      { key: 'baseUrl', value: 'http://localhost:3001/v1' },
      { key: 'tenantId', value: 'YOUR_TENANT_ID' },
      { key: 'accessToken', value: 'JWT_OR_API_KEY' }
    ],
    item: items,
  };
}

main().catch((e) => { console.error('generate-postman error', e); process.exit(1); });
