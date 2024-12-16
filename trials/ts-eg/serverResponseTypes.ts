// TBD
import * as types from '../../common/server.responses';
import { IUser, ILogin } from '../../common/user.interface';

console.log('test IAppError'); // false

const res1: types.IResponse = {
  name: 'MongoDBError',
  message: 'A DB error occurred',
  type: 'ServerError'
};

console.log(types.isAppError(res1)); // true
console.log(types.isServerError(res1)); // true
console.log(types.isClientError(res1)); // false
console.log(types.isSuccess(res1)); // false

console.log('test ISuccess'); // false

const res2: types.IResponse = {
  name: 'UserAuthenticated',
  message: 'Operation succeeded',
  authorizedUser: 'me@me.com',
  payload: { username: 'me@me.com', password: '123456' }
};

console.log(types.isSuccess(res2)); // true
console.log(types.isServerError(res2)); // true
console.log(types.isClientError(res2)); // false
console.log(types.isAppError(res2)); // false

if (types.isSuccess(res2)) {
  console.log(res2.payload);
}

if (types.isServerError(res1)) {
  console.log(res1.name);
}

console.log(typeof res2.name); // true
