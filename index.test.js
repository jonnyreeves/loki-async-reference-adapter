import { LokiAsyncReferenceAdapter } from "./index";
import loki from "lokijs";
import { when } from 'jest-when';

const setupDb = () => {
  const readFn = jest.fn();
  const writeFn = jest.fn();
  const db = new loki('test.json', {
    adapter: new LokiAsyncReferenceAdapter({
      read: readFn,
      write: writeFn,
    }),
  });
  return { db, readFn, writeFn };
}

test('saves the database', (done) => {
  const { db, writeFn } = setupDb();

  const users = db.addCollection("users");
  users.insert({ name: 'odin', age: 50 });
  users.insert({ name: 'thor', age: 35 });

  db.saveDatabase(() => {
    expect(writeFn).toHaveBeenCalledTimes(2);
    done();
  })
});

test('loads the database', (done) => {
  const { db, readFn, writeFn } = setupDb();

  when(readFn)
    .calledWith('test.json')
    .mockReturnValue(`{"filename":"test.json","collections":[{"name":"users","data":[],"idIndex":null,"binaryIndices":{},"constraints":null,"uniqueNames":[],"transforms":{},"objType":"users","dirty":true,"cachedIndex":null,"cachedBinaryIndex":null,"cachedData":null,"adaptiveBinaryIndices":true,"transactional":false,"cloneObjects":false,"cloneMethod":"parse-stringify","asyncListeners":false,"disableMeta":false,"disableChangesApi":true,"disableDeltaChangesApi":true,"autoupdate":false,"serializableIndices":true,"disableFreeze":true,"ttl":null,"maxId":2,"DynamicViews":[],"events":{"insert":[],"update":[],"pre-insert":[],"pre-update":[],"close":[],"flushbuffer":[],"error":[],"delete":[null],"warning":[null]},"changes":[],"dirtyIds":[]}],"databaseVersion":1.5,"engineVersion":1.5,"autosave":false,"autosaveInterval":5000,"autosaveHandle":null,"throttledSaves":true,"options":{"env":"NA","serializationMethod":"normal","destructureDelimiter":"$<n"},"persistenceAdapter":null,"verbose":false,"events":{"init":[null],"loaded":[],"flushChanges":[],"close":[],"changes":[],"warning":[]},"ENV":"NA"}`);

  when(readFn)
    .calledWith('test.json.0')
    .mockReturnValue(`{"name":"odin","age":50,"meta":{"revision":0,"created":1715016549927,"version":0},"$loki":1}
    {"name":"thor","age":35,"meta":{"revision":0,"created":1715016549927,"version":0},"$loki":2}`);

  db.loadDatabase({}, () => {
    var result = db.getCollection('users').findOne({ name: 'odin' });
    expect(result).toMatchObject({
      name: 'odin',
      age: 50,
    });

    done();
  });

});