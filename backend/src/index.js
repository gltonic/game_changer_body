"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const supabase_js_1 = require("@supabase/supabase-js");
const web_push_1 = __importDefault(require("web-push"));
const server_1 = require("./server");
dotenv.config();
const port = process.env.PORT || 3001;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const clientUrl = process.env.CLIENT_URL || '*';
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@gamechangerbody.app';
// Auto-generate VAPID keys if not present
if (!vapidPublicKey || !vapidPrivateKey) {
    console.log('No VAPID keys found in .env, generating new keys...');
    const generated = web_push_1.default.generateVAPIDKeys();
    vapidPublicKey = generated.publicKey;
    vapidPrivateKey = generated.privateKey;
    console.log('========================================');
    console.log('SAVE THESE VAPID KEYS TO YOUR .env FILE:');
    console.log(`VAPID_PUBLIC_KEY=${vapidPublicKey}`);
    console.log(`VAPID_PRIVATE_KEY=${vapidPrivateKey}`);
    console.log('========================================');
}
const vapidKeys = {
    publicKey: vapidPublicKey,
    privateKey: vapidPrivateKey,
    subject: vapidSubject
};
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
const app = (0, server_1.createApp)({
    supabase,
    vapidKeys,
    clientUrl
});
app.listen(port, () => {
    console.log(`Game Changer: Body backend running on port ${port}`);
});
// Notification scheduler worker: runs every 30 seconds
const schedulerInterval = setInterval(async () => {
    try {
        const sent = await (0, server_1.processDueNotifications)({ supabase, vapidKeys });
        if (sent > 0) {
            console.log(`[Scheduler] Dispatched ${sent} due push notifications.`);
        }
    }
    catch (err) {
        console.error('[Scheduler] Error checking due notifications:', err);
    }
}, 30000);
process.on('SIGINT', () => {
    clearInterval(schedulerInterval);
    process.exit(0);
});
process.on('SIGTERM', () => {
    clearInterval(schedulerInterval);
    process.exit(0);
});
