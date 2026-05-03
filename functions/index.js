// functions/index.js
const admin = require("firebase-admin");

// 1. Initialize Firebase Admin ONLY ONCE at the top level
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// 2. Export functions from your decomposed files
Object.assign(exports, require('./src/ai'));
Object.assign(exports, require('./src/news'));
Object.assign(exports, require('./src/srs'));
Object.assign(exports, require('./src/dictionary'));
Object.assign(exports, require('./src/user'));
Object.assign(exports, require('./src/library'));
Object.assign(exports, require('./src/admin'));
