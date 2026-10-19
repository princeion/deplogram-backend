import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app-config.js';

describe('Deplogram dashboard API surface (frontend contract)', () => {
  let app: any;
  let agent: any;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    agent = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  // ── unauthenticated ─────────────────────────────────────────────────────────

  it('GET /v1/me is 401 when signed out', async () => {
    await agent.get('/v1/me').expect(401);
  });

  it('GET /v1/me/settings is 401 when signed out', async () => {
    await agent.get('/v1/me/settings').expect(401);
  });

  // ── auth ────────────────────────────────────────────────────────────────────

  it('POST /v1/auth/sign-in sets the session cookie and returns the viewer', async () => {
    const res = await agent
      .post('/v1/auth/sign-in')
      .send({ email: 'owner@deplogram.app', password: 'password' })
      .expect(200);
    expect(res.body.email).toBe('owner@deplogram.app');
    const cookies = res.headers['set-cookie'] ?? [];
    const cookieList = Array.isArray(cookies) ? cookies : [cookies];
    expect(
      cookieList.some((c: string) => c.startsWith('deplogram_session=')),
    ).toBe(true);
  });

  it('GET /v1/me is 200 once signed in (cookie persists)', async () => {
    const res = await agent.get('/v1/me').expect(200);
    expect(res.body.email).toBe('owner@deplogram.app');
  });

  // ── workspace & usage ───────────────────────────────────────────────────────

  it('GET /v1/workspace returns the current workspace', async () => {
    const res = await agent.get('/v1/workspace').expect(200);
    expect(res.body).toMatchObject({
      id: 'ws_personal',
      kind: 'personal',
      plan: expect.stringMatching(/^(free|plus|pro|enterprise)$/),
    });
  });

  it('GET /v1/traffic returns live traffic', async () => {
    const res = await agent.get('/v1/traffic').expect(200);
    expect(res.body).toMatchObject({
      requests: expect.any(Array),
      liveProjects: expect.any(Number),
    });
  });

  it('GET /v1/usage returns plan usage', async () => {
    const res = await agent.get('/v1/usage').expect(200);
    expect(res.body).toMatchObject({
      period: { start: expect.any(String), end: expect.any(String) },
      limits: expect.any(Array),
      requests: expect.any(Array),
      builds: expect.any(Array),
      trafficByHour: expect.any(Array),
      uptime: expect.any(Number),
    });
  });

  // ── projects ────────────────────────────────────────────────────────────────

  it('GET /v1/projects returns the project list', async () => {
    const res = await agent.get('/v1/projects').expect(200);
    expect(res.body).toEqual(expect.any(Array));
    const storefront = res.body.find((p: any) => p.name === 'storefront');
    expect(storefront).toMatchObject({
      id: 'proj_storefront',
      name: 'storefront',
      runtime: 'nextjs',
      state: expect.stringMatching(
        /^(QUEUED|BUILDING|BUILT|DEPLOYING|RUNNING|BUILD_FAILED|DEPLOY_FAILED|CRASHED)$/,
      ),
      updatedAt: expect.any(String),
      latest: expect.objectContaining({
        id: 'dep_live',
        state: 'RUNNING',
        live: true,
        message: 'feat: live traffic dashboard',
      }),
      recent: expect.any(Array),
    });
  });

  it('GET /v1/projects/:id returns the full project', async () => {
    const res = await agent.get('/v1/projects/proj_storefront').expect(200);
    expect(res.body).toMatchObject({
      id: 'proj_storefront',
      name: 'storefront',
      envCount: expect.any(Number),
      config: expect.objectContaining({
        runtimeVersion: expect.any(String),
        buildCommand: null,
        startCommand: null,
        port: null,
        rootDirectory: null,
      }),
    });
  });

  it('GET /v1/projects/:id/env returns the saved variables', async () => {
    const res = await agent.get('/v1/projects/proj_storefront/env').expect(200);
    expect(res.body).toEqual(expect.any(Array));
  });

  it('PUT /v1/projects/:id/env replaces the whole variable set', async () => {
    // The seed has no variables; create some first.
    const created = await agent
      .put('/v1/projects/proj_storefront/env')
      .send([
        { key: 'FOO', value: 'bar' },
        { key: 'BAZ', value: 'qux' },
      ])
      .expect(200);
    expect(created.body).toHaveLength(2);
    // Replace the whole set: FOO updated, BAZ dropped (not in the new list).
    const saved = await agent
      .put('/v1/projects/proj_storefront/env')
      .send([{ key: 'FOO', value: 'updated-value' }])
      .expect(200);
    expect(saved.body).toEqual([expect.objectContaining({ key: 'FOO' })]);
  });

  it('PATCH /v1/projects/:id updates name/branch/config', async () => {
    const updated = await agent
      .patch('/v1/projects/proj_storefront')
      .send({ name: 'renamed-storefront', branch: 'main' })
      .expect(200);
    expect(updated.body.name).toBe('renamed-storefront');
  });

  it('GET /v1/projects/:id/logs returns the runtime log', async () => {
    const res = await agent
      .get('/v1/projects/proj_storefront/logs')
      .expect(200);
    expect(res.body).toMatchObject({
      lines: expect.any(Array),
      live: expect.any(Boolean),
    });
  });

  it('GET /v1/projects/:id/metrics returns deployment metrics', async () => {
    const res = await agent
      .get('/v1/projects/proj_storefront/metrics?range=24h')
      .expect(200);
    expect(res.body).toMatchObject({
      range: '24h',
      summary: {
        requests: expect.any(Number),
        errorRate: expect.any(Number),
        p95: expect.any(Number),
        uptime: expect.any(Number),
      },
      series: expect.any(Array),
      statuses: expect.any(Object),
      paths: expect.any(Array),
      memoryLimit: expect.any(Number),
    });
  });

  it('GET /v1/projects/name-availability', async () => {
    const free = await agent
      .get('/v1/projects/name-availability?name=never-used-before-xyz')
      .expect(200);
    expect(free.body.available).toBe(true);

    const taken = await agent
      .get('/v1/projects/name-availability?name=renamed-storefront')
      .expect(200);
    expect(taken.body.available).toBe(false);
  });

  it('POST /v1/projects creates a project and starts its first deployment', async () => {
    const created = await agent
      .post('/v1/projects')
      .send({
        name: 'integration-test-project',
        repositoryId: 'repo_storefront',
        branch: 'main',
        runtime: 'node',
        config: {
          buildCommand: null,
          startCommand: null,
          port: null,
          rootDirectory: null,
        },
        env: [{ key: 'SECRET', value: 'value' }],
      })
      .expect(201);
    expect(created.body.project.id).toMatch(/^proj_/);
    expect(created.body.deployment.id).toMatch(/^dep_/);
  });

  // ── deployments ─────────────────────────────────────────────────────────────

  it('GET /v1/deployments returns the deployment list', async () => {
    const res = await agent.get('/v1/deployments').expect(200);
    expect(res.body).toMatchObject({
      items: expect.any(Array),
      total: expect.any(Number),
      page: expect.any(Number),
      pageSize: expect.any(Number),
    });
  });

  it('GET /v1/deployments/:id returns one deployment', async () => {
    const res = await agent.get('/v1/deployments/dep_live').expect(200);
    expect(res.body).toMatchObject({
      id: 'dep_live',
      projectId: 'proj_storefront',
      state: 'RUNNING',
      live: true,
      commit: expect.objectContaining({ sha: expect.any(String) }),
      trigger: expect.stringMatching(/^(git|manual|redeploy|rollback)$/),
    });
  });

  it('GET /v1/deployments/:id/logs returns the build log', async () => {
    const res = await agent.get('/v1/deployments/dep_live/logs').expect(200);
    expect(res.body).toMatchObject({
      lines: expect.any(Array),
      steps: expect.any(Array),
      done: expect.any(Boolean),
    });
  });

  it('POST /v1/deployments/:id/redeploy starts a new build', async () => {
    const res = await agent
      .post('/v1/deployments/dep_live/redeploy')
      .expect(201);
    expect(res.body).toMatchObject({
      id: expect.stringMatching(/^dep_/),
      projectId: 'proj_storefront',
      trigger: 'redeploy',
    });
  });

  it('POST /v1/deployments/:id/rollback promotes the earlier live deployment', async () => {
    // dep_old_1 was live before dep_live; roll back dep_live.
    const res = await agent
      .post('/v1/deployments/dep_live/rollback')
      .expect(201);
    expect(res.body).toMatchObject({
      deployment: expect.objectContaining({ id: 'dep_live' }),
      previousLiveId: 'dep_old_1',
    });
    // The earlier deployment is live again.
    const promoted = await agent.get('/v1/deployments/dep_old_1').expect(200);
    expect(promoted.body.live).toBe(true);
    expect(promoted.body.state).toBe('RUNNING');
  });

  // ── git ─────────────────────────────────────────────────────────────────────

  it('GET /v1/git/connection returns the connected account', async () => {
    const res = await agent.get('/v1/git/connection').expect(200);
    expect(res.body).toMatchObject({
      provider: 'github',
      connected: true,
      account: 'princeion',
    });
  });

  it('GET /v1/git/repositories?q= lists repositories', async () => {
    const res = await agent
      .get('/v1/git/repositories?q=storefront')
      .expect(200);
    expect(res.body).toEqual(expect.any(Array));
    expect(res.body[0]).toMatchObject({
      id: 'repo_storefront',
      fullName: 'acme/storefront',
      defaultBranch: 'main',
      projectId: expect.any(String),
    });
  });

  it('GET /v1/git/repositories/:id/branches lists branches', async () => {
    const res = await agent
      .get('/v1/git/repositories/repo_storefront/branches')
      .expect(200);
    expect(res.body).toEqual(expect.any(Array));
    expect(res.body[0]).toMatchObject({
      name: expect.any(String),
      commit: expect.objectContaining({ sha: expect.any(String) }),
    });
  });

  it('GET /v1/git/repositories/:id/detect?branch= detects the runtime', async () => {
    const res = await agent
      .get('/v1/git/repositories/repo_storefront/detect?branch=main')
      .expect(200);
    expect(res.body).toMatchObject({
      runtime: expect.anything(),
      evidence: expect.anything(),
      envExample: expect.any(Array),
    });
  });

  // ── activity ────────────────────────────────────────────────────────────────

  it('GET /v1/activity returns the audit log', async () => {
    const res = await agent.get('/v1/activity?limit=5').expect(200);
    expect(res.body).toMatchObject({
      items: expect.any(Array),
      nextCursor: expect.anything(),
    });
  });

  // ── sign-out ────────────────────────────────────────────────────────────────

  it('POST /v1/auth/sign-out clears the session', async () => {
    await agent.post('/v1/auth/sign-out').expect(204);
    await agent.get('/v1/me').expect(401);
  });

  // ── sign-up (deplogram-web auth pages) ──────────────────────────────────────

  it('POST /v1/auth/sign-in rejects bad credentials with 401', async () => {
    await agent
      .post('/v1/auth/sign-in')
      .send({ email: 'owner@deplogram.app', password: 'wrong-password' })
      .expect(401);
  });

  it('POST /v1/auth/sign-up creates the account, starts a session and returns the viewer', async () => {
    const res = await agent
      .post('/v1/auth/sign-up')
      .send({
        name: 'Ada Lovelace',
        email: 'Ada@Example.com',
        password: 'analytical-engine',
      })
      .expect(201);

    expect(res.body).toMatchObject({
      id: expect.any(String),
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      image: null,
    });
    const cookies = res.headers['set-cookie'] ?? [];
    const cookieList = Array.isArray(cookies) ? cookies : [cookies];
    expect(
      cookieList.some((c: string) => c.startsWith('deplogram_session=')),
    ).toBe(true);

    const me = await agent.get('/v1/me').expect(200);
    expect(me.body.email).toBe('ada@example.com');
  });

  it('POST /v1/auth/sign-up rejects a duplicate email with 409', async () => {
    await agent
      .post('/v1/auth/sign-up')
      .send({
        name: 'Ada Again',
        email: 'ada@example.com',
        password: 'analytical-engine',
      })
      .expect(409);
  });

  it('POST /v1/auth/sign-up validates the sign-up form', async () => {
    await agent
      .post('/v1/auth/sign-up')
      .send({ name: 'Grace', email: 'grace@example.com', password: 'short' })
      .expect(400);
    await agent
      .post('/v1/auth/sign-up')
      .send({ name: 'Grace', email: 'not-an-email', password: 'hopper-1906' })
      .expect(400);
  });

  it('reflects the frontend Origin for credentialed CORS requests', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/workspace')
      .set('Origin', 'https://deplogram.app')
      .expect(200);
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://deplogram.app',
    );
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});
