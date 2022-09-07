import CryptoJS from 'crypto-js';
import env_vars from '../../env-var.enc.js';

var bytes = CryptoJS.AES.decrypt(env_vars, process.env.SERVICE_ENCRYPTION_KEY);
var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

export default decryptedData;
