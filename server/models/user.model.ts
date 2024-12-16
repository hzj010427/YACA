// This is the model for users
// It is used by the controllers to access functionality related users, including database access

import { ILogin, IUser } from '../../common/user.interface';
import { v4 as uuidV4 } from 'uuid';
import DAC from '../db/dac';
import bcrypt from 'bcrypt';
import { IAppError } from 'common/server.responses';

export class User implements IUser {
  credentials: ILogin;

  extra?: string; // this carries the displayName of the user

  _id?: string;

  constructor(credentials: ILogin, extra?: string) {
    this.credentials = credentials;
    this.extra = extra;
    this._id = uuidV4();
  }

  async join(): Promise<IUser> {

    this.validateCredentials();
    this.validateDisplayName();
    this.validateEmailFormat(this.credentials.username);
    this.validatePasswordFormat(this.credentials.password);

    this.credentials.password = await bcrypt.hash(this.credentials.password, 10);
    return DAC.db.saveUser(this);
  }

  async login(): Promise<IUser> {

    this.validateCredentials();

    const user = await DAC.db.findUserByUsername(this.credentials.username);
    if (!user) {
      throw {
        type: 'ClientError',
        name: 'UserNotFound',
        message: 'User not found',
      } as IAppError;
    }

    const isPwdMatch = await bcrypt.compare(this.credentials.password, user.credentials.password);
    if (!isPwdMatch) {
      throw {
        type: 'ClientError',
        name: 'IncorrectPassword',
        message: 'Incorrect password',
      } as IAppError;
    }

    return user;
  }

  static async getAllUsernames(): Promise<string[]> {
    const users = await DAC.db.findAllUsers();
    return users.map(user => user.credentials.username);
  }

  static async getUserForUsername(username: string): Promise<IUser | null> {
    return DAC.db.findUserByUsername(username);
  }

  static async deleteUser(username: string): Promise<IUser | null> {
    return DAC.db.deleteUser(username);
  }

  private validatePasswordFormat(password: string): void {
    const lengthRegex = /.{4,}/;
    const letterRegex = /[a-zA-Z]/;
    const numberRegex = /[0-9]/;
    const specialCharRegex = /[$%#@!*&~^+-]/;
    const validCharsRegex = /^[a-zA-Z0-9$%#@!*&~^+-]+$/;

    const errors : string[] = [];
    if (!lengthRegex.test(password)) {
      errors.push('Password must be at least 4 characters long.');
    }
    if (!letterRegex.test(password)) {
      errors.push('Password must contain at least one letter character.');
    }
    if (!numberRegex.test(password)) {
      errors.push('Password must contain at least one number.');
    }
    if (!specialCharRegex.test(password)) {
      errors.push('Password must contain at least one special character ($%#@!*&~^+-).');
    }
    if (!validCharsRegex.test(password)) {
      errors.push('Password must contain only valid characters.');
    }

    if (errors.length > 0) {
      throw {
        type: 'ClientError',
        name: 'InvalidPassword',
        message: errors.join('\n'),
      } as IAppError;
    }
  }

  private validateEmailFormat(email: string): void {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      throw {
        type: 'ClientError',
        name: 'InvalidEmail',
        message: 'Invalid email address',
      } as IAppError;
    }
  }

  private validateCredentials(): void {
    if (!this.credentials.username) {
      throw {
        type: 'ClientError',
        name: 'MissingUsername',
        message: 'Missing required information: email',
      } as IAppError;
    }

    if (!this.credentials.password) {
      throw {
        type: 'ClientError',
        name: 'MissingPassword',
        message: 'Missing required information: password',
      } as IAppError;
    }
  }

  private validateDisplayName(): void {
    if (!this.extra) {
      throw {
        type: 'ClientError',
        name: 'MissingDisplayName',
        message: 'Missing required information: name',
      } as IAppError;
    }
  }
}
