# OPI API - Swagger Documentation Guide

## Accessing Swagger

### Local Development

1. Start the API with Swagger enabled:

```bash
SWAGGER_ENABLED=true pnpm --filter api dev
```

2. Open your browser and navigate to:

- **Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **OpenAPI JSON spec**: [http://localhost:3000/docs-json](http://localhost:3000/docs-json)

### Production (Dokploy)

Swagger is enabled via the `SWAGGER_ENABLED` environment variable in `docker-compose.dokploy.yml`. Once deployed:

- **Swagger UI**: `https://<your-api-domain>/docs`
- **OpenAPI JSON spec**: `https://<your-api-domain>/docs-json`

To disable Swagger in production, set `SWAGGER_ENABLED=false` in your Dokploy environment variables.

---

## Authenticating in Swagger UI

All endpoints (except the Swagger UI itself) require a JWT Bearer token.

### Step 1 - Get a token

Obtain a valid JWT from Auth0. You can get one by:

- Logging into the OPI web app and copying the token from the browser's network tab (look for the `Authorization: Bearer <token>` header in any API request).
- Using the Auth0 Management API or a tool like Postman to request a token with your Auth0 credentials.

### Step 2 - Authorize in Swagger

1. Click the **Authorize** button (lock icon) at the top-right of the Swagger UI.
2. In the **access-token (http, Bearer)** field, paste your JWT token (without the `Bearer ` prefix).
3. Click **Authorize**, then **Close**.

All subsequent requests from the Swagger UI will include the token automatically.

---

## Making API Requests

1. Find the endpoint you want to test. Endpoints are grouped by tags: **Auth**, **Users**, **Assessments**, **Audio**, **Cycles**, **Classes**, **Assignments**, **Scheduling**, **Evaluator**, **Ingestion**, **Audit**, **Class Summary**, **Reports**, **Retention**, **Dashboard**.
2. Click on an endpoint to expand it.
3. Click **Try it out**.
4. Fill in the required parameters and/or request body.
5. Click **Execute**.
6. View the response below, including status code, headers, and body.

---

## Importing the Spec into Other Tools

The OpenAPI JSON spec at `/docs-json` can be imported into:

- **Postman**: File > Import > paste the URL `https://<your-api-domain>/docs-json`
- **Insomnia**: Application > Preferences > Data > Import from URL
- **Code generators**: Use [openapi-generator](https://github.com/OpenAPITools/openapi-generator) to generate client SDKs in any language:

```bash
npx @openapitools/openapi-generator-cli generate \
  -i https://<your-api-domain>/docs-json \
  -g typescript-fetch \
  -o ./generated-client
```

---

## Role-Based Access

Endpoints are protected by roles. If you get a `403 Forbidden`, your token's user does not have the required role. The main roles are:

| Role | Access |
|---|---|
| **ADMIN** | Full access to all endpoints including user management, cycles, ingestion, retention, and dashboards |
| **COORDINATOR** | Assignments, scheduling, reports, class views, and coordinator dashboard |
| **EVALUATOR** | Assessments, audio, evaluator dashboard, and assigned class views |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SWAGGER_ENABLED` | `false` | Set to `true` to enable Swagger UI and JSON spec |
