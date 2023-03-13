async function pingNode(nodeId) {
    await dataRequest("NOTIFY", `nodes/${nodeId}`);
}

async function revokeNode(nodeId) {
    await dataRequest("PURGE", `nodes/${nodeId}`);
}

async function deleteNode(nodeId) {
    await dataRequest("DELETE", `nodes/${nodeId}`);
}

async function downloadTools(nodeId) {
    await dataRequest("GET", `nodes/${nodeId}/tools`);
}
