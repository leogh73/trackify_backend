import CryptoJS from 'crypto-js';
import env_vars from '../../env-var.enc.js';

let bytes = CryptoJS.AES.decrypt(env_vars, process.env.SERVICE_ENCRYPTION_KEY);
let decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

export default decryptedData;
