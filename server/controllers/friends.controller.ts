// Controller serving the friends page and handling friend management

import Controller from './controller';
import { Request, Response } from 'express';

export default class FriendsController extends Controller {
  public constructor(path: string) {
    super(path);
  }

  // Note that friends are not stored by the server, but only on the client
  // No database access or request handling is needed
  // A really simple controller

  public initializeRoutes(): void {
    this.router.get('/', this.friendsPage);
  }

  public friendsPage(req: Request, res: Response) {
    res.redirect('/pages/friends.html');
  }
}
