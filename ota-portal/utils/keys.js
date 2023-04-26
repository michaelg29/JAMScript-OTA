/**
 * Utility functions for key generation and validation.
 */

const regKeyLen = 20;
const minRegKeySum = 14;
const maxRegKeySum = 100;

/**
 * @returns New key.
 */
const generateKey = function() {
    var bytes = new Uint8Array(regKeyLen);

    let sum = 0;
    for (let i = 0; i < regKeyLen; ++i) {
        // compute next byte
        const curMod = sum % 256;
        let minRange = Math.max(((minRegKeySum - curMod + 256) % 256) - 3 * (regKeyLen - i - 1), 0);
        let maxRange = Math.min(((maxRegKeySum - curMod + 256) % 256) + 3 * (regKeyLen - i - 1), 255);
        if (minRange > maxRange) {
            maxRange = 255;
        }
        const val = Math.floor(Math.random() * (maxRange - minRange) + minRange);

        // store in key
        bytes[i] = val;
        sum += val;
    }

    return Buffer.from(bytes).toString("hex");
}

/**
 * Validate a key.
 * @param {Buffer} bytes Key to validate in buffer form.
 * @returns Whether the key is valid or not.
 */
const validateKeyBuf = function(bytes) {
    let sum = 0;
    for (const [idx, val] of bytes.entries()) {
        if (idx >= regKeyLen) {
            break;
        }
        sum += val;
    }

    sum = sum % 256;
    return sum >= minRegKeySum && sum <= maxRegKeySum;
}

/**
 * Validate a key.
 * @param {string} key Key to validate.
 * @returns Whether the key is valid or not.
 */
const validateKey = function(key) {
    // get byte array
    return validateKeyBuf(Buffer.from(key, "hex"));
}

module.exports = {
    regKeyLen: regKeyLen,
    generateKey: generateKey,
    validateKeyBuf: validateKeyBuf,
    validateKey: validateKey,
}
