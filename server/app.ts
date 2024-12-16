import express, { Express, Request, Response, NextFunction } from 'express';
import { Server as HttpServer, createServer } from 'http';
import DAC, { IDatabase } from './db/dac';
import Controller from './controllers/controller';
import * as responses from '../common/server.responses';
import { JWT_KEY as secretKey, JWT_EXP as tokenExpiry } from './env'; // for later
import jwt from 'jsonwebtoken';
import { Server as SocketServer, Socket } from 'socket.io'; // for later
import { ClientToServerEvents, ServerToClientEvents } from '../common/socket.interface'; // for later
// other imports you need

class App {
  public app: Express;

  public port: number;

  public db: IDatabase;

  public host: string;

  public clientDir: string; // pathname for the client folder

  public url: string;

  public server: HttpServer;

  public io: SocketServer; // for later

  constructor(
    controllers: Controller[],
    params: {
      port: number;
      host: string;
      clientDir: string;
      db: IDatabase;
      url: string;
      initOnStart: boolean;
    }
  ) {
    this.app = express();
    this.server = createServer(this.app);
    // for later
    this.io = new SocketServer<
      ClientToServerEvents,
      ServerToClientEvents
    >(this.server);

    this.port = params.port;
    this.db = params.db;
    this.host = params.host;
    this.clientDir = params.clientDir;
    this.url = params.url; // construct the URL from the host and port
    this.configureApp(params.initOnStart);
    this.configureMiddlewares();
    this.configureControllers(controllers);
    this.configureSocket();
    // more TODO here? Perhaps, perhaps not!
  }

  private configureApp(initOnStart: boolean) {
    DAC.db = this.db;
    DAC.db.connect().then(() => {
      if (initOnStart) {
        this.db.init(); //
        // TODO: Add more DB initialization code here if required
      }
    });
    // TODO: Add more app initialization code here if required
  }

  private configureMiddlewares() {
    // TODO
    this.app.use(express.static(this.clientDir)); // serve the static assets from the client folder
    /* 
       The next two lines are for setting up the view engine: they will work with the post-buid
       script buidForPug in the client folder
    */
    this.app.set('view engine', 'pug'); // set the view engine to pug
    this.app.set('views', this.clientDir + '/views'); // set the views directory for pug templates
    this.app.use(express.json()); // for parsing request's json body
    this.app.use(express.urlencoded({ extended: true })); // for decoding the encoded url
    this.app.use(this.serverLogger); // add a logging middleware
  }

  private configureControllers(controllers: Controller[]) {
    //  Controller.io = this.io; // for later
    controllers.forEach((controller) => {
      this.app.use(controller.path, controller.router);
    });
    this.app.use(this.errorHandler); // add an error handling middleware
    Controller.io = this.io;
  }

  private configureSocket() {
    this.io.use((socket, next) => {
      const token = socket.handshake.query.token as string;
      if (!token) {
        console.log('🚨[Server]: Eavesdropping behavior detected!!!');
        return next(new Error('Authentication error: Missing token'));
      }

      try {
        const decoded = jwt.verify(token, secretKey) as { username: string };
        socket.data.user = decoded;
        next();
      } catch (err) {
        console.log('🚨[Server]: Eavesdropping behavior detected!!!');
        next(new Error('Socket authentication error: Invalid token'));
      }
    });
  }

  public serverLogger(req: Request, res: Response, next: NextFunction) {
    // TODO
    next();
  }

  public errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
    if (responses.isClientError(err as responses.IResponse)) {
      res.status(400).json(err);
    } else if (responses.isServerError(err as responses.IResponse)) {
      res.status(500).json(err);
    } else {
      const errorRes: responses.IAppError = {
        type: 'ServerError',
        name: 'UnknownError',
        message: err.message,
      };
      res.status(500).json(errorRes);
    }
  }

  public async listen(): Promise<HttpServer> {
    // listen for incoming requests
    return new Promise<HttpServer>((resolve, reject) => {
      // for later
      this.io.on('connection', (socket: Socket) => {
        console.log('⚡️[Server]: A client connected to the socket server with id ' + socket.id);
      });

      try {
        this.server.listen(this.port, () => {
          // must listen on http server, not express app, for socket.io to work
          console.log(`⚡️[Server]: Running at ${this.url} ...`);
          resolve(this.server);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

export default App;
