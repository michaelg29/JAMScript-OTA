async function pingNode(nodeId) {
    await dataRequest("NOTIFY", `nodes/${nodeId}`);
}

async function revokeNode(nodeId) {
    await dataRequest("PURGE", `nodes/${nodeId}`);
}

async function deleteNode(nodeId) {
    await dataRequest("DELETE", `nodes/${nodeId}`);
}

async function uploadFile() {
    // get node IDs to upload to
    let nodeSelectElements = document.querySelectorAll("input.node-selector");
    let node_ids = [];
    for (let el of nodeSelectElements) {
        if (!!el.checked) {
            node_ids.push(el.id.substring("select-".length));
        }
    }

    // get channel ID to upload file
    let channelRes = await dataRequest("POST", "file_channel", undefined, {
        "node_ids": node_ids
    });

    return;

    // upload file
    let file = document.querySelector("#file-input").files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        console.log("Sending file " + file.name);
        dataRequest("POST", "file", undefined, e.target.result, "application/octet-stream")
            .then((data) => {
                console.log(data);
            })
            .catch((err) => {
                console.log(err);
            });
    };
    reader.readAsArrayBuffer(file);
}
