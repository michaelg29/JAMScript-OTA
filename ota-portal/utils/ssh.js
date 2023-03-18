const { spawn } = require("child_process");
const crypto = require("crypto");

const sshScriptPath = (script) => `${process.env.JAMOTA_ROOT}/tools/ssh/${script}.sh`;

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
    const execPath = sshScriptPath("keygen");
    let out = "";
    await execScript(execPath, [nodeid], (data) => {
        out += data.toString();
    });
    return out;
}

// get public key for a node
async function getPubKey(nodeid) {
    const execPath = sshScriptPath("keyget");
    let key = "";
    await execScript(execPath, [nodeid], (data) => {
        key += data.toString();
    });
    return key;
}

// delete a key
async function deleteKey(nodeid) {
    const execPath = sshScriptPath("keyrem");
    let key = "";
    await execScript(execPath, [nodeid], (data) => {
        key += data.toString();
    });
    return key;
}

async function testSSH(nodeid, sshUser, ip) {
    const execPath = sshScriptPath("sshtest");
    let out = "";
    let data = crypto.randomBytes(16).toString("hex");
    await execScript(execPath, ["--nodeid", nodeid, "--sshuser", sshUser, "--sshdst", ip, "--data", data], (data) => {
        out += data.toString();
    }, (data) => {
        console.log('err', data.toString());
    });

    return out.trim() === data;
}

async function pingSSH(nodeid, sshUser, ip) {
    const execPath = sshScriptPath("sshping");
    let out = "";

    await execScript(execPath, ["--nodeid", nodeid, "--sshUser", sshUser, "--ip", ip], (data) => {
        out += data.toString();
    }, (data) => {
        console.log('err', data.toString());
    });

    return out;
}

module.exports = {
    generateAndSaveKeys: generateAndSaveKeys,
    getPubKey: getPubKey,
    deleteKey: deleteKey,
    testSSH: testSSH,
    pingSSH: pingSSH,
}
