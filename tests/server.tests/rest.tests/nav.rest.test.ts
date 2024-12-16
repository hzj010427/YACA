import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs';
import 'jest-expect-message';
import path from 'path';

import App from '../../../server/app';
import { InMemoryDB } from '../../../server/db/inMemory.db';
import HomeController from '../../../server/controllers/home.controller';
import AuthController from '../../../server/controllers/auth.controller';
import FriendsController from '../../../server/controllers/auth.controller';
import { Server } from 'http';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';

const port = 8080;
const host = 'http://localhost';

let app: App;
let server: Server;
let httpTerminator: HttpTerminator;
let page: string;

const clientDir = path.join(__dirname, '../../../.dist/client');

beforeAll(async () => {
  app = new App(
    [
      new HomeController('/'),
      new AuthController('/auth'),
      new FriendsController('/friends')
    ],
    {
      clientDir: clientDir,
      db: new InMemoryDB(),
      port: port,
      host: host,
      url: `${host}:${port.toString()}`,
      initOnStart: true
    }
  );
  server = await app.listen();
  httpTerminator = createHttpTerminator({ server });
});

afterAll(async () => {
  await httpTerminator.terminate();
});

afterEach(async () => {
  // nothing to do here
});

describe('Tests for static endpoints served by home, friends, and auth controllers', () => {
  it('should find the build directory', () => {
    expect(
      fs.existsSync(clientDir),
      'Cannot find the build directory! Are you sure the app has been built?'
    ).toBe(true);
  });

  it(`should get the index page from path /pages/index.html`, async () => {
    page = '/pages/index.html';
    let res: AxiosResponse;
    try {
      res = await axios.get(app.url + page, {
        validateStatus: () => true
      });
    } catch (err) {
      throw new Error(`Could not get page for endpoint ${page} -- ` + err);
    }
    expect(res.status).toBe(200);
  });

  it(`should get the index page from path /`, async () => {
    page = '/';
    let res: AxiosResponse;
    try {
      res = await axios.get(app.url + page, {
        validateStatus: () => true
      });
    } catch (err) {
      throw new Error(`Could not get page for endpoint ${page} -- ` + err);
    }
    expect(res.status).toBe(200);
  });

  it(`should get the index page from path /home`, async () => {
    page = '/home';
    let res: AxiosResponse;
    try {
      res = await axios.get(app.url + page, {
        validateStatus: () => true
      });
    } catch (err) {
      throw new Error(`Could not get page for endpoint ${page} -- ` + err);
    }
    expect(res.status).toBe(200);
  });

  it(`should get the About page from path /about with required content`, async () => {
    page = '/about';
    let res: AxiosResponse;
    try {
      res = await axios.get(app.url + page, {
        validateStatus: () => true
      });
    } catch (err) {
      throw new Error('Could not get page for endpoint /about -- ' + err);
    }
    expect(res.status).toBe(200);
    const html = res.data as string;
    expect(html).toContain('About YACA');
    expect(html).toContain('YACA means Yet Another Chat App');
    expect(html).toContain('YACA is running on');
    expect(html).toContain(
      'YACA is an Express.js app built using TypeScript, HTML, and CSS'
    );
    expect(html).toContain('This YACA version was created by');
  });

  it(`should get the authentication page from path /auth`, async () => {
    page = '/auth';
    let res: AxiosResponse;
    try {
      res = await axios.get(app.url + page, {
        validateStatus: () => true
      });
    } catch (err) {
      throw new Error(`Could not get page for endpoint ${page} -- ` + err);
    }
    expect(res.status).toBe(200);
  });

  it(`should get the friends page from path /friends`, async () => {
    page = '/friends';
    let res: AxiosResponse;
    try {
      res = await axios.get(app.url + page, {
        validateStatus: () => true
      });
    } catch (err) {
      throw new Error(`Could not get page for endpoint ${page} -- ` + err);
    }
    expect(res.status).toBe(200);
  });
});
