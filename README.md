# loki-async-reference adapter

> A Simple async adapter for LokiJS, suitable to use with React Native

### Usage Examples

#### Basic usage within a React Native project
```javascript
import loki from "lokijs";
import { LokiAsyncReferenceAdapter } from "loki-async-reference-adapter";
import AsyncStorage from '@react-native-async-storage/async-storage';

const db = new loki('mydb', {
    adapter: new LokiAsyncReferenceAdapter({
      read: AsyncStorage.getItem,
      write: AsyncStorage.setItem,
    }),
  });
```
