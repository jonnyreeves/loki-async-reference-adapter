export class LokiAsyncReferenceAdapter {

  /**
   * @callback readFn
   * @param {string} key
   * @returns {Promise<string>}
   */

  /**
   * @callback writeFn
   * @param {string} key
   * @param {string} data
   * @returns {Promise<string>}
   */

  /** 
   * @param {Object} options
   * @param {readFn} options.read - async function which will retrieve persisted values
   * @param {writeFn} options.write - async function which will persist values
   */
  constructor({ read, write }) {
    this.mode = "reference";
    this.readKey = read;
    this.writeKey = write;
  }

  async exportDatabase(dbname, dbref, callback) {
    this.dbref = dbref;
    const pi = this.getPartition();
    this.saveNextPartition(dbname, pi, () => callback(null));
  }

  async loadDatabase(dbname, callback) {
    const dbJson = await this.readKey(dbname);
    if (typeof dbJson !== 'string') {
      callback(null);
      return;
    }
    this.dbref = JSON.parse(dbJson);
    if (!Array.isArray(this.dbref.collections)) {
      callback(new Error('unexpected serialization format'));
      return;
    }
    if (this.dbref.collections.length > 0) {
      this.loadNextCollection(dbname, 0, () => {
        callback(this.dbref);
      });
    }
  }

  async loadNextCollection(dbname, collectionIndex, callback) {
    const key = `${dbname}.${collectionIndex}`;
    const data = await this.readKey(key);

    if (data) {
      const entries = data.split("\n");
      for (let i = 0; i < entries.length; i++) {
        const obj = JSON.parse(entries[i]);
        this.dbref.collections[collectionIndex].data.push(obj);
      }
    }
    const nextIndex = collectionIndex + 1;
    if (nextIndex < this.dbref.collections.length) {
      this.loadNextCollection(dbname, nextIndex, callback);
    } else {
      callback();
    }
  }

  async saveNextPartition(dbname, pi, callback) {
    const self = this;
    const pinext = pi.next();

    if (pinext.done) {
      callback();
      return;
    }

    // db container (partition -1) uses just dbname for filename,
    // otherwise append collection array index to filename
    const filename = dbname + ((pinext.value === -1) ? "" : ("." + pinext.value));
    const li = this.generateDestructured({ partition: pinext.value });

    const data = [];
    for (var outline of li) {
      data.push(outline);
    }

    await this.writeKey(filename, data.join("\n"));
    self.saveNextPartition(dbname, pi, callback);
  }

  /**
   * Generator for constructing lines for file streaming output of db container or collection.
   */
  *generateDestructured(options = {}) {
    if (typeof options.partition === 'undefined') {
      options.partition = -1;
    }

    // if partition is -1 we will return database container with no data
    if (options.partition === -1) {
      // instantiate lightweight clone and remove its collection data
      const dbcopy = this.dbref.copy();

      for (let idx = 0; idx < dbcopy.collections.length; idx++) {
        dbcopy.collections[idx].data = [];
      }

      yield dbcopy.serialize({ serializationMethod: "normal" });
      return;
    }

    // 'partitioned' along with 'partition' of 0 or greater is a request for single collection serialization
    if (options.partition >= 0) {
      // dbref collections have all data so work against that
      const doccount = this.dbref.collections[options.partition].data.length;
      for (let docidx = 0; docidx < doccount; docidx++) {
        yield JSON.stringify(this.dbref.collections[options.partition].data[docidx]);
      }
    }
  }

  *getPartition() {
    const clen = this.dbref.collections.length;
    // since database container (partition -1) doesn't have dirty flag at db level, always save
    yield -1;
    // yield list of dirty partitions for iterateration
    for (let idx = 0; idx < clen; idx += 1) {
      if (this.dbref.collections[idx].dirty) {
        yield idx;
      }
    }
  }
}