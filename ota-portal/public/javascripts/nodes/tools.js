async function pingNode(nodeid) {
    await dataRequest("NOTIFY", "nodes/" + nodeid);
}

async function revokeNode(nodeid) {
    await dataRequest("PURGE", "nodes/" + nodeid);
}

async function deleteNode(nodeid) {
    await dataRequest("DELETE", "nodes/" + nodeid);
}
