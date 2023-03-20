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

/**
 * @returns The public SSH key to send to the node.
 */
async function getPubKey() {
    const execPath = sshScriptPath("keyget");
    let key = "";
    await execScript(execPath, [], (data) => {
        key += data.toString();
    });
    return key;
}

async function testSSH(sshUser, ip) {
    const execPath = sshScriptPath("sshtest");
    let out = "";
    let data = crypto.randomBytes(16).toString("hex");
    await execScript(execPath, ["--sshUser", sshUser, "--sshDst", ip, "--data", data], (data) => {
        out += data.toString();
    }, (data) => {
        console.log('err', data.toString());
    });

    return out.trim() === data;
}

async function pingSSH(sshUser, ip) {
    const execPath = sshScriptPath("sshping");
    let out = "";

    await execScript(execPath, ["--sshUser", sshUser, "--ip", ip], (data) => {
        out += data.toString();
    }, (data) => {
        console.log('err', data.toString());
    });

    return out;
}

module.exports = {
    getPubKey: getPubKey,
    testSSH: testSSH,
    pingSSH: pingSSH,
}
