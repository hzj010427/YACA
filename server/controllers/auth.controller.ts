// Controller serving the athentication page and handling user registration and login
// Note that controllers don't access the DB direcly, only through the models

import { ILogin, IUser } from '../../common/user.interface';
import { User } from '../models/user.model';
import Controller from './controller';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as responses from '../../common/server.responses';
import { JWT_KEY as secretKey, JWT_EXP as tokenExpiry } from '../env';

export default class AuthController extends Controller {
  public constructor(path: string) {
    super(path);
  }

  public initializeRoutes(): void {
    // this should define the routes handled by the middlewares authPage, register, and login
    // TODO
    this.router.get('/', this.authPage);
    this.router.post('/users', this.register);
    this.router.post('/tokens/:username?', this.login);
  }

  public async authPage(req: Request, res: Response) {
    res.redirect('/pages/auth.html');
  }

  public async register(req: Request, res: Response) {
    // TODO
    try {
      const { credentials, extra } = req.body;
      const user: User = new User(credentials, extra);

      const newUser: IUser = await user.join();

      const successRes: responses.ISuccess = {
        name: 'UserRegistered',
        message: `User ${user.credentials.username} registered successfully`,
        payload: newUser,
      };

      res.status(201).json(successRes);
    } catch (err) {
      if (responses.isClientError(err as responses.IResponse)) {
        res.status(400).json(err);
      } else if (responses.isServerError(err as responses.IResponse)) {
        res.status(500).json(err);
      } else {
        const errorRes: responses.IAppError = {
          type: 'ServerError',
          name: 'FailedRegistration',
          message: 'Unknown error',
        };

        res.status(500).json(errorRes);
      }
    }
  }

  public async login(req: Request, res: Response) {
    // TODO
    try {
      const { username } = req.params;
      const { password } = req.body;
      const credentials: ILogin = { username, password };

      const user: User = new User(credentials);

      const loggedInUser: IUser = await user.login();

      const tokenPayload: ILogin = {
        username: loggedInUser.credentials.username,
        password: loggedInUser.credentials.password,
      };

      const signedToken = tokenExpiry === 'never'
        ? jwt.sign(tokenPayload, secretKey)
        : jwt.sign(tokenPayload, secretKey, { expiresIn: tokenExpiry });


      const successRes: responses.ISuccess = {
        name: 'UserAuthenticated',
        message: `User ${user.credentials.username} logged in successfully`,
        payload: {
          token: signedToken,
          user: loggedInUser,
        }
      };

      res.status(200).json(successRes);
    } catch (err) {
      if (responses.isClientError(err as responses.IResponse)) {
        res.status(400).json(err);
      } else if (responses.isServerError(err as responses.IResponse)) {
        res.status(500).json(err);
      } else {
        const errorRes: responses.IAppError = {
          type: 'ServerError',
          name: 'FailedAuthentication',
          message: 'Unknown error',
        };

        res.status(500).json(errorRes);
      }
    }
  }
}
