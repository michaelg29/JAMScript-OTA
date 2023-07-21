
const maxPassphraseLength = 16;

/**
 * Check the passphrase is only alphanumeric characters.
 * @param {string} passphrase The passphrase to validate.
 */
const validateNetworkPassphrase = function(passphrase) {
    if (passphrase.length > maxPassphraseLength) errors.error(400, "Passphrase must be less than 16 characters.");

    if (passphrase.match(/[^a-zA-Z0-9]/gm)) errors.error(400, "Passphrase can only contain alphanumeric characters.");
}

/**
 * Check the passphrase is only alphanumeric characters.
 * @param {Buffer} passphrase The passphrase to validate.
 */
const validateNetworkPassphraseBuf = function(buf) {
    validateNetworkPassphrase(buf.toString("utf-8"));
}

module.exports = {
    maxPassphraseLength: maxPassphraseLength,
    validateNetworkPassphrase: validateNetworkPassphrase,
    validateNetworkPassphraseBuf: validateNetworkPassphraseBuf
}
