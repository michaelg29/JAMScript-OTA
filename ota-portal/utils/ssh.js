const { spawn } = require("child_process");
const crypto = require("crypto");

async function execScript(path, args, onstdout, onstderr) {
    return new Promise((resolve, reject) => {
        const proc = spawn(path, args, {
            detached: true
        });

        if (onstdout) {
            proc.stdout.on("data", onstdout);
        }

        if (onstderr) {
            proc.stderr.on("data", onstderr);
        }

        proc.on("exit", (code) => {
            resolve(code);
        });
    });
}

// runs ssh-keygen and saves keys to filesystem.
async function generateAndSaveKeys(nodeid) {
    const execPath = "./../../ssh/keygen.sh";
    let key = "";
    await execScript(execPath, [nodeid], (data) => {
        key += data.toString();
    });
    return key;
}

// get public key for a node
async function getPubKey(nodeid) {
    const execPath = "./../../ssh/keyget.sh";
    let key = "";
    await execScript(execPath, [nodeid], (data) => {
        key += data.toString();
    });
    return key;
}

// delete a key
async function deleteKey(nodeid) {
    const execPath = "./../../ssh/keyrem.sh";
    let key = "";
    await execScript(execPath, [nodeid], (data) => {
        key += data.toString();
    });
    return key;
}

async function testSSH(nodeid, sshUser, ip) {
    const execPath = "./../../ssh/sshtest.sh";
    let out = "";
    let data = crypto.randomBytes(16).toString("hex");
    await execScript(execPath, ["--nodeid", nodeid, "--sshUser", sshUser, "--ip", ip, "--data", data], (data) => {
        out += data.toString();
    }, (data) => {
        console.log('err', data.toString());
    });

    return out.trim() === data;
}

module.exports = {
    generateAndSaveKeys: generateAndSaveKeys,
    getPubKey: getPubKey,
    deleteKey: deleteKey,
    testSSH: testSSH
}
